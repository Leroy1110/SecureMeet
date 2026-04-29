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


def _messages_of_type(ws: FakeWebSocket, message_type: str) -> list[dict]:
    return [message for message in ws.messages if message.get("type") == message_type]


def test_handler_screen_share_start_broadcasts_current_sharer(
    db_session: Session,
) -> None:
    host = create_user(db_session, user_id=1000, username="host-screen-start")
    participant = create_user(
        db_session,
        user_id=1001,
        username="participant-screen-start",
    )
    room = create_room(db_session, room_code="SCREEN-START", host_id=host.id)
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
        ws_module.handler_screen_share_start(
            websocket=participant_ws,
            room_state=room_state,
            room_code=room.room_code,
            room_id=room.id,
            sender_user_id=participant.id,
            sender_role="participant",
            payload={},
            db=db_session,
        )
    )

    assert room_state.screen_sharer_user_id == participant.id
    host_updates = _messages_of_type(host_ws, "screen.share.state")
    participant_updates = _messages_of_type(participant_ws, "screen.share.state")
    assert host_updates[-1]["payload"]["user_id"] == participant.id
    assert participant_updates[-1]["payload"]["user_id"] == participant.id


def test_handler_screen_share_start_rejects_when_another_user_is_sharing(
    db_session: Session,
) -> None:
    host = create_user(db_session, user_id=1100, username="host-screen-reject")
    participant = create_user(
        db_session,
        user_id=1101,
        username="participant-screen-reject",
    )
    room = create_room(db_session, room_code="SCREEN-REJECT", host_id=host.id)
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
    room_state.screen_sharer_user_id = host.id

    asyncio.run(
        ws_module.handler_screen_share_start(
            websocket=participant_ws,
            room_state=room_state,
            room_code=room.room_code,
            room_id=room.id,
            sender_user_id=participant.id,
            sender_role="participant",
            payload={},
            db=db_session,
        )
    )

    assert room_state.screen_sharer_user_id == host.id
    error_messages = _messages_of_type(participant_ws, "error")
    assert (
        error_messages[-1]["payload"]["message"]
        == "another user is currently sharing their screen"
    )


def test_handler_host_screen_stop_forces_target_to_stop_and_clears_state(
    db_session: Session,
) -> None:
    host = create_user(db_session, user_id=1200, username="host-screen-stop")
    participant = create_user(
        db_session,
        user_id=1201,
        username="participant-screen-stop",
    )
    room = create_room(db_session, room_code="SCREEN-HOST-STOP", host_id=host.id)
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
    room_state.screen_sharer_user_id = participant.id

    asyncio.run(
        ws_module.handler_host_screen_stop(
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

    assert room_state.screen_sharer_user_id is None
    force_stop_messages = _messages_of_type(participant_ws, "screen.share.force_stop")
    assert len(force_stop_messages) == 1

    host_updates = _messages_of_type(host_ws, "screen.share.state")
    participant_updates = _messages_of_type(participant_ws, "screen.share.state")
    assert host_updates[-1]["payload"]["user_id"] is None
    assert participant_updates[-1]["payload"]["user_id"] is None
