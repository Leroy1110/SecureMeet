from fastapi import APIRouter, status, Depends
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.auth.deps import get_current_user
from app.rooms.schemas import RoomCreateResponse
from app.rooms.service import create_room

router = APIRouter()

@router.post("/", response_model=RoomCreateResponse, status_code=status.HTTP_201_CREATED)
def room_creation(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_room, room_password = create_room(db=db, host_user_id=current_user.id)
    return RoomCreateResponse(
        room_code=new_room.room_code,
        room_password=room_password,
        expires_at=new_room.expires_at
    )