from fastapi import FastAPI
from app.db.init_db import init_db

app = FastAPI()

@app.on_event("startup")
def on_startup() -> None:
    init_db()

@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "service" : "backend"}