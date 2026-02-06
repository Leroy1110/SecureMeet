from fastapi import APIRouter, WebSocket, status
from jose import JWTError
from app.auth.security import decode_access_token as decode_room_token
from app.signaling.room_manager import RoomManager
from fastapi.websockets import WebSocketDisconnect

router = APIRouter()

room_manager: RoomManager = RoomManager()

@router.websocket("/ws/rooms/{room_code}")
async def websocket_endpoint(websocket: WebSocket, room_code: str):
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
        
        user_id = int(user_id)
        
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

                if "waiting.approve" == message_type or "waiting.reject" == message_type:
                    if role == "host" and room_state.host_user_id == user_id:
                        try:
                            payload_user_id: int = int(message_payload.get("user_id"))
                        except (TypeError, ValueError):
                            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="invalid user_id in payload")
                            return

                        if "waiting.approve" == message_type:
                            user_approved = room_manager.approve_user(room_code=room_code, user_id=payload_user_id)

                            if isinstance(user_approved, WebSocket):
                                await user_approved.send_json({
                                    "type": "waiting.approved",
                                    "payload": {}
                                })

                                await user_approved.send_json({
                                    "type": "system.state_change",
                                    "payload": {
                                        "room_code": room_code,
                                        "role": "participant",
                                        "state": "active"
                                    }
                                })

                                await websocket.send_json({
                                    "type": "waiting.removed",
                                    "payload": {
                                        "user_id": payload_user_id
                                    }
                                })
                            else:
                                await websocket.send_json({
                                    "type": "error",
                                    "payload": {
                                        "message": "user not in waiting"
                                    }
                                })
                        
                        if "waiting.reject" == message_type:
                            user_rejected =room_manager.reject_user(room_code=room_code, user_id=payload_user_id)

                            if isinstance(user_rejected, WebSocket):
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
                            else:
                                await websocket.send_json({
                                    "type": "error",
                                    "payload": {
                                        "message": "user not in waiting"
                                    }
                                })
                    
                    else:
                        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="only host can approve or reject")
                        return
        except WebSocketDisconnect:
            pass
        finally:
            room_manager.remove_connection(room_code, websocket, user_id=user_id)
    else:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="room_code doesn't match")
        return