from fastapi import APIRouter, WebSocket, status, Depends
from jose import JWTError
from app.auth.security import decode_access_token as decode_room_token
from app.signaling.room_manager import RoomManager, RoomState
from fastapi.websockets import WebSocketDisconnect
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.rooms.service import update_user_state
from datetime import datetime
from app.rooms.messages_service import save_message
from app.db.models import Room, RoomMember

router = APIRouter()

room_manager: RoomManager = RoomManager()

def validate_room_for_ws_connect(db: Session, *, room_code_path: str, token_payload: dict) -> tuple[int, int, str, str]:
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
    
    room = db.query(Room).filter(Room.id == payload_room_id, Room.room_code == payload_room_code).first()
    if room is None:
        raise ValueError("room not found")
    
    if room.status != "active":
        raise ValueError("room is not active")
    
    if room.expires_at < datetime.utcnow():
        raise ValueError("room has expired")
    
    room_member = db.query(RoomMember).filter(RoomMember.room_id == payload_room_id, RoomMember.user_id == payload_user_id).first()
    if room_member is None:
        raise ValueError("room member not found")
    
    if room_member.state not in {"waiting", "active"}:
        raise ValueError("member state not allowed")
    
    if (room_member.role == "host" and room.host_id != payload_user_id) or (room_member.role != "host" and room.host_id == payload_user_id):
        raise ValueError("host role mismatch")
    
    if room_member.role not in {"host", "participant"}:
        raise ValueError("member role not allowed")
    
    return payload_room_id, payload_user_id, room_member.role, room_member.state

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
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="only host can approve or reject")
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
    
    count_active = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.state == "active").count()
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
    
    if user_status == True:
        user_approved = room_manager.approve_user(room_code=room_code, user_id=payload_user_id)

        if user_approved is None:
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "failed to approve user"
                }
            })
            return
        
        await user_approved.send_json({
            "type": "waiting.approved",
            "payload": {}
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
                "user_id": payload_user_id
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
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="only host can approve or reject")
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
    
    if user_status == True:
        user_rejected = room_manager.reject_user(room_code=room_code, user_id=payload_user_id)

        if user_rejected is None:
            await websocket.send_json({
                "type": "error",
                "payload": {
                    "message": "failed to reject user"
                }
            })
            return
        
        await user_rejected.send_json({
            "type": "waiting.rejected",
            "payload": {}
        })

        await user_rejected.close(code=status.WS_1000_NORMAL_CLOSURE, reason="rejected by host")

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

    message = {
        "type": "chat.message",
        "payload": {
            "room_code": room_code,
            "from_user_id": sender_user_id,
            "to_user_id": to_user_id,
            "content": content,
            "created_at": datetime.utcnow().isoformat()
        }
    }

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


MESSAGE_HANDLERS = {
    "waiting.approve": handler_approve,
    "waiting.reject": handler_reject,
    "chat.send": handler_chat_send
}

@router.websocket("/ws/rooms/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str, db: Session = Depends(get_db)):
    encoded_token = websocket.query_params.get("token")
    if encoded_token is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return
    
    encoded_token = encoded_token.strip()
    if encoded_token == "":
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
        return

    try:
        payload = decode_room_token(encoded_token)
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="unable to decode token")
        return
    
    payload_room_code: str = payload.get("room_code")
    if payload_room_code is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="unable to get room_code from payload")
        return
    
    room_id = payload.get("room_id")
    if room_id is None:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="payload doesn't have room id")
        return
    
    try:
        room_id = int(room_id)
    except (ValueError, TypeError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="invalid room id in payload")
        return

    if room_code == payload_room_code:
        role = payload.get("role")
        if role is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="payload doesn't have role")
            return
        
        state = payload.get("state")
        if state is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="payload doesn't have state")
            return
        
        user_id = payload.get("user_id")
        if user_id is None:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="payload doesn't have user id")
            return
        
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="invalid user id in payload")
            return
        
        allowed_roles = {"host", "participant"}
        allowed_states = {"waiting", "active"}
        
        if role not in allowed_roles:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid role")
            return
        
        if state not in allowed_states:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Invalid state")
            return
        
        try:
            room_id_db, user_id_db, role_db, state_db = validate_room_for_ws_connect(db=db, room_code_path=room_code, token_payload=payload)
            room_id = room_id_db
            user_id = user_id_db
            role = role_db
            state = state_db

        except ValueError as e:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason=str(e))
            return

        await websocket.accept()

        old_ws = room_manager.replace_connection(room_code=room_code, user_id=user_id, new_ws=websocket, role=role)
        if old_ws is not None:
            try:
                await old_ws.send_json({
                    "type": "system.disconnected",
                    "payload": {
                        "reason": "new connection replaced the old one"
                    }
                })
                await old_ws.close(code=status.WS_1000_NORMAL_CLOSURE, reason="new connection replaced the old one")
            except Exception:
                pass

        room_manager.add_connection(room_code, websocket, role=role, state=state, user_id=user_id)
        room_state = room_manager.get_or_create_room(room_code=room_code)
        
        if role == "host":
            await websocket.send_json({
                "type": "system.connected",
                "payload": {
                    "room_code": room_code,
                    "role": role,
                    "state": "active"
                }
            })

            waiting_list = room_state.waiting_ws
            await websocket.send_json({
                "type": "waiting.list",
                "payload": {
                    "room_code": room_code,
                    "users": list(waiting_list.keys())
                }
            })

            active_list = room_state.active_ws
            await websocket.send_json({
                "type": "active.list",
                "payload": {
                    "room_code": room_code,
                    "users": list(active_list.keys())
                }
            })
        elif state == "waiting":
            await websocket.send_json({
                "type": "system.connected",
                "payload": {
                    "room_code": room_code,
                    "role": role,
                    "state": "waiting"
                }
            })

            if room_state.host_ws is not None and room_state.host_user_id is not None:
                try:
                    await room_state.host_ws.send_json({
                        "type": "waiting.add",
                        "payload": {
                            "user_id": user_id
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
                    "state": "active"
                }
            })
        else:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="invalid role/state")
            return

        try:
            while True:
                data: dict = await websocket.receive_json()

                message_type: str | None = data.get("type")
                message_payload = data.get("payload")

                if not isinstance(message_type, str):
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="type must be string")
                    return

                if not isinstance(message_payload, dict):
                    await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="payload must be dict")
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
            room_manager.remove_connection(room_code, websocket, user_id=user_id)
    else:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="room_code doesn't match")
        return