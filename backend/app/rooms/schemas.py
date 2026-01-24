from pydantic import BaseModel
from datetime import datetime

class RoomCreateResponse(BaseModel):
    room_code: str
    room_password: str
    expires_at: datetime
    room_jwt: str

class RoomJoinRequest(BaseModel):
    room_code: str
    room_password: str

class RoomJoinResponse(BaseModel):
    room_jwt: str