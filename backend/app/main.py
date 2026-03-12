from fastapi import FastAPI
from app.db.init_db import init_db
from app.auth.routes import router as auth_router
from app.rooms.routes import router as rooms_router
from app.signaling.ws import router as signaling_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(rooms_router, prefix="/rooms", tags=["rooms"])
app.include_router(signaling_router, tags=["signaling"])

@app.on_event("startup")
def on_startup() -> None:
    init_db()

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service" : "backend"}