from fastapi import WebSocket

class RoomState:
    host_ws: WebSocket | None
    waiting_ws: set[WebSocket]
    active_ws: set[WebSocket]

    def __init__(self):
        self.host_ws = None
        self.waiting_ws = set()
        self.active_ws = set()