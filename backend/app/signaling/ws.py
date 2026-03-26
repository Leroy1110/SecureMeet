from fastapi import APIRouter, WebSocket, status, Depends
from jose import JWTError
from app.auth.security import decode_access_token as decode_room_token
from app.signaling.room_manager import RoomManager, RoomState
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.rooms.service import update_user_state, mark_member_left, mark_member_kicked
from datetime import datetime
from app.rooms.messages_service import save_message
from app.db.models import Room, RoomMember
from app.logging.audit import log_event

router = APIRouter()

room_manager: RoomManager = RoomManager()


def build_active_user_ids(room_state: RoomState) -> list[int]:
    users = list(room_state.active_ws.keys())
    host_user_id = room_state.host_user_id
    if host_user_id is not None and host_user_id not in users:
        users.append(host_user_id)
    return users


def _resolve_display_names(db: Session, room_id: int,
                           user_ids: list[int]) -> dict[int, str]:
    normalized_user_ids = list(dict.fromkeys(user_ids))
    if not normalized_user_ids:
        return {}

    room_members = (
        db.query(
            RoomMember.user_id,
            RoomMember.display_name) .filter(
            RoomMember.room_id == room_id,
            RoomMember.user_id.in_(normalized_user_ids)) .all())

    display_names: dict[int, str] = {}
    for user_id, display_name in room_members:
        if isinstance(display_name, str) and display_name.strip():
            display_names[user_id] = display_name.strip()

    for user_id in normalized_user_ids:
        display_names.setdefault(user_id, f"User {user_id}")

    return display_names


def _serialize_user(db: Session, room_id: int, user_id: int) -> dict:
    display_names = _resolve_display_names(db, room_id, [user_id])
    display_name = display_names.get(user_id, f"User {user_id}")

    return {
        "user_id": user_id,
        "display_name": display_name,
        "username": display_name,
    }


def _serialize_users(db: Session, room_id: int, user_ids: list[int]) -> list[dict]:
    normalized_user_ids = sorted(dict.fromkeys(user_ids))
    display_names = _resolve_display_names(db, room_id, normalized_user_ids)

    serialized_users: list[dict] = []
    for user_id in normalized_user_ids:
        display_name = display_names.get(user_id, f"User {user_id}")
        serialized_users.append(
            {
                "user_id": user_id,
                "display_name": display_name,
                "username": display_name,
            }
        )

    return serialized_users


def build_waiting_users_payload(
        db: Session,
        room_id: int,
        room_state: RoomState) -> list[dict]:
    return _serialize_users(db, room_id, list(room_state.waiting_ws.keys()))


def build_active_users_payload(
        db: Session,
        room_id: int,
        room_state: RoomState) -> list[dict]:
    return _serialize_users(db, room_id, build_active_user_ids(room_state))


def validate_room_for_ws_connect(
    db: Session, *, room_code_path: str, token_payload: dict
) -> tuple[int, int, str, str]:
    payload_room_code: str = token_payload.get("room_code")
    if payload_room_code is None:
        raise ValueError("payload missing room_code")

    payload_room_id = token_payload.get("room_id")
    if payload_room_id is None:
        raise ValueError("payload missing room_id")

    try:
        payload_room_id = int(payload_room_id)
    except (ValueError, TypeError):
        raise ValueError("invalid room_id in payload")

    payload_user_id = token_payload.get("user_id")
    if payload_user_id is None:
        raise ValueError("payload missing user_id")

    try:
        payload_user_id = int(payload_user_id)
    except (ValueError, TypeError):
        raise ValueError("invalid user_id in payload")

    if payload_room_code != room_code_path:
        raise ValueError("room_code in payload doesn't match path")

    room = db.query(Room).filter(
        Room.id == payload_room_id,
        Room.room_code == payload_room_code).first()
    if room is None:
        raise ValueError("room not found")

    if room.status != "active":
        raise ValueError("room is not active")

    if room.expires_at < datetime.utcnow():
        raise ValueError("room has expired")

    room_member = db.query(RoomMember).filter(
        RoomMember.room_id == payload_room_id,
        RoomMember.user_id == payload_user_id).first()
    if room_member is None:
        raise ValueError("room member not found")

    if room_member.state not in {"waiting", "active"}:
        raise ValueError("member state not allowed")

    if (room_member.role == "host" and room.host_id != payload_user_id) or (
            room_member.role != "host" and room.host_id == payload_user_id):
        raise ValueError("host role mismatch")

    if room_member.role not in {"host", "participant"}:
        raise ValueError("member role not allowed")

    return payload_room_id, payload_user_id, room_member.role, room_member.state


