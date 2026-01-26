from fastapi import WebSocket

class RoomState:
    host_ws: WebSocket | None
    waiting_ws: set[WebSocket]
    active_ws: set[WebSocket]

    def __init__(self):
        self.host_ws = None
        self.waiting_ws = set()
        self.active_ws = set()

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