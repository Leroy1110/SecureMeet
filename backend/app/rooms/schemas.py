from pydantic import BaseModel
from datetime import datetime

class RoomCreateResponse(BaseModel):
    room_code: str
    room_password: str
    expires_at: datetime