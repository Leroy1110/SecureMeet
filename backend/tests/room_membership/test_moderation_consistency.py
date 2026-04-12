import asyncio
from datetime import datetime

import pytest
from fastapi import status
from sqlalchemy.orm import Session

from app.db.models import EventLog
from app.rooms.service import get_latest_room_member
from app.signaling import ws as ws_module
from tests.room_membership.helpers import create_member, create_room, create_user


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []
        self.closed_code: int | None = None
        self.closed_reason: str | None = None

    async def send_json(self, payload: dict) -> None:
        self.messages.append(payload)

    async def close(self, code: int | None = None, reason: str | None = None) -> None:
        self.closed_code = code
        self.closed_reason = reason


@pytest.fixture(autouse=True)
def clear_room_manager_state():
    ws_module.room_manager.rooms.clear()
    yield
    ws_module.room_manager.rooms.clear()


def _latest_state(db: Session, room_id: int, user_id: int) -> tuple[str | None, datetime | None]:
    member = get_latest_room_member(db=db, room_id=room_id, user_id=user_id)
    if member is None:
        return (None, None)
    return (member.state, member.left_at)


def _error_messages(ws: FakeWebSocket) -> list[str]:
    return [
        msg.get("payload", {}).get("message")
        for msg in ws.messages
        if msg.get("type") == "error"
    ]


def _register_connection(
    *,
    room_code: str,
    ws: FakeWebSocket,
    role: str,
    state: str,
    user_id: int,
) -> None:
    ws_module.room_manager.add_connection(
        room_code=room_code,
        ws=ws,
        role=role,
        state=state,
        user_id=user_id,
    )


def test_handler_approve_compensates_db_when_room_manager_fails(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    host = create_user(db_session, user_id=100, username="host-approve")
    participant = create_user(db_session, user_id=101, username="participant-approve")
    room = create_room(db_session, room_code="APPROVE-CONSISTENCY", host_id=host.id)
    create_member(db_session, room_id=room.id, user_id=host.id, state="active", role="host")
    create_member(db_session, room_id=room.id, user_id=participant.id, state="waiting")

    host_ws = FakeWebSocket()
    participant_ws = FakeWebSocket()
    _register_connection(
        room_code=room.room_code,
        ws=host_ws,
        role="host",
        state="active",
        user_id=host.id,
    )
    _register_connection(
        room_code=room.room_code,
        ws=participant_ws,
        role="participant",
        state="waiting",
        user_id=participant.id,
    )
    room_state = ws_module.room_manager.get_or_create_room(room.room_code)

    observed_states: list[str | None] = []

    def fail_approve(*, room_code: str, user_id: int) -> tuple[bool, None]:
        assert room_code == room.room_code
        assert user_id == participant.id
        current_state, _ = _latest_state(db_session, room.id, participant.id)
        observed_states.append(current_state)
        return (False, None)

    monkeypatch.setattr(ws_module.room_manager, "approve_user", fail_approve)

    asyncio.run(
        ws_module.handler_approve(
            websocket=host_ws,
            room_state=room_state,
            room_code=room.room_code,
            room_id=room.id,
            sender_user_id=host.id,
            sender_role="host",
            payload={"user_id": participant.id},
            db=db_session,
        )
    )

    latest_state, latest_left_at = _latest_state(db_session, room.id, participant.id)
    assert observed_states == ["active"]
    assert latest_state == "waiting"
    assert latest_left_at is None
    assert participant.id in room_state.waiting_ws
    assert "failed to approve user" in _error_messages(host_ws)


def test_handler_reject_compensates_db_when_room_manager_fails(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    host = create_user(db_session, user_id=200, username="host-reject")
    participant = create_user(db_session, user_id=201, username="participant-reject")
    room = create_room(db_session, room_code="REJECT-CONSISTENCY", host_id=host.id)
    create_member(db_session, room_id=room.id, user_id=host.id, state="active", role="host")
    create_member(db_session, room_id=room.id, user_id=participant.id, state="waiting")

    host_ws = FakeWebSocket()
    participant_ws = FakeWebSocket()
    _register_connection(
        room_code=room.room_code,
        ws=host_ws,
        role="host",
        state="active",
        user_id=host.id,
    )
    _register_connection(
        room_code=room.room_code,
        ws=participant_ws,
        role="participant",
        state="waiting",
        user_id=participant.id,
    )
    room_state = ws_module.room_manager.get_or_create_room(room.room_code)

    observed_states: list[str | None] = []
    observed_left_at: list[datetime | None] = []

    def fail_reject(*, room_code: str, user_id: int) -> tuple[bool, None]:
        assert room_code == room.room_code
        assert user_id == participant.id
        current_state, current_left_at = _latest_state(db_session, room.id, participant.id)
        observed_states.append(current_state)
        observed_left_at.append(current_left_at)
        return (False, None)

    monkeypatch.setattr(ws_module.room_manager, "reject_user", fail_reject)

    asyncio.run(
        ws_module.handler_reject(
            websocket=host_ws,
            room_state=room_state,
            room_code=room.room_code,
            room_id=room.id,
            sender_user_id=host.id,
            sender_role="host",
            payload={"user_id": participant.id},
            db=db_session,
        )
    )

    latest_state, latest_left_at = _latest_state(db_session, room.id, participant.id)
    assert observed_states == ["rejected"]
    assert observed_left_at[0] is not None
    assert latest_state == "waiting"
    assert latest_left_at is None
    assert participant.id in room_state.waiting_ws
    assert "failed to reject user" in _error_messages(host_ws)


def test_handler_kick_keeps_live_state_when_db_transition_fails(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    host = create_user(db_session, user_id=300, username="host-kick-db")
    participant = create_user(db_session, user_id=301, username="participant-kick-db")
    room = create_room(db_session, room_code="KICK-DB-CONSISTENCY", host_id=host.id)
    create_member(db_session, room_id=room.id, user_id=host.id, state="active", role="host")
    create_member(db_session, room_id=room.id, user_id=participant.id, state="active")

    host_ws = FakeWebSocket()
    participant_ws = FakeWebSocket()
    _register_connection(
        room_code=room.room_code,
        ws=host_ws,
        role="host",
        state="active",
        user_id=host.id,
    )
    _register_connection(
        room_code=room.room_code,
        ws=participant_ws,
        role="participant",
        state="active",
        user_id=participant.id,
    )
    room_state = ws_module.room_manager.get_or_create_room(room.room_code)

    monkeypatch.setattr(
        ws_module,
        "_transition_latest_member_state",
        lambda *args, **kwargs: "db_error",
    )

    remove_called = {"value": False}

    def fail_if_called(*, room_code: str, user_id: int):
        remove_called["value"] = True
        return None

    monkeypatch.setattr(ws_module.room_manager, "remove_user_and_get_ws", fail_if_called)

    asyncio.run(
        ws_module.handler_kick(
            websocket=host_ws,
            room_state=room_state,
            room_code=room.room_code,
            room_id=room.id,
            sender_user_id=host.id,
            sender_role="host",
            payload={"user_id": participant.id},
            db=db_session,
        )
    )

    latest_state, latest_left_at = _latest_state(db_session, room.id, participant.id)
    assert remove_called["value"] is False
    assert latest_state == "active"
    assert latest_left_at is None
    assert participant.id in room_state.active_ws
    assert "failed to update user state" in _error_messages(host_ws)


def test_handler_kick_compensates_db_when_live_removal_fails(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    host = create_user(db_session, user_id=400, username="host-kick-live")
    participant = create_user(db_session, user_id=401, username="participant-kick-live")
    room = create_room(db_session, room_code="KICK-LIVE-CONSISTENCY", host_id=host.id)
    create_member(db_session, room_id=room.id, user_id=host.id, state="active", role="host")
    create_member(db_session, room_id=room.id, user_id=participant.id, state="active")

    host_ws = FakeWebSocket()
    participant_ws = FakeWebSocket()
    _register_connection(
        room_code=room.room_code,
        ws=host_ws,
        role="host",
        state="active",
        user_id=host.id,
    )
    _register_connection(
        room_code=room.room_code,
        ws=participant_ws,
        role="participant",
        state="active",
        user_id=participant.id,
    )
    room_state = ws_module.room_manager.get_or_create_room(room.room_code)

    observed_state_during_remove: list[tuple[str | None, datetime | None]] = []

    def fail_remove(*, room_code: str, user_id: int):
        assert room_code == room.room_code
        assert user_id == participant.id
        observed_state_during_remove.append(
            _latest_state(db_session, room.id, participant.id)
        )
        return None

    monkeypatch.setattr(ws_module.room_manager, "remove_user_and_get_ws", fail_remove)

    asyncio.run(
        ws_module.handler_kick(
            websocket=host_ws,
            room_state=room_state,
            room_code=room.room_code,
            room_id=room.id,
            sender_user_id=host.id,
            sender_role="host",
            payload={"user_id": participant.id},
            db=db_session,
        )
    )

    latest_state, latest_left_at = _latest_state(db_session, room.id, participant.id)
    assert observed_state_during_remove
    assert observed_state_during_remove[0][0] == "kicked"
    assert observed_state_during_remove[0][1] is not None
    assert latest_state == "active"
    assert latest_left_at is None
    assert participant.id in room_state.active_ws
    assert "failed to kick user" in _error_messages(host_ws)


def test_handler_approve_fail_closed_on_restore_failure_targets_only_user(
    db_session: Session,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    host = create_user(db_session, user_id=500, username="host-fail-closed")
    target = create_user(db_session, user_id=501, username="target-fail-closed")
    other_active = create_user(db_session, user_id=502, username="peer-fail-closed")
    room = create_room(db_session, room_code="APPROVE-FAIL-CLOSED", host_id=host.id)
    create_member(db_session, room_id=room.id, user_id=host.id, state="active", role="host")
    create_member(db_session, room_id=room.id, user_id=target.id, state="waiting")
    create_member(db_session, room_id=room.id, user_id=other_active.id, state="active")

    host_ws = FakeWebSocket()
    target_ws = FakeWebSocket()
    peer_ws = FakeWebSocket()
    _register_connection(
        room_code=room.room_code,
        ws=host_ws,
        role="host",
        state="active",
        user_id=host.id,
    )
    _register_connection(
        room_code=room.room_code,
        ws=target_ws,
        role="participant",
        state="waiting",
        user_id=target.id,
    )
    _register_connection(
        room_code=room.room_code,
        ws=peer_ws,
        role="participant",
        state="active",
        user_id=other_active.id,
    )
    room_state = ws_module.room_manager.get_or_create_room(room.room_code)

    monkeypatch.setattr(
        ws_module.room_manager,
        "approve_user",
        lambda *, room_code, user_id: (False, None),
    )
    monkeypatch.setattr(ws_module, "_restore_latest_member_state", lambda **kwargs: False)

    asyncio.run(
        ws_module.handler_approve(
            websocket=host_ws,
            room_state=room_state,
            room_code=room.room_code,
            room_id=room.id,
            sender_user_id=host.id,
            sender_role="host",
            payload={"user_id": target.id},
            db=db_session,
        )
    )

    latest_state, _ = _latest_state(db_session, room.id, target.id)
    assert latest_state == "active"
    assert ws_module.room_manager.get_user_live_state(room.room_code, target.id) is None
    assert target_ws.closed_code == status.WS_1011_INTERNAL_ERROR
    assert "failed to approve user" in _error_messages(host_ws)

    assert other_active.id in room_state.active_ws
    assert room_state.active_ws[other_active.id] is peer_ws

    fail_closed_event = (
        db_session.query(EventLog)
        .filter(
            EventLog.room_id == room.id,
            EventLog.user_id == target.id,
            EventLog.event_type == "MODERATION_FAIL_CLOSED",
        )
        .order_by(EventLog.id.desc())
        .first()
    )
    assert fail_closed_event is not None
    assert fail_closed_event.data_json is not None
    assert "approve" in fail_closed_event.data_json
