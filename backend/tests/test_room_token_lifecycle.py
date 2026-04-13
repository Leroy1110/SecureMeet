"""Tests covering room token lifecycle alignment with room expiry."""
from datetime import datetime, timedelta

import pytest
from jose import jwt
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.auth.security import create_room_token, hash_password
from app.config import JWT_ALGORITHM, JWT_SECRET_KEY, ROOM_DEFAULT_DURATION_HOURS
from app.db.base import Base
from app.db.models import User
from app.rooms.service import create_room, join_room


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

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


def _add_user(db: Session, *, user_id: int, username: str) -> User:
    user = User(
        id=user_id,
        email=f"{username}@example.com",
        username=username,
        password_hash=hash_password("pw"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _decode_exp(token: str) -> datetime:
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    return datetime.utcfromtimestamp(payload["exp"])


# ---------------------------------------------------------------------------
# create_room_token unit tests
# ---------------------------------------------------------------------------

class TestCreateRoomToken:
    def test_explicit_expires_delta_is_respected(self):
        delta = timedelta(hours=3)
        before = datetime.utcnow().replace(microsecond=0)  # JWT exp is integer seconds
        token = create_room_token({"user_id": 1}, expires_delta=delta)
        after = datetime.utcnow().replace(microsecond=0) + timedelta(seconds=1)

        exp = _decode_exp(token)
        assert before + delta <= exp <= after + delta

    def test_default_ttl_used_when_no_delta(self):
        before = datetime.utcnow().replace(microsecond=0)  # JWT exp is integer seconds
        token = create_room_token({"user_id": 1})
        after = datetime.utcnow().replace(microsecond=0) + timedelta(seconds=1)

        exp = _decode_exp(token)
        # Default is ROOM_DEFAULT_DURATION_HOURS * 60 minutes
        expected_delta = timedelta(hours=ROOM_DEFAULT_DURATION_HOURS)
        assert before + expected_delta <= exp <= after + expected_delta

    def test_short_delta_produces_near_expiry(self):
        delta = timedelta(seconds=30)
        before = datetime.utcnow().replace(microsecond=0)  # JWT exp is integer seconds
        token = create_room_token({"user_id": 1}, expires_delta=delta)
        after = datetime.utcnow().replace(microsecond=0) + timedelta(seconds=1)

        exp = _decode_exp(token)
        assert before + delta <= exp <= after + delta


# ---------------------------------------------------------------------------
# create_room service tests
# ---------------------------------------------------------------------------

class TestCreateRoomTokenLifecycle:
    TOLERANCE = timedelta(seconds=5)

    def test_host_token_expires_with_room(self, db_session):
        host = _add_user(db_session, user_id=1, username="host")

        before = datetime.utcnow()
        room, _password, host_jwt = create_room(db=db_session, host_user_id=host.id)
        after = datetime.utcnow()

        token_exp = _decode_exp(host_jwt)
        room_exp = room.expires_at

        # Token expiry should be within tolerance of room expiry
        assert abs((token_exp - room_exp).total_seconds()) <= self.TOLERANCE.total_seconds()

    def test_host_token_not_expired_at_issue_time(self, db_session):
        host = _add_user(db_session, user_id=2, username="host2")

        _room, _password, host_jwt = create_room(db=db_session, host_user_id=host.id)

        token_exp = _decode_exp(host_jwt)
        assert token_exp > datetime.utcnow()

    def test_room_default_duration_matches_config(self, db_session):
        host = _add_user(db_session, user_id=3, username="host3")

        before = datetime.utcnow()
        room, _password, _jwt = create_room(db=db_session, host_user_id=host.id)
        after = datetime.utcnow()

        expected_duration = timedelta(hours=ROOM_DEFAULT_DURATION_HOURS)
        assert before + expected_duration <= room.expires_at <= after + expected_duration


# ---------------------------------------------------------------------------
# join_room service tests
# ---------------------------------------------------------------------------

class TestJoinRoomTokenLifecycle:
    TOLERANCE = timedelta(seconds=5)

    def test_participant_token_expires_with_room(self, db_session):
        host = _add_user(db_session, user_id=10, username="host10")
        participant = _add_user(db_session, user_id=11, username="participant11")

        room, room_password, _host_jwt = create_room(db=db_session, host_user_id=host.id)

        participant_jwt = join_room(
            db=db_session,
            user_id=participant.id,
            room_code=room.room_code,
            room_password=room_password,
        )

        token_exp = _decode_exp(participant_jwt)
        room_exp = room.expires_at

        # Participant token must not outlive the room
        assert token_exp <= room_exp + self.TOLERANCE

    def test_participant_token_not_expired_at_join_time(self, db_session):
        host = _add_user(db_session, user_id=20, username="host20")
        participant = _add_user(db_session, user_id=21, username="participant21")

        room, room_password, _host_jwt = create_room(db=db_session, host_user_id=host.id)

        participant_jwt = join_room(
            db=db_session,
            user_id=participant.id,
            room_code=room.room_code,
            room_password=room_password,
        )

        token_exp = _decode_exp(participant_jwt)
        assert token_exp > datetime.utcnow()

    def test_participant_token_bounded_by_room_expiry(self, db_session):
        """Token issued after room has been running for some time should not
        extend beyond the room's fixed expiry."""
        host = _add_user(db_session, user_id=30, username="host30")
        participant = _add_user(db_session, user_id=31, username="participant31")

        room, room_password, _host_jwt = create_room(db=db_session, host_user_id=host.id)
        room_exp = room.expires_at

        participant_jwt = join_room(
            db=db_session,
            user_id=participant.id,
            room_code=room.room_code,
            room_password=room_password,
        )

        token_exp = _decode_exp(participant_jwt)

        # The token must expire at or before the room expires (within tolerance)
        assert token_exp <= room_exp + self.TOLERANCE
