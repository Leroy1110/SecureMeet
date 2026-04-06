from datetime import datetime, timedelta

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.auth.security import hash_password
from app.db.base import Base
from app.db.models import Room, RoomMember, User
from app.rooms.service import (
    count_current_active_members,
    join_room,
    mark_member_kicked,
    mark_member_left,
    update_user_state,
)
from app.signaling.ws import (
    _resolve_display_names,
    validate_room_for_ws_connect,
)


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


def _create_room(db: Session, room_code: str = "ROOM123", host_id: int = 1) -> Room:
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


def _create_member(
    db: Session,
    room_id: int,
    user_id: int,
    state: str,
    role: str = "participant",
    display_name: str = "Name",
) -> RoomMember:
    left_at = None
    if state in {"left", "kicked", "rejected"}:
        left_at = datetime.utcnow()

    member = RoomMember(
        room_id=room_id,
        user_id=user_id,
        display_name=display_name,
        role=role,
        state=state,
        joined_at=datetime.utcnow(),
        left_at=left_at,
    )
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


def test_update_user_state_updates_latest_waiting_row(db_session: Session) -> None:
    user = _create_user(db_session, user_id=1, username="alice")
    room = _create_room(db_session, host_id=user.id)

    older_terminal = _create_member(
        db_session,
        room.id,
        user.id,
        state="rejected",
    )
    latest_waiting = _create_member(db_session, room.id, user.id, state="waiting")

    updated = update_user_state(
        db=db_session, room_id=room.id, user_id=user.id, new_state="active")
    assert updated is True

    db_session.refresh(older_terminal)
    db_session.refresh(latest_waiting)
    assert older_terminal.state == "rejected"
    assert latest_waiting.state == "active"


def test_mark_member_left_and_kicked_target_latest_row_only(
    db_session: Session,
) -> None:
    user = _create_user(db_session, user_id=2, username="bob")
    room = _create_room(db_session, host_id=user.id)

    older = _create_member(db_session, room.id, user.id, state="left")
    latest = _create_member(db_session, room.id, user.id, state="active")

    mark_member_left(db=db_session, room_id=room.id, user_id=user.id)

    db_session.refresh(older)
    db_session.refresh(latest)
    assert older.state == "left"
    assert latest.state == "left"
    assert latest.left_at is not None

    latest_second = _create_member(db_session, room.id, user.id, state="active")
    mark_member_kicked(db=db_session, room_id=room.id, user_id=user.id)

    db_session.refresh(latest_second)
    assert latest_second.state == "kicked"
    assert latest_second.left_at is not None


def test_count_current_active_members_uses_latest_rows_only(
    db_session: Session,
) -> None:
    host = _create_user(db_session, user_id=10, username="host")
    participant = _create_user(db_session, user_id=11, username="participant")
    room = _create_room(db_session, host_id=host.id)

    _create_member(db_session, room.id, host.id, state="active", role="host")
    _create_member(db_session, room.id, participant.id, state="active")
    _create_member(db_session, room.id, participant.id, state="left")

    assert count_current_active_members(db_session, room.id) == 1


def test_join_room_allows_rejoin_when_latest_row_is_terminal(
    db_session: Session,
) -> None:
    host = _create_user(db_session, user_id=20, username="host2")
    participant = _create_user(db_session, user_id=21, username="charlie")
    room = _create_room(db_session, room_code="JOINME", host_id=host.id)

    _create_member(db_session, room.id, participant.id, state="rejected")
    _create_member(db_session, room.id, participant.id, state="left")

    token = join_room(
        db=db_session,
        user_id=participant.id,
        room_code=room.room_code,
        room_password="pw123",
        display_name=None,
    )
    assert isinstance(token, str) and token

    latest = (
        db_session.query(RoomMember)
        .filter(RoomMember.room_id == room.id, RoomMember.user_id == participant.id)
        .order_by(RoomMember.id.desc())
        .first()
    )
    assert latest is not None
    assert latest.state == "waiting"


def test_validate_room_for_ws_connect_uses_latest_row_state(
    db_session: Session,
) -> None:
    host = _create_user(db_session, user_id=30, username="host3")
    participant = _create_user(db_session, user_id=31, username="dana")
    room = _create_room(db_session, room_code="WSROOM", host_id=host.id)

    _create_member(db_session, room.id, participant.id, state="rejected")
    _create_member(db_session, room.id, participant.id, state="kicked")

    with pytest.raises(ValueError, match="member state not allowed"):
        validate_room_for_ws_connect(
            db_session,
            room_code_path=room.room_code,
            token_payload={
                "room_code": room.room_code,
                "room_id": room.id,
                "user_id": participant.id,
            },
        )

    _create_member(db_session, room.id, participant.id, state="active")
    room_id, user_id, role, state = validate_room_for_ws_connect(
        db_session,
        room_code_path=room.room_code,
        token_payload={
            "room_code": room.room_code,
            "room_id": room.id,
            "user_id": participant.id,
        },
    )
    assert room_id == room.id
    assert user_id == participant.id
    assert role == "participant"
    assert state == "active"


def test_resolve_display_names_uses_latest_membership_rows(db_session: Session) -> None:
    host = _create_user(db_session, user_id=40, username="host4")
    participant = _create_user(db_session, user_id=41, username="erin")
    room = _create_room(db_session, room_code="NAMES", host_id=host.id)

    _create_member(
        db_session,
        room.id,
        participant.id,
        state="left",
        display_name="Old Name",
    )
    _create_member(
        db_session,
        room.id,
        participant.id,
        state="active",
        display_name="Latest Name",
    )

    display_names = _resolve_display_names(
        db=db_session,
        room_id=room.id,
        user_ids=[participant.id, 999],
    )
    assert display_names[participant.id] == "Latest Name"
    assert display_names[999] == "User 999"
