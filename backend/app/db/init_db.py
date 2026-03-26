from app.db.base import Base
from app.db.session import engine
from sqlalchemy import inspect, text


def _ensure_room_member_display_name_column() -> None:
    inspector = inspect(engine)
    room_member_columns = {column["name"]
                           for column in inspector.get_columns("room_members")}

    if "display_name" in room_member_columns:
        return

    with engine.begin() as connection:
        connection.execute(
            text(
                "ALTER TABLE room_members ADD COLUMN display_name "
                "VARCHAR(64) NOT NULL DEFAULT ''"
            )
        )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _ensure_room_member_display_name_column()
