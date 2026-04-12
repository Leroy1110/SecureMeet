import pytest
from sqlalchemy.orm import Session

from app.db.models import RoomMember
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
from tests.room_membership.helpers import create_member, create_room, create_user


def test_update_user_state_updates_latest_waiting_row(db_session: Session) -> None:
    user = create_user(db_session, user_id=1, username="alice")
    room = create_room(db_session, host_id=user.id)

    older_terminal = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="rejected",
    )
    latest_waiting = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="waiting",
    )

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
    user = create_user(db_session, user_id=2, username="bob")
    room = create_room(db_session, host_id=user.id)

    older = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="left",
    )
    latest = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="active",
    )

    mark_member_left(db=db_session, room_id=room.id, user_id=user.id)

    db_session.refresh(older)
    db_session.refresh(latest)
    assert older.state == "left"
    assert latest.state == "left"
    assert latest.left_at is not None

    latest_second = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="active",
    )
    mark_member_kicked(db=db_session, room_id=room.id, user_id=user.id)

    db_session.refresh(latest_second)
    assert latest_second.state == "kicked"
    assert latest_second.left_at is not None


def test_count_current_active_members_uses_latest_rows_only(
    db_session: Session,
) -> None:
    host = create_user(db_session, user_id=10, username="host")
    participant = create_user(db_session, user_id=11, username="participant")
    room = create_room(db_session, host_id=host.id)

    create_member(
        db_session,
        room_id=room.id,
        user_id=host.id,
        state="active",
        role="host",
    )
    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
        state="active",
    )
    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
        state="left",
    )

    assert count_current_active_members(db_session, room.id) == 1


def test_join_room_allows_rejoin_when_latest_row_is_terminal(
    db_session: Session,
) -> None:
    host = create_user(db_session, user_id=20, username="host2")
    participant = create_user(db_session, user_id=21, username="charlie")
    room = create_room(db_session, room_code="JOINME", host_id=host.id)

    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
        state="rejected",
    )
    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
        state="left",
    )

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
    host = create_user(db_session, user_id=30, username="host3")
    participant = create_user(db_session, user_id=31, username="dana")
    room = create_room(db_session, room_code="WSROOM", host_id=host.id)

    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
        state="rejected",
    )
    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
        state="kicked",
    )

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

    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
        state="active",
    )
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
    host = create_user(db_session, user_id=40, username="host4")
    participant = create_user(db_session, user_id=41, username="erin")
    room = create_room(db_session, room_code="NAMES", host_id=host.id)

    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
        state="left",
        display_name="Old Name",
    )
    create_member(
        db_session,
        room_id=room.id,
        user_id=participant.id,
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


def test_update_user_state_does_not_mutate_historical_waiting_row(
    db_session: Session,
) -> None:
    user = create_user(db_session, user_id=50, username="historical")
    room = create_room(db_session, room_code="CAS-NOOP", host_id=user.id)

    historical_waiting = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="waiting",
    )
    latest_rejected = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="rejected",
    )

    with pytest.raises(ValueError, match="User is not in waiting state"):
        update_user_state(
            db=db_session,
            room_id=room.id,
            user_id=user.id,
            new_state="rejected",
        )

    db_session.refresh(historical_waiting)
    db_session.refresh(latest_rejected)
    assert historical_waiting.state == "waiting"
    assert historical_waiting.left_at is None
    assert latest_rejected.state == "rejected"
    assert latest_rejected.left_at is not None


@pytest.mark.parametrize(
    ("transition_fn", "expected_latest_state"),
    [
        (mark_member_left, "rejected"),
        (mark_member_kicked, "rejected"),
    ],
)
def test_terminal_latest_row_blocks_stale_transition_updates(
    db_session: Session,
    transition_fn,
    expected_latest_state: str,
) -> None:
    user = create_user(db_session, user_id=51, username="terminal")
    room = create_room(db_session, room_code="CAS-NOOP-TERMINAL", host_id=user.id)

    historical_active = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="active",
    )
    latest_terminal = create_member(
        db_session,
        room_id=room.id,
        user_id=user.id,
        state="rejected",
    )

    transition_fn(db=db_session, room_id=room.id, user_id=user.id)

    db_session.refresh(historical_active)
    db_session.refresh(latest_terminal)
    assert historical_active.state == "active"
    assert historical_active.left_at is None
    assert latest_terminal.state == expected_latest_state
    assert latest_terminal.left_at is not None
