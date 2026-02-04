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
        
        if role == "host":
            await websocket.send_json({
                "type": "system.connected",
                "payload": {
                    "room_code": room_code,
                    "role": role,
                    "state": "active"
                }
            })

            waiting_list = room_manager.get_or_create_room(room_code=room_code).waiting_ws
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
                await websocket.receive()
        except WebSocketDisconnect:
            pass
        finally:
            room_manager.remove_connection(room_code, websocket, user_id=user_id)
    else:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="room_code doesn't match")
        return