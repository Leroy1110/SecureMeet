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

    def add_connection(self, room_code: str, ws: WebSocket, role: str, state: str):
        room_state: RoomState = self.get_or_create_room(room_code)

        if role == "host":
            room_state.host_ws = ws
        else:
            if state == "waiting":
                room_state.waiting_ws.add(ws)
            elif state == "active":
                room_state.active_ws.add(ws)
            else:
                raise ValueError(f"Invalid state: {state}")
    
    def remove_connection(self, room_code: str, ws: WebSocket):
        if not room_code in self.rooms:
            return
        
        room_state: RoomState = self.rooms[room_code]
        room_active: set[WebSocket] = room_state.active_ws
        room_waiting: set[WebSocket] = room_state.waiting_ws

        if ws is room_state.host_ws:
            room_state.host_ws = None
        
        room_active.discard(ws)
        room_waiting.discard(ws)
        
        if room_state.host_ws is None and not room_active and not room_waiting:
            del self.rooms[room_code]