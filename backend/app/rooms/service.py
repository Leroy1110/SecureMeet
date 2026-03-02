from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
from app.db.models import Room, RoomMember
from app.auth.security import hash_password, verify_password, create_room_token
from app.crypto.symmetric import generate_room_key
from app.crypto.rsa import encrypt_room_key
import secrets

def create_room(db: Session, host_user_id: int) -> tuple[Room, str, str]:
    room_code = secrets.token_urlsafe(8)
    while db.query(Room).filter_by(room_code=room_code).first():
        room_code = secrets.token_urlsafe(8)
    
    room_password = secrets.token_urlsafe(12)
    password_hash = hash_password(room_password)

    room_key = generate_room_key()
    encrypted_room_key = encrypt_room_key(room_key)

    expires_at = datetime.utcnow() + timedelta(hours=2)

    new_room = Room(
        room_code=room_code,
        host_id=host_user_id,
        password_hash=password_hash,
        status="active",
        expires_at=expires_at,
        encryption_key_encrypted=encrypted_room_key
    )

    host_member = RoomMember(
        room_id=new_room.id,
        user_id=host_user_id,
        role="host",
        state="active",
        joined_at=datetime.utcnow()
    )

    try:
        db.add(new_room)
        db.flush()

        host_member.room_id = new_room.id
        db.add(host_member)

        db.commit()
        db.refresh(new_room)
        db.refresh(host_member)

        host_room_jwt = create_room_token({
            "room_id": host_member.room_id,
            "room_code": new_room.room_code,
            "user_id": host_member.user_id,
            "role": "host",
            "state": "active"
        })

        return (new_room, room_password, host_room_jwt)
    except SQLAlchemyError as e:
        db.rollback()
        raise RuntimeError("Failed to create room") from e

def join_room(db: Session, user_id: int, room_code: str, room_password: str) -> str:
    room = db.query(Room).filter_by(room_code=room_code).first()
    if not room:
        raise ValueError("Room not found")

    if room.status != "active":
        raise ValueError("Room is not active")

    if room.expires_at < datetime.utcnow():
        raise ValueError("Room has expired")
    
    if not verify_password(room_password, room.password_hash):
        raise ValueError("Invalid room password")
    
    if db.query(RoomMember).filter(
        RoomMember.room_id == room.id,
        RoomMember.user_id == user_id,
        RoomMember.state.in_(["active", "waiting"])
    ).first():
        raise ValueError("Already joined")
    
    count_members = db.query(RoomMember).filter_by(room_id=room.id, state="active").count()
    if count_members >= room.max_participants:
        raise ValueError("Room is full")

    room_member = RoomMember(
        room_id=room.id,
        user_id=user_id,
        role="participant",
        state="waiting",
        joined_at=datetime.utcnow()
    )

    try:
        db.add(room_member)
        db.commit()
        db.refresh(room_member)

        room_token_data = create_room_token({
            "room_id": room.id, 
            "room_code": room_code, 
            "user_id": user_id, 
            "role": room_member.role,
            "state": room_member.state
        })

        return room_token_data
    except SQLAlchemyError as e:
        db.rollback()
        raise RuntimeError("Failed to join room") from e

def update_user_state(db: Session, room_id: int, user_id: int, new_state: str, left_at: datetime | None = None) -> bool:
    room_member = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == user_id).first()

    if not room_member:
        raise ValueError("RoomMember not found")
    
    if room_member.state != "waiting":
        raise ValueError("User is not in waiting state")
    
    if new_state not in ["active", "rejected"]:
        raise ValueError("Invalid state")

    room_member.state = new_state
    if left_at:
        room_member.left_at = left_at
    
    try:
        db.add(room_member)
        db.commit()
        db.refresh(room_member)
        
        return True
    except SQLAlchemyError:
        db.rollback()
        raise RuntimeError("Failed to change user state")

def mark_member_left(db: Session, room_id: int, user_id: int) -> None:
    room_member = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == user_id).first()

    if room_member is None:
        return
    
    if room_member.state not in ["left", "kicked", "rejected"]:
        room_member.state = "left"
        room_member.left_at = datetime.utcnow()

        try:
            db.add(room_member)
            db.commit()
            db.refresh(room_member)
        except SQLAlchemyError:
            db.rollback()
            return