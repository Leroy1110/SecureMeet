from fastapi import APIRouter, status, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import User
from app.auth.deps import get_current_user
from app.rooms.schemas import RoomCreateResponse, RoomJoinRequest, RoomJoinResponse
from app.rooms.service import create_room, join_room

router = APIRouter()

@router.post("/", response_model=RoomCreateResponse, status_code=status.HTTP_201_CREATED)
def room_creation(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        new_room, room_password, host_jwt = create_room(db=db, host_user_id=current_user.id)
        return RoomCreateResponse(
            room_code=new_room.room_code,
            room_password=room_password,
            expires_at=new_room.expires_at,
            room_jwt=host_jwt
        )
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/join", response_model=RoomJoinResponse, status_code=status.HTTP_200_OK)
def room_join(payload: RoomJoinRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    try:
        room_token = join_room(
            db=db,
            user_id=current_user.id,
            room_code=payload.room_code,
            room_password=payload.room_password
        )
        return RoomJoinResponse(
            room_jwt=room_token
        )
    except ValueError as e:
        if str(e) == "Room not found":
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        if str(e) == "Invalid room password":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))