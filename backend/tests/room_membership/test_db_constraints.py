from datetime import datetime

import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.models import RoomMember
from tests.room_membership.helpers import create_room, create_user


def test_room_member_rejects_invalid_state(db_session: Session) -> None:
    user = create_user(db_session, user_id=1001, username="stateuser")
    room = create_room(db_session, room_code="ROOM-CHECKS-A", host_id=user.id)

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


def test_room_member_allows_single_live_membership_row(
    db_session: Session,
) -> None:
    user = create_user(db_session, user_id=1002, username="dupuser")
    room = create_room(db_session, room_code="ROOM-CHECKS-B", host_id=user.id)

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
