from app.signaling.room_manager import RoomManager


def test_registered_state_tracks_transferred_host_connection():
    manager = RoomManager()
    room_code = "ROOM1"
    old_host_ws = object()
    new_host_ws = object()

    manager.add_connection(
        room_code=room_code,
        ws=old_host_ws,
        role="host",
        state="active",
        user_id=1,
    )
    manager.add_connection(
        room_code=room_code,
        ws=new_host_ws,
        role="participant",
        state="active",
        user_id=2,
    )

    manager.transfer_host(
        room_code=room_code,
        current_host_user_id=1,
        new_host_user_id=2,
    )

    assert manager.get_registered_connection_state(
        room_code=room_code,
        ws=old_host_ws,
        user_id=1,
    ) == "active"
    assert manager.get_registered_connection_state(
        room_code=room_code,
        ws=new_host_ws,
        user_id=2,
    ) == "active"


def test_disconnect_grace_tracks_transferred_roles():
    manager = RoomManager()
    room_code = "ROOM2"
    old_host_ws = object()
    new_host_ws = object()

    manager.add_connection(
        room_code=room_code,
        ws=old_host_ws,
        role="host",
        state="active",
        user_id=1,
    )
    manager.add_connection(
        room_code=room_code,
        ws=new_host_ws,
        role="participant",
        state="active",
        user_id=2,
    )

    manager.transfer_host(
        room_code=room_code,
        current_host_user_id=1,
        new_host_user_id=2,
    )

    old_host_pending = manager.begin_disconnect_grace(
        room_code=room_code,
        ws=old_host_ws,
        user_id=1,
        grace_period_seconds=15,
    )
    new_host_pending = manager.begin_disconnect_grace(
        room_code=room_code,
        ws=new_host_ws,
        user_id=2,
        grace_period_seconds=15,
    )

    assert old_host_pending is not None
    assert old_host_pending.role == "participant"
    assert old_host_pending.state == "active"

    assert new_host_pending is not None
    assert new_host_pending.role == "host"
    assert new_host_pending.state == "active"
