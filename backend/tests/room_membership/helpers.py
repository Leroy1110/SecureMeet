from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.auth.security import hash_password
from app.db.models import Room, RoomMember, User


def create_user(db: Session, *, user_id: int, username: str) -> User:
    user = User(
        id=user_id,
        email=f"{username}@example.com",
        username=username,
        password_hash="hashed",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_room(
    db: Session,
    *,
    room_code: str = "ROOM123",
    host_id: int = 1,
) -> Room:
    room = Room(
        room_code=room_code,
        host_id=host_id,
        password_hash=hash_password("pw123"),
        status="active",
        expires_at=datetime.utcnow() + timedelta(hours=1),
        encryption_key_encrypted="encrypted-key",
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return room


def create_member(
    db: Session,
    *,
    room_id: int,
    user_id: int,
    state: str,
    role: str = "participant",
    display_name: str | None = None,
) -> RoomMember:
    left_at = None
    if state in {"left", "kicked", "rejected"}:
        left_at = datetime.utcnow()

    member = RoomMember(
        room_id=room_id,
        user_id=user_id,
        display_name=display_name or f"user-{user_id}",
        role=role,
        state=state,
        joined_at=datetime.utcnow(),
        left_at=left_at,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member
