import asyncio

import pytest
from sqlalchemy.orm import Session

from app.signaling import ws as ws_module
from tests.room_membership.helpers import (
    create_member,
    create_room,
    create_user,
)


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict] = []

    async def send_json(self, payload: dict) -> None:
        self.messages.append(payload)


@pytest.fixture(autouse=True)
def clear_room_manager_state():
    ws_module.room_manager.rooms.clear()
    yield
    ws_module.room_manager.rooms.clear()


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


def _active_add_user_ids(ws: FakeWebSocket) -> list[int]:
    return [
        message.get("payload", {}).get("user", {}).get("user_id")
        for message in ws.messages
        if message.get("type") == "active.add"
    ]


def test_broadcast_active_added_notifies_host_and_other_actives_on_reconnect(
    db_session: Session,
) -> None:
    host = create_user(db_session, user_id=1, username="host-active-add")
    user_two = create_user(db_session, user_id=2, username="peer-two")
    user_three = create_user(db_session, user_id=3, username="peer-three")
    room = create_room(
        db_session,
        room_code="ACTIVEADD-RECONNECT",
        host_id=host.id,
    )

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
        user_id=user_two.id,
        state="active",
    )
    create_member(
        db_session,
        room_id=room.id,
        user_id=user_three.id,
        state="active",
    )

    host_ws = FakeWebSocket()
    user_two_old_ws = FakeWebSocket()
    user_two_new_ws = FakeWebSocket()
    user_three_ws = FakeWebSocket()

    _register_connection(
        room_code=room.room_code,
        ws=host_ws,
        role="host",
        state="active",
        user_id=host.id,
    )
    _register_connection(
        room_code=room.room_code,
        ws=user_two_old_ws,
        role="participant",
        state="active",
        user_id=user_two.id,
    )
    _register_connection(
        room_code=room.room_code,
        ws=user_three_ws,
        role="participant",
        state="active",
        user_id=user_three.id,
    )

    replaced = ws_module.room_manager.replace_connection(
        room_code=room.room_code,
        user_id=user_two.id,
        new_ws=user_two_new_ws,
        role="participant",
    )
    assert replaced is user_two_old_ws

    _register_connection(
        room_code=room.room_code,
        ws=user_two_new_ws,
        role="participant",
        state="active",
        user_id=user_two.id,
    )

    room_state = ws_module.room_manager.get_or_create_room(room.room_code)
    asyncio.run(
        ws_module._broadcast_active_added(
            db=db_session,
            room_id=room.id,
            room_state=room_state,
            user_id=user_two.id,
        )
    )

    assert _active_add_user_ids(host_ws) == [user_two.id]
    assert _active_add_user_ids(user_three_ws) == [user_two.id]
    assert _active_add_user_ids(user_two_new_ws) == []


def test_broadcast_active_added_skips_host_socket_when_host_is_subject(
    db_session: Session,
) -> None:
    host = create_user(db_session, user_id=11, username="host-subject")
    participant = create_user(
        db_session,
        user_id=12,
        username="participant-subject",
    )
    room = create_room(db_session, room_code="ACTIVEADD-HOST", host_id=host.id)

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
    asyncio.run(
        ws_module._broadcast_active_added(
            db=db_session,
            room_id=room.id,
            room_state=room_state,
            user_id=host.id,
        )
    )

    assert _active_add_user_ids(host_ws) == []
    assert _active_add_user_ids(participant_ws) == [host.id]
