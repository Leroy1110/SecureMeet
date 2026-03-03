import logging
import json
from sqlalchemy.orm import Session
from app.db.models import EventLog

def log_event(db: Session, *, event_type: str, room_id: int | None, user_id: int | None, data: dict | None = None) -> None:
    try:
        event = EventLog(
            room_id=room_id,
            user_id=user_id,
            event_type=event_type,
            data_json=json.dumps(data) if data is not None else None
        )
        db.add(event)
        db.commit()
        db.refresh(event)
    except Exception as e:
        logging.exception(f"Failed to log event: {e}")
        db.rollback()