def _can_send_webrtc_signaling(
    room_state: RoomState, sender_user_id: int, sender_role: str
) -> bool:
    if sender_role == "host":
        return (
            room_state.host_user_id == sender_user_id
            and room_state.host_ws is not None
        )

    return sender_user_id in room_state.active_ws


def _resolve_active_recipient_ws(
    room_state: RoomState, recipient_user_id: int
) -> WebSocket | None:
    if recipient_user_id == room_state.host_user_id and room_state.host_ws is not None:
        return room_state.host_ws

    if recipient_user_id in room_state.active_ws:
        return room_state.active_ws[recipient_user_id]

    return None


def _parse_target_user_id(payload: dict) -> int | None:
    try:
        target_user_id = int(payload.get("to_user_id"))
    except (TypeError, ValueError):
        return None

    if target_user_id <= 0:
        return None

    return target_user_id


async def _relay_webrtc_payload(
    websocket: WebSocket,
    room_state: RoomState,
    sender_user_id: int,
    sender_role: str,
    message_type: str,
    payload: dict,
    relay_payload: dict,
):
    if not _can_send_webrtc_signaling(
        room_state=room_state,
        sender_user_id=sender_user_id,
        sender_role=sender_role,
    ):
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "only host or active users can send webrtc signaling"
            }
        })
        return

    target_user_id = _parse_target_user_id(payload)
    if target_user_id is None:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid to_user_id in payload"
            }
        })
        return

    recipient_ws = _resolve_active_recipient_ws(
        room_state=room_state,
        recipient_user_id=target_user_id,
    )
    if recipient_ws is None:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "target user is not active"
            }
        })
        return

    outgoing_message = {
        "type": message_type,
        "payload": {
            "from_user_id": sender_user_id,
            "to_user_id": target_user_id,
            **relay_payload
        }
    }

    try:
        await recipient_ws.send_json(outgoing_message)
    except Exception:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": f"failed to relay {message_type}"
            }
        })


async def handler_webrtc_offer(
    websocket: WebSocket,
    room_state: RoomState,
    room_code: str,
    room_id: int,
    sender_user_id: int,
    sender_role: str,
    payload: dict,
    db: Session
):
    del room_code, room_id, db

    sdp = payload.get("sdp")
    if not isinstance(sdp, str) or sdp.strip() == "":
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid sdp in payload"
            }
        })
        return

    await _relay_webrtc_payload(
        websocket=websocket,
        room_state=room_state,
        sender_user_id=sender_user_id,
        sender_role=sender_role,
        message_type="webrtc.offer",
        payload=payload,
        relay_payload={"sdp": sdp},
    )


async def handler_webrtc_answer(
    websocket: WebSocket,
    room_state: RoomState,
    room_code: str,
    room_id: int,
    sender_user_id: int,
    sender_role: str,
    payload: dict,
    db: Session
):
    del room_code, room_id, db

    sdp = payload.get("sdp")
    if not isinstance(sdp, str) or sdp.strip() == "":
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid sdp in payload"
            }
        })
        return

    await _relay_webrtc_payload(
        websocket=websocket,
        room_state=room_state,
        sender_user_id=sender_user_id,
        sender_role=sender_role,
        message_type="webrtc.answer",
        payload=payload,
        relay_payload={"sdp": sdp},
    )


