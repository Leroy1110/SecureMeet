from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.auth.security import hash_password
from app.db.base import Base
from app.db.models import Room, RoomMember, User


@pytest.fixture
def db_session() -> Session:
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
    )
    SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _create_user(db: Session, user_id: int, username: str) -> User:
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


def _create_room(db: Session, host_id: int) -> Room:
    room = Room(
        room_code="ROOM-CHECKS",
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


def test_room_member_rejects_invalid_state(db_session: Session) -> None:
    user = _create_user(db_session, user_id=1001, username="stateuser")
    room = _create_room(db_session, host_id=user.id)

    db_session.add(
        RoomMember(
            room_id=room.id,
            user_id=user.id,
            display_name="State User",
            role="participant",
            state="unknown",
            joined_at=datetime.utcnow(),
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()


def test_room_member_allows_single_live_membership_row(db_session: Session) -> None:
    user = _create_user(db_session, user_id=1002, username="dupuser")
    room = _create_room(db_session, host_id=user.id)

    db_session.add(
        RoomMember(
            room_id=room.id,
            user_id=user.id,
            display_name="Dup User",
            role="participant",
            state="waiting",
            joined_at=datetime.utcnow(),
        )
    )
    db_session.commit()

    db_session.add(
        RoomMember(
            room_id=room.id,
            user_id=user.id,
            display_name="Dup User",
            role="participant",
            state="active",
            joined_at=datetime.utcnow(),
        )
    )
    with pytest.raises(IntegrityError):
        db_session.commit()
