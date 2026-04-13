"""Tests covering room token lifecycle alignment with room expiry."""
from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app.auth.security import create_room_token
from app.config import ROOM_DEFAULT_DURATION_HOURS
from app.rooms.service import create_room, join_room
from tests.helpers.token_helpers import decode_expiry
from tests.room_membership.helpers import create_user


# ---------------------------------------------------------------------------
# Shared constants
# ---------------------------------------------------------------------------
TOKEN_TOLERANCE_SECONDS = 5


# ---------------------------------------------------------------------------
# create_room_token unit tests
# ---------------------------------------------------------------------------

class TestCreateRoomToken:
    def test_explicit_expires_delta_is_respected(self):
        delta = timedelta(hours=3)
        before = datetime.utcnow().replace(microsecond=0)  # JWT exp is integer seconds
        token = create_room_token({"user_id": 1}, expires_delta=delta)
        after = datetime.utcnow().replace(microsecond=0) + timedelta(seconds=1)

        exp = decode_expiry(token)
        assert before + delta <= exp <= after + delta

    def test_default_ttl_used_when_no_delta(self):
        before = datetime.utcnow().replace(microsecond=0)  # JWT exp is integer seconds
        token = create_room_token({"user_id": 1})
        after = datetime.utcnow().replace(microsecond=0) + timedelta(seconds=1)

        exp = decode_expiry(token)
        # Default is ROOM_DEFAULT_DURATION_HOURS * 60 minutes
        expected_delta = timedelta(hours=ROOM_DEFAULT_DURATION_HOURS)
        assert before + expected_delta <= exp <= after + expected_delta

    def test_short_delta_produces_near_expiry(self):
        delta = timedelta(seconds=30)
        before = datetime.utcnow().replace(microsecond=0)  # JWT exp is integer seconds
        token = create_room_token({"user_id": 1}, expires_delta=delta)
        after = datetime.utcnow().replace(microsecond=0) + timedelta(seconds=1)

        exp = decode_expiry(token)
        assert before + delta <= exp <= after + delta


# ---------------------------------------------------------------------------
# create_room service tests
# ---------------------------------------------------------------------------

class TestCreateRoomTokenLifecycle:
    TOLERANCE = timedelta(seconds=TOKEN_TOLERANCE_SECONDS)

    def test_host_token_expires_with_room(self, db_session: Session):
        host = create_user(db_session, user_id=1, username="host")

        before = datetime.utcnow()
        room, _password, host_jwt = create_room(db=db_session, host_user_id=host.id)
        after = datetime.utcnow()

        token_exp = decode_expiry(host_jwt)
        room_exp = room.expires_at

        # Token expiry should be within tolerance of room expiry
        assert abs((token_exp - room_exp).total_seconds()) <= self.TOLERANCE.total_seconds()

    def test_host_token_not_expired_at_issue_time(self, db_session: Session):
        host = create_user(db_session, user_id=2, username="host2")

        _room, _password, host_jwt = create_room(db=db_session, host_user_id=host.id)

        token_exp = decode_expiry(host_jwt)
        assert token_exp > datetime.utcnow()

    def test_room_default_duration_matches_config(self, db_session: Session):
        host = create_user(db_session, user_id=3, username="host3")

        before = datetime.utcnow()
        room, _password, _jwt = create_room(db=db_session, host_user_id=host.id)
        after = datetime.utcnow()

        expected_duration = timedelta(hours=ROOM_DEFAULT_DURATION_HOURS)
        assert before + expected_duration <= room.expires_at <= after + expected_duration


# ---------------------------------------------------------------------------
# join_room service tests
# ---------------------------------------------------------------------------

class TestJoinRoomTokenLifecycle:
    TOLERANCE = timedelta(seconds=TOKEN_TOLERANCE_SECONDS)

    def test_participant_token_expires_with_room(self, db_session: Session):
        host = create_user(db_session, user_id=10, username="host10")
        participant = create_user(db_session, user_id=11, username="participant11")

        room, room_password, _host_jwt = create_room(db=db_session, host_user_id=host.id)

        participant_jwt = join_room(
            db=db_session,
            user_id=participant.id,
            room_code=room.room_code,
            room_password=room_password,
        )

        token_exp = decode_expiry(participant_jwt)
        room_exp = room.expires_at

        # Participant token must not outlive the room
        assert token_exp <= room_exp + self.TOLERANCE

    def test_participant_token_not_expired_at_join_time(self, db_session: Session):
        host = create_user(db_session, user_id=20, username="host20")
        participant = create_user(db_session, user_id=21, username="participant21")

        room, room_password, _host_jwt = create_room(db=db_session, host_user_id=host.id)

        participant_jwt = join_room(
            db=db_session,
            user_id=participant.id,
            room_code=room.room_code,
            room_password=room_password,
        )

        token_exp = decode_expiry(participant_jwt)
        assert token_exp > datetime.utcnow()

    def test_participant_token_bounded_by_room_expiry(self, db_session: Session):
        """Token issued after room has been running for some time should not
        extend beyond the room's fixed expiry."""
        host = create_user(db_session, user_id=30, username="host30")
        participant = create_user(db_session, user_id=31, username="participant31")

        room, room_password, _host_jwt = create_room(db=db_session, host_user_id=host.id)
        room_exp = room.expires_at

        participant_jwt = join_room(
            db=db_session,
            user_id=participant.id,
            room_code=room.room_code,
            room_password=room_password,
        )

        token_exp = decode_expiry(participant_jwt)

        # The token must expire at or before the room expires (within tolerance)
        assert token_exp <= room_exp + self.TOLERANCE