async def handler_webrtc_ice_candidate(
    websocket: WebSocket,
    room_state: RoomState,
    room_code: str,
    room_id: int,
    sender_user_id: int,
    sender_role: str,
    payload: dict,
    db: Session
):
    del room_code, room_id, db

    candidate = payload.get("candidate")
    if not isinstance(candidate, dict):
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid candidate in payload"
            }
        })
        return

    candidate_value = candidate.get("candidate")
    if not isinstance(candidate_value, str) or candidate_value.strip() == "":
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid candidate.candidate in payload"
            }
        })
        return

    sdp_mid = candidate.get("sdpMid")
    if sdp_mid is not None and not isinstance(sdp_mid, str):
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid candidate.sdpMid in payload"
            }
        })
        return

    sdp_m_line_index = candidate.get("sdpMLineIndex")
    if sdp_m_line_index is not None:
        try:
            sdp_m_line_index = int(sdp_m_line_index)
        except (TypeError, ValueError):
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "invalid candidate.sdpMLineIndex in payload"
                }
            })
            return

        if sdp_m_line_index < 0:
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "invalid candidate.sdpMLineIndex in payload"
                }
            })
            return

    username_fragment = candidate.get("usernameFragment")
    if username_fragment is not None and not isinstance(username_fragment, str):
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid candidate.usernameFragment in payload"
            }
        })
        return

    normalized_candidate = {
        "candidate": candidate_value,
        "sdpMid": sdp_mid,
        "sdpMLineIndex": sdp_m_line_index,
        "usernameFragment": username_fragment,
    }

    await _relay_webrtc_payload(
        websocket=websocket,
        room_state=room_state,
        sender_user_id=sender_user_id,
        sender_role=sender_role,
        message_type="webrtc.ice_candidate",
        payload=payload,
        relay_payload={"candidate": normalized_candidate},
    )


async def handler_approve(
    websocket: WebSocket,
    room_state: RoomState,
    room_code: str,
    room_id: int,
    sender_user_id: int,
    sender_role: str,
    payload: dict,
    db: Session
):
    if sender_role != "host" or room_state.host_user_id != sender_user_id:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="only host can approve or reject",
        )
        return

    try:
        payload_user_id: int = int(payload.get("user_id"))
    except (TypeError, ValueError):
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid user_id in payload"
            }
        })
        return

    if payload_user_id not in room_state.waiting_ws:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "user not in waiting"
            }
        })
        return

    room = db.query(Room).filter(Room.id == room_id).first()
    if room is None:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "room not found"
            }
        })
        return

    count_active = db.query(RoomMember).filter(
        RoomMember.room_id == room_id,
        RoomMember.state == "active").count()
    if room.status != "active":
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "room is not active"
            }
        })
        return
    elif room.expires_at < datetime.utcnow():
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "room has expired"
            }
        })
        return
    elif count_active >= room.max_participants:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "room is full"
            }
        })
        return

    try:
        user_status = update_user_state(
            db=db,
            room_id=room_id,
            user_id=payload_user_id,
            new_state="active"
        )

    except ValueError as e:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": str(e)
            }
        })
        return

    except Exception:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "failed to update user state"
            }
        })
        return

    if user_status:
        user_approved = room_manager.approve_user(
            room_code=room_code, user_id=payload_user_id)

        if user_approved is None:
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "failed to approve user"
                }
            })
            return

        log_event(
            db=db,
            event_type="APPROVE",
            room_id=room_id,
            user_id=sender_user_id,
            data={
                "room_code": room_code,
                "target_user_id": payload_user_id
            }
        )

        await user_approved.send_json({
            "type": "waiting.approved",
            "payload": {}
        })
        await user_approved.send_json({
            "type": "active.list",
            "payload": {
                "room_code": room_code,
                "users": build_active_users_payload(db, room_id, room_state)
            }
        })

        await websocket.send_json({
            "type": "waiting.removed",
            "payload": {
                "user_id": payload_user_id
            }
        })

        message_active_add = {
            "type": "active.add",
            "payload": {
                "user": _serialize_user(db, room_id, payload_user_id)
            }
        }

        for user_id, ws_active in room_state.active_ws.items():
            if user_id != payload_user_id:
                try:
                    await ws_active.send_json(message_active_add)
                except Exception:
                    pass

        if room_state.host_ws is not None:
            try:
                await room_state.host_ws.send_json(message_active_add)
            except Exception:
                pass


async def handler_reject(
    websocket: WebSocket,
    room_state: RoomState,
    room_code: str,
    room_id: int,
    sender_user_id: int,
    sender_role: str,
    payload: dict,
    db: Session
):
    if sender_role != "host" or room_state.host_user_id != sender_user_id:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="only host can approve or reject",
        )
        return

    try:
        payload_user_id: int = int(payload.get("user_id"))
    except (TypeError, ValueError):
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid user_id in payload"
            }
        })
        return

    if payload_user_id not in room_state.waiting_ws:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "user not in waiting"
            }
        })
        return

    try:
        user_status = update_user_state(
            db=db,
            room_id=room_id,
            user_id=payload_user_id,
            new_state="rejected",
            left_at=datetime.utcnow()
        )
    except (RuntimeError, ValueError):
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "failed to update user state"
            }
        })
        return

    if user_status:
        user_rejected = room_manager.reject_user(
            room_code=room_code, user_id=payload_user_id)

        if user_rejected is None:
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "failed to reject user"
                }
            })
            return

        log_event(
            db=db,
            event_type="REJECT",
            room_id=room_id,
            user_id=sender_user_id,
            data={
                "room_code": room_code,
                "target_user_id": payload_user_id
            }
        )

        await user_rejected.send_json({
            "type": "waiting.rejected",
            "payload": {}
        })

        await user_rejected.close(
            code=status.WS_1000_NORMAL_CLOSURE,
            reason="rejected by host",
        )

        await websocket.send_json({
            "type": "waiting.removed",
            "payload": {
                "user_id": payload_user_id
            }
        })


async def handler_chat_send(
    websocket: WebSocket,
    room_state: RoomState,
    room_code: str,
    room_id: int,
    sender_user_id: int,
    sender_role: str,
    payload: dict,
    db: Session
):
    content = payload.get("content")
    if not isinstance(content, str) or content.strip() == "":
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "content must be string and not empty"
            }
        })
        return

    if len(content) > 1000:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "content too long"
            }
        })
        return

    to_user_id = payload.get("to_user_id")
    recipient_ws: WebSocket | None = None
    if to_user_id is not None:
        try:
            to_user_id = int(to_user_id)
        except (TypeError, ValueError):
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "to_user_id must be int or null"
                }
            })
            return

        if to_user_id == room_state.host_user_id and room_state.host_ws is not None:
            recipient_ws = room_state.host_ws
        elif to_user_id in room_state.active_ws:
            recipient_ws = room_state.active_ws[to_user_id]
        else:
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "user not active"
                }
            })
            return

    if sender_role != "host" and sender_user_id not in room_state.active_ws:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "only active users can send messages"
            }
        })
        return

    try:
        db_message = save_message(
            db=db,
            room_id=room_id,
            from_user_id=sender_user_id,
            to_user_id=to_user_id,
            content_plain=content,
            msg_type="chat"
        )
    except Exception:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "failed to persist chat message"
            }
        })
        return

    if db_message.id is None or db_message.created_at is None:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid persisted message metadata"
            }
        })
        return

    display_name_map = _resolve_display_names(
        db, room_id, [
            user_id for user_id in [
                sender_user_id, to_user_id] if isinstance(
                user_id, int)], )

    message = {
        "type": "chat.message",
        "payload": {
            "room_code": room_code,
            "from_user_id": sender_user_id,
            "from_display_name": display_name_map.get(
                sender_user_id,
                f"User {sender_user_id}"),
            "to_user_id": to_user_id,
            "to_display_name": display_name_map.get(
                to_user_id,
                f"User {to_user_id}") if to_user_id else None,
            "content": content,
            "created_at": datetime.utcnow().isoformat()}}

    if to_user_id is None:
        for ws_active in room_state.active_ws.values():
            try:
                await ws_active.send_json(message)
            except Exception:
                pass
        if room_state.host_ws is not None:
            try:
                await room_state.host_ws.send_json(message)
            except Exception:
                pass
    else:
        try:
            if recipient_ws is not None:
                await recipient_ws.send_json(message)

            if to_user_id != sender_user_id:
                await websocket.send_json(message)

        except Exception:
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "failed to send message to user"
                }
            })


async def handler_kick(
    websocket: WebSocket,
    room_state: RoomState,
    room_code: str,
    room_id: int,
    sender_user_id: int,
    sender_role: str,
    payload: dict,
    db: Session
):
    if sender_role != "host" or room_state.host_user_id != sender_user_id:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="only host can kick",
        )
        return

    try:
        payload_user_id: int = int(payload.get("user_id"))
    except (TypeError, ValueError):
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "invalid user_id in payload"
            }
        })
        return

    if payload_user_id == sender_user_id:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "host cannot be kicked"
            }
        })
        return

    mark_member_kicked(db=db, room_id=room_id, user_id=payload_user_id)

    res = room_manager.remove_user_and_get_ws(
        room_code=room_code, user_id=payload_user_id)
    if res is None:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "user not connected"
            }
        })
        return
    result_state_ws, result_ws = res

    try:
        await result_ws.send_json({
            "type": "system.kicked",
            "payload": {}
        })
        await result_ws.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="kicked by host",
        )
    except Exception:
        pass

    log_event(
        db=db,
        event_type="KICK",
        room_id=room_id,
        user_id=sender_user_id,
        data={
            "room_code": room_code,
            "target_user_id": payload_user_id
        }
    )

    if result_state_ws == "waiting":
        if room_state.host_ws is not None:
            try:
                await room_state.host_ws.send_json({
                    "type": "waiting.removed",
                    "payload": {
                        "user_id": payload_user_id
                    }
                })
            except Exception:
                pass
        return

    elif result_state_ws == "active":
        message_active_remove = {
            "type": "active.remove",
            "payload": {
                "user_id": payload_user_id
            }
        }
        for user_id, ws_active in room_state.active_ws.items():
            if user_id != payload_user_id:
                try:
                    await ws_active.send_json(message_active_remove)
                except Exception:
                    pass

        if room_state.host_ws is not None:
            try:
                await room_state.host_ws.send_json(message_active_remove)
            except Exception:
                pass
        return

MESSAGE_HANDLERS = {
    "waiting.approve": handler_approve,
    "waiting.reject": handler_reject,
    "chat.send": handler_chat_send,
    "member.kick": handler_kick,
    "webrtc.offer": handler_webrtc_offer,
    "webrtc.answer": handler_webrtc_answer,
    "webrtc.ice_candidate": handler_webrtc_ice_candidate,
}


@router.websocket("/ws/rooms/{room_code}")
async def websocket_endpoint(
        websocket: WebSocket,
        room_code: str,
        db: Session = Depends(get_db)):
    encoded_token = websocket.query_params.get("token")
    if encoded_token is None:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Missing token",
        )
        log_event(
            db=db,
            event_type="WS_CONNECT_FAIL",
            room_id=None,
            user_id=None,
            data={
                "reason": "missing token",
                "room_code": room_code
            }
        )
        return

    encoded_token = encoded_token.strip()
    if encoded_token == "":
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="Missing token",
        )
        log_event(
            db=db,
            event_type="WS_CONNECT_FAIL",
            room_id=None,
            user_id=None,
            data={
                "reason": "missing token",
                "room_code": room_code
            }
        )
        return

    try:
        payload = decode_room_token(encoded_token)
    except JWTError:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="unable to decode token",
        )
        log_event(
            db=db,
            event_type="WS_CONNECT_FAIL",
            room_id=None,
            user_id=None,
            data={
                "reason": "unable to decode token",
                "room_code": room_code
            }
        )
        return

    payload_room_code: str = payload.get("room_code")
    if payload_room_code is None:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="unable to get room_code from payload",
        )
        log_event(
            db=db,
            event_type="WS_CONNECT_FAIL",
            room_id=None,
            user_id=None,
            data={
                "reason": "unable to get room_code from payload",
                "room_code": room_code
            }
        )
        return

    room_id = payload.get("room_id")
    if room_id is None:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="payload doesn't have room id",
        )
        log_event(
            db=db,
            event_type="WS_CONNECT_FAIL",
            room_id=None,
            user_id=None,
            data={
                "reason": "payload doesn't have room id",
                "room_code": room_code
            }
        )
        return

    try:
        room_id = int(room_id)
    except (ValueError, TypeError):
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="invalid room id in payload",
        )
        log_event(
            db=db,
            event_type="WS_CONNECT_FAIL",
            room_id=None,
            user_id=None,
            data={
                "reason": "invalid room id in payload",
                "room_code": room_code
            }
        )
        return

    if room_code == payload_room_code:
        role = payload.get("role")
        if role is None:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="payload doesn't have role",
            )
            log_event(
                db=db,
                event_type="WS_CONNECT_FAIL",
                room_id=room_id,
                user_id=None,
                data={
                    "reason": "payload doesn't have role",
                    "room_code": room_code
                }
            )
            return

        state = payload.get("state")
        if state is None:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="payload doesn't have state",
            )
            log_event(
                db=db,
                event_type="WS_CONNECT_FAIL",
                room_id=room_id,
                user_id=None,
                data={
                    "reason": "payload doesn't have state",
                    "room_code": room_code
                }
            )
            return

        user_id = payload.get("user_id")
        if user_id is None:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="payload doesn't have user id",
            )
            log_event(
                db=db,
                event_type="WS_CONNECT_FAIL",
                room_id=room_id,
                user_id=None,
                data={
                    "reason": "payload doesn't have user id",
                    "room_code": room_code
                }
            )
            return

        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="invalid user id in payload",
            )
            log_event(
                db=db,
                event_type="WS_CONNECT_FAIL",
                room_id=room_id,
                user_id=None,
                data={
                    "reason": "invalid user id in payload",
                    "room_code": room_code
                }
            )
            return

        allowed_roles = {"host", "participant"}
        allowed_states = {"waiting", "active"}

        if role not in allowed_roles:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Invalid role",
            )
            log_event(
                db=db,
                event_type="WS_CONNECT_FAIL",
                room_id=room_id,
                user_id=user_id,
                data={
                    "reason": "invalid role in payload",
                    "room_code": room_code
                }
            )
            return

        if state not in allowed_states:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="Invalid state",
            )
            log_event(
                db=db,
                event_type="WS_CONNECT_FAIL",
                room_id=room_id,
                user_id=user_id,
                data={
                    "reason": "invalid state in payload",
                    "room_code": room_code
                }
            )
            return

        try:
            room_id_db, user_id_db, role_db, state_db = validate_room_for_ws_connect(
                db=db, room_code_path=room_code, token_payload=payload)
            room_id = room_id_db
            user_id = user_id_db
            role = role_db
            state = state_db

        except ValueError as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))
            log_event(
                db=db,
                event_type="WS_CONNECT_FAIL",
                room_id=room_id,
                user_id=user_id,
                data={
                    "reason": str(e),
                    "room_code": room_code
                }
            )
            return

        await websocket.accept()
        log_event(
            db=db,
            event_type="WS_CONNECT_SUCCESS",
            room_id=room_id,
            user_id=user_id,
            data={
                "room_code": room_code,
                "role": role,
                "state": state
            }
        )

        old_ws = room_manager.replace_connection(
            room_code=room_code, user_id=user_id, new_ws=websocket, role=role)
        if old_ws is not None:
            try:
                await old_ws.send_json({
                    "type": "system.disconnected",
                    "payload": {
                        "reason": "new connection replaced the old one"
                    }
                })
                await old_ws.close(
                    code=status.WS_1000_NORMAL_CLOSURE,
                    reason="new connection replaced the old one",
                )
            except Exception:
                pass

        room_manager.add_connection(
            room_code,
            websocket,
            role=role,
            state=state,
            user_id=user_id)
        room_state = room_manager.get_or_create_room(room_code=room_code)

        if role == "host":
            host_user_id = room_state.host_user_id
            if host_user_id is not None:
                message_host_add = {
                    "type": "active.add",
                    "payload": {
                        "user": _serialize_user(db, room_id, host_user_id)
                    }
                }
                for ws_active in room_state.active_ws.values():
                    try:
                        await ws_active.send_json(message_host_add)
                    except Exception:
                        pass

            await websocket.send_json({
                "type": "system.connected",
                "payload": {
                    "room_code": room_code,
                    "role": role,
                    "state": "active",
                    "user": _serialize_user(db, room_id, user_id),
                }
            })

            await websocket.send_json({
                "type": "waiting.list",
                "payload": {
                    "room_code": room_code,
                    "users": build_waiting_users_payload(db, room_id, room_state)
                }
            })

            await websocket.send_json({
                "type": "active.list",
                "payload": {
                    "room_code": room_code,
                    "users": build_active_users_payload(db, room_id, room_state)
                }
            })
        elif state == "waiting":
            await websocket.send_json({
                "type": "system.connected",
                "payload": {
                    "room_code": room_code,
                    "role": role,
                    "state": "waiting",
                    "user": _serialize_user(db, room_id, user_id),
                }
            })

            log_event(
                db=db,
                event_type="JOIN_REQUEST",
                room_id=room_id,
                user_id=user_id,
                data={
                    "room_code": room_code
                }
            )

            if room_state.host_ws is not None and room_state.host_user_id is not None:
                try:
                    await room_state.host_ws.send_json({
                        "type": "waiting.add",
                        "payload": {
                            "user": _serialize_user(db, room_id, user_id)
                        }
                    })
                except WebSocketDisconnect:
                    pass
        elif state == "active":
            await websocket.send_json({
                "type": "system.connected",
                "payload": {
                    "room_code": room_code,
                    "role": role,
                    "state": "active",
                    "user": _serialize_user(db, room_id, user_id),
                }
            })
            await websocket.send_json({
                "type": "active.list",
                "payload": {
                    "room_code": room_code,
                    "users": build_active_users_payload(db, room_id, room_state)
                }
            })
        else:
            await websocket.close(
                code=status.WS_1008_POLICY_VIOLATION,
                reason="invalid role/state",
            )
            log_event(
                db=db,
                event_type="WS_CONNECT_FAIL",
                room_id=room_id,
                user_id=user_id,
                data={
                    "reason": "invalid role/state",
                    "room_code": room_code
                }
            )
            return

        window_start = datetime.utcnow()
        msg_count = 0

        try:
            while True:
                data: dict = await websocket.receive_json()
                if not isinstance(data, dict):
                    await websocket.close(
                        code=status.WS_1008_POLICY_VIOLATION,
                        reason="message must be a JSON object",
                    )
                    return

                now = datetime.utcnow()
                if (now - window_start).total_seconds() > 10:
                    window_start = now
                    msg_count = 0

                msg_count += 1

                if msg_count > 25:
                    await websocket.close(
                        code=status.WS_1008_POLICY_VIOLATION,
                        reason="rate limit exceeded",
                    )
                    try:
                        log_event(
                            db=db,
                            event_type="WS_RATE_LIMIT",
                            room_id=room_id,
                            user_id=user_id,
                            data={
                                "room_code": room_code,
                                "message_count": msg_count
                            }
                        )
                    except Exception:
                        pass
                    return

                message_type: str | None = data.get("type")
                message_payload = data.get("payload")

                if not isinstance(message_type, str):
                    await websocket.close(
                        code=status.WS_1008_POLICY_VIOLATION,
                        reason="type must be string",
                    )
                    return

                if not isinstance(message_payload, dict):
                    await websocket.close(
                        code=status.WS_1008_POLICY_VIOLATION,
                        reason="payload must be dict",
                    )
                    return

                handler = MESSAGE_HANDLERS.get(message_type)

                if handler:
                    await handler(
                        websocket=websocket,
                        room_state=room_state,
                        room_code=room_code,
                        room_id=room_id,
                        sender_user_id=user_id,
                        sender_role=role,
                        payload=message_payload,
                        db=db

                    )
                else:
                    await websocket.send_json({
                        "type": "error",
                        "payload": {
                            "message": f"unknown message type: {message_type}"
                        }
                    })
        except WebSocketDisconnect:
            pass
        finally:
            was_waiting = (user_id in room_state.waiting_ws)
            was_active = (user_id in room_state.active_ws)

            try:
                mark_member_left(db=db, room_id=room_id, user_id=user_id)
            except Exception:
                pass

            try:
                log_event(
                    db=db,
                    event_type="LEAVE",
                    room_id=room_id,
                    user_id=user_id,
                    data={
                        "room_code": room_code,
                        "was_waiting": was_waiting,
                        "was_active": was_active
                    }
                )
            except Exception:
                pass

            if was_waiting:
                if room_state.host_ws is not None:
                    try:
                        await room_state.host_ws.send_json({
                            "type": "waiting.removed",
                            "payload": {
                                "user_id": user_id
                            }
                        })
                    except Exception:
                        pass
            elif was_active:
                message_active_remove = {
                    "type": "active.remove",
                    "payload": {
                        "user_id": user_id
                    }
                }
                for ws_id, ws_active in room_state.active_ws.items():
                    if ws_id != user_id:
                        try:
                            await ws_active.send_json(message_active_remove)
                        except Exception:
                            pass
                if room_state.host_ws is not None:
                    try:
                        await room_state.host_ws.send_json(message_active_remove)
                    except Exception:
                        pass
            elif (
                role == "host"
                and room_state.host_ws is websocket
                and room_state.host_user_id is not None
            ):
                message_active_remove_host = {
                    "type": "active.remove",
                    "payload": {
                        "user_id": room_state.host_user_id
                    }
                }
                for ws_active in room_state.active_ws.values():
                    try:
                        await ws_active.send_json(message_active_remove_host)
                    except Exception:
                        pass

            room_manager.remove_connection(room_code, websocket, user_id=user_id)
    else:
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION,
            reason="room_code doesn't match",
        )
        log_event(
            db=db,
            event_type="WS_CONNECT_FAIL",
            room_id=None,
            user_id=None,
            data={
                "reason": "room_code doesn't match",
                "room_code": room_code
            }
        )
        return
