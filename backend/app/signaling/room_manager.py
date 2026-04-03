from dataclasses import dataclass
from datetime import datetime, timedelta
import secrets

from fastapi import WebSocket


@dataclass
class PendingDisconnect:
    user_id: int
    role: str
    state: str
    expires_at: datetime
    disconnect_id: str


class RoomState:
    host_ws: WebSocket | None
    host_user_id: int | None
    waiting_ws: dict[int, WebSocket]
    active_ws: dict[int, WebSocket]
    pending_disconnects: dict[int, PendingDisconnect]

    def __init__(self):
        self.host_ws = None
        self.host_user_id = None
        self.waiting_ws = dict()
        self.active_ws = dict()
        self.pending_disconnects = dict()

    def get_waiting_user_ids(self) -> list[int]:
        waiting_user_ids = list(self.waiting_ws.keys())
        waiting_user_ids.extend(
            pending.user_id
            for pending in self.pending_disconnects.values()
            if pending.state == "waiting"
        )
        return list(dict.fromkeys(waiting_user_ids))

    def get_active_user_ids(self) -> list[int]:
        active_user_ids = list(self.active_ws.keys())
        if self.host_user_id is not None and self.host_user_id not in active_user_ids:
            active_user_ids.append(self.host_user_id)
        active_user_ids.extend(
            pending.user_id
            for pending in self.pending_disconnects.values()
            if pending.state == "active" and pending.role != "host"
        )
        return list(dict.fromkeys(active_user_ids))


class RoomManager:
    rooms: dict[str, RoomState]

    def __init__(self):
        self.rooms = {}

    def get_or_create_room(self, room_code: str) -> RoomState:
        if room_code in self.rooms:
            return self.rooms[room_code]

        room_new = RoomState()

        self.rooms[room_code] = room_new

        return room_new

    def get_room(self, room_code: str) -> RoomState | None:
        return self.rooms.get(room_code)

    def _cleanup_room_if_empty(self, room_code: str):
        room_state = self.rooms.get(room_code)
        if room_state is None:
            return

        if (
            room_state.host_ws is None
            and room_state.host_user_id is None
            and not room_state.active_ws
            and not room_state.waiting_ws
            and not room_state.pending_disconnects
        ):
            del self.rooms[room_code]

    def add_connection(
            self,
            room_code: str,
            ws: WebSocket,
            role: str,
            state: str,
            user_id: int):
        room_state: RoomState = self.get_or_create_room(room_code)
        room_state.pending_disconnects.pop(user_id, None)

        if role == "host":
            room_state.host_ws = ws
            room_state.host_user_id = user_id
        else:
            if state == "waiting":
                room_state.waiting_ws[user_id] = ws
            elif state == "active":
                room_state.active_ws[user_id] = ws
            else:
                raise ValueError(f"Invalid state: {state}")

    def get_registered_connection_state(
            self,
            room_code: str,
            ws: WebSocket,
            user_id: int,
            role: str) -> str | None:
        if room_code not in self.rooms:
            return None

        room_state: RoomState = self.rooms[room_code]

        if role == "host":
            if ws is room_state.host_ws and user_id == room_state.host_user_id:
                return "active"
            return None

        if room_state.waiting_ws.get(user_id) is ws:
            return "waiting"

        if room_state.active_ws.get(user_id) is ws:
            return "active"

        return None

    def remove_connection(self, room_code: str, ws: WebSocket, user_id: int):
        if room_code not in self.rooms:
            return

        room_state: RoomState = self.rooms[room_code]
        room_active: dict[int, WebSocket] = room_state.active_ws
        room_waiting: dict[int, WebSocket] = room_state.waiting_ws

        if ws is room_state.host_ws and user_id == room_state.host_user_id:
            room_state.host_ws = None
            room_state.host_user_id = None

        if room_active.get(user_id) is ws:
            room_active.pop(user_id, None)

        if room_waiting.get(user_id) is ws:
            room_waiting.pop(user_id, None)

        room_state.pending_disconnects.pop(user_id, None)
        self._cleanup_room_if_empty(room_code)

    def begin_disconnect_grace(
            self,
            room_code: str,
            ws: WebSocket,
            user_id: int,
            role: str,
            state: str,
            grace_period_seconds: int) -> PendingDisconnect | None:
        if room_code not in self.rooms:
            return None

        room_state: RoomState = self.rooms[room_code]

        if role == "host":
            if ws is not room_state.host_ws or user_id != room_state.host_user_id:
                return None
            room_state.host_ws = None
        elif state == "waiting":
            if room_state.waiting_ws.get(user_id) is not ws:
                return None
            room_state.waiting_ws.pop(user_id, None)
        elif state == "active":
            if room_state.active_ws.get(user_id) is not ws:
                return None
            room_state.active_ws.pop(user_id, None)
        else:
            return None

        pending_disconnect = PendingDisconnect(
            user_id=user_id,
            role=role,
            state=state,
            expires_at=datetime.utcnow() + timedelta(seconds=grace_period_seconds),
            disconnect_id=secrets.token_urlsafe(8),
        )
        room_state.pending_disconnects[user_id] = pending_disconnect
        return pending_disconnect

    def is_waiting_user(self, room_code: str, user_id: int) -> bool:
        room_state = self.rooms.get(room_code)
        if room_state is None:
            return False

        if user_id in room_state.waiting_ws:
            return True

        pending_disconnect = room_state.pending_disconnects.get(user_id)
        if pending_disconnect is None:
            return False

        return pending_disconnect.state == "waiting"

    def finalize_pending_disconnect(
            self,
            room_code: str,
            user_id: int,
            disconnect_id: str) -> PendingDisconnect | None:
        room_state = self.rooms.get(room_code)
        if room_state is None:
            return None

        pending_disconnect = room_state.pending_disconnects.get(user_id)
        if pending_disconnect is None:
            return None

        if pending_disconnect.disconnect_id != disconnect_id:
            return None

        if pending_disconnect.expires_at > datetime.utcnow():
            return None

        room_state.pending_disconnects.pop(user_id, None)

        if (
            pending_disconnect.role == "host"
            and room_state.host_ws is None
            and room_state.host_user_id == user_id
        ):
            room_state.host_user_id = None

        self._cleanup_room_if_empty(room_code)
        return pending_disconnect

    def approve_user(self, room_code: str, user_id: int) -> tuple[bool, WebSocket | None]:
        if room_code not in self.rooms:
            return (False, None)

        room_state: RoomState = self.rooms[room_code]
        room_active: dict[int, WebSocket] = room_state.active_ws
        room_waiting: dict[int, WebSocket] = room_state.waiting_ws

        if user_id in room_waiting:
            room_active[user_id] = room_waiting[user_id]
            room_waiting.pop(user_id)
            return (True, room_active[user_id])

        pending_disconnect = room_state.pending_disconnects.get(user_id)
        if pending_disconnect is not None and pending_disconnect.state == "waiting":
            pending_disconnect.state = "active"
            return (True, None)

        return (False, None)

    def reject_user(self, room_code: str, user_id: int) -> tuple[bool, WebSocket | None]:
        if room_code not in self.rooms:
            return (False, None)

        room_state: RoomState = self.rooms[room_code]
        room_waiting: dict[int, WebSocket] = room_state.waiting_ws

        if user_id in room_waiting:
            ws_remove: WebSocket = room_waiting[user_id]
            room_waiting.pop(user_id)
            self._cleanup_room_if_empty(room_code)
            return (True, ws_remove)

        pending_disconnect = room_state.pending_disconnects.get(user_id)
        if pending_disconnect is not None and pending_disconnect.state == "waiting":
            room_state.pending_disconnects.pop(user_id, None)
            self._cleanup_room_if_empty(room_code)
            return (True, None)

        return (False, None)

    def replace_connection(
            self,
            room_code: str,
            user_id: int,
            new_ws: WebSocket,
            role: str) -> WebSocket | None:
        if room_code not in self.rooms:
            return None

        room_state: RoomState = self.rooms[room_code]

        if role == "host":
            if (
                room_state.host_ws is not None
                and room_state.host_user_id == user_id
                and room_state.host_ws is not new_ws
            ):
                old_ws = room_state.host_ws
                room_state.host_ws = None
                room_state.host_user_id = None
                return old_ws
        else:
            if user_id in room_state.waiting_ws:
                old_ws = room_state.waiting_ws.pop(user_id)
                return old_ws

            elif user_id in room_state.active_ws:
                old_ws = room_state.active_ws.pop(user_id)
                return old_ws

    def remove_user_and_get_ws(
            self, room_code: str, user_id: int) -> tuple[str, WebSocket | None] | None:
        if room_code not in self.rooms:
            return None

        room_state: RoomState = self.rooms[room_code]

        if user_id in room_state.waiting_ws:
            ws_remove: WebSocket = room_state.waiting_ws.pop(user_id)
            self._cleanup_room_if_empty(room_code)
            return ("waiting", ws_remove)

        elif user_id in room_state.active_ws:
            ws_remove: WebSocket = room_state.active_ws.pop(user_id)
            self._cleanup_room_if_empty(room_code)
            return ("active", ws_remove)

        pending_disconnect = room_state.pending_disconnects.get(user_id)
        if pending_disconnect is not None:
            room_state.pending_disconnects.pop(user_id, None)
            if (
                pending_disconnect.role == "host"
                and room_state.host_ws is None
                and room_state.host_user_id == user_id
            ):
                room_state.host_user_id = None
            self._cleanup_room_if_empty(room_code)
            return (pending_disconnect.state, None)

        return None
