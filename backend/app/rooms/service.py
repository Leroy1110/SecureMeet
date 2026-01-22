from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta, timezone
from app.db.models import Room, RoomMember
from app.auth.security import hash_password
from app.crypto.symmetric import generate_room_key
from app.crypto.rsa import encrypt_room_key
import secrets

def create_room(db: Session, host_user_id: int) -> tuple[Room, str]:
    room_code = secrets.token_urlsafe(8)
    while db.query(Room).filter_by(room_code=room_code).first():
        room_code = secrets.token_urlsafe(8)
    
    room_password = secrets.token_urlsafe(12)
    password_hash = hash_password(room_password)

    room_key = generate_room_key()
    encrypted_room_key = encrypt_room_key(room_key)

    expires_at = datetime.now(timezone.utc) + timedelta(hours=2)

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
        joined_at=datetime.now(timezone.utc)
    )

    try:
        db.add(new_room)
        db.flush()

        host_member.room_id = new_room.id
        db.add(host_member)

        db.commit()
        db.refresh(new_room)
        db.refresh(host_member)

        return (new_room, room_password)
    except SQLAlchemyError as e:
        db.rollback()
        raise RuntimeError("Failed to create room") from e