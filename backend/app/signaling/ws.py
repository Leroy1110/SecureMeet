from fastapi import APIRouter, WebSocket, status
from jose import JWTError
from app.auth.security import decode_access_token as decode_room_token

router = APIRouter()

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
        
        await websocket.accept()
        
        if role == "host":
            await websocket.send_text("host connected")
        elif state == "waiting":
            await websocket.send_text("waiting for approval")
        elif state == "active":
            await websocket.send_text("connected")
        else:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="invalid role/state")
            return
    else:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="room_code doesn't match")
        return