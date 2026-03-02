from fastapi import WebSocket

class RoomState:
    host_ws: WebSocket | None
    host_user_id: int | None
    waiting_ws: dict[int, WebSocket]
    active_ws: dict[int, WebSocket]

    def __init__(self):
        self.host_ws = None
        self.host_user_id = None
        self.waiting_ws = dict()
        self.active_ws = dict()

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

    def add_connection(self, room_code: str, ws: WebSocket, role: str, state: str, user_id: int):
        room_state: RoomState = self.get_or_create_room(room_code)

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
    
    def remove_connection(self, room_code: str, ws: WebSocket, user_id: int):
        if not room_code in self.rooms:
            return
        
        room_state: RoomState = self.rooms[room_code]
        room_active: dict[int, WebSocket] = room_state.active_ws
        room_waiting: dict[int, WebSocket] = room_state.waiting_ws

        if ws is room_state.host_ws or user_id == room_state.host_user_id:
            room_state.host_ws = None
            room_state.host_user_id = None
        
        room_active.pop(user_id, None)
        room_waiting.pop(user_id, None)
        
        if room_state.host_ws is None and not room_active and not room_waiting:
            del self.rooms[room_code]
    
    def approve_user(self, room_code: str, user_id: int) -> WebSocket | None:
        if room_code not in self.rooms:
            return
        
        room_state: RoomState = self.rooms[room_code]
        room_active: dict[int, WebSocket] = room_state.active_ws
        room_waiting: dict[int, WebSocket] = room_state.waiting_ws

        if user_id in room_waiting:
            room_active[user_id] = room_waiting[user_id]
            room_waiting.pop(user_id)

            return room_active[user_id]
        
        return None
    
    def reject_user(self, room_code: str, user_id: int) -> WebSocket | None:
        if room_code not in self.rooms:
            return
        
        room_state: RoomState = self.rooms[room_code]
        room_waiting: dict[int, WebSocket] = room_state.waiting_ws

        if user_id in room_waiting:
            ws_remove: WebSocket = room_waiting[user_id]
            room_waiting.pop(user_id)

            return ws_remove
        
        return None
    
    def replace_connection(self, room_code: str, user_id: int, new_ws: WebSocket, role: str) -> WebSocket | None:
        if room_code not in self.rooms:
            return None
        
        room_state: RoomState = self.rooms[room_code]

        if role == "host":
            if room_state.host_ws is not None and room_state.host_user_id == user_id and room_state.host_ws is not new_ws:
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