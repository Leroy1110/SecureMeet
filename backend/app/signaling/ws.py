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

router = APIRouter()

room_manager: RoomManager = RoomManager()

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
    
    try:
        user_status = update_user_state(
            db=db,
            room_id=room_id,
            user_id=payload_user_id,
            new_state="active"
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
    
    if sender_role != "host" and sender_user_id not in room_state.active_ws:
        await websocket.send_json({
            "type": "error",
            "payload": {
                "message": "only active users can send messages"
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

    db_message = save_message(
        db=db,
        room_id=room_id,
        from_user_id=sender_user_id,
        to_user_id=to_user_id,
        content_plain=content,
        msg_type="chat"
    )
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
            if to_user_id == room_state.host_user_id and room_state.host_ws is not None:
                await room_state.host_ws.send_json(message)
            
            elif to_user_id in room_state.active_ws:
                await room_state.active_ws[to_user_id].send_json(message)
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "payload": {
                        "message": "user not active"
                    }
                })
                return

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
        await websocket.accept()

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