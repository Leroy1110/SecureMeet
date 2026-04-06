from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.sql import func
from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_code = Column(String(100), unique=True, index=True, nullable=False)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    password_hash = Column(String, nullable=False)
    max_participants = Column(Integer, nullable=False, default=10)
    status = Column(String(30), nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    expires_at = Column(DateTime, nullable=False)
    encryption_key_encrypted = Column(String, nullable=False)


class RoomMember(Base):
    __tablename__ = "room_members"
    __table_args__ = (
        CheckConstraint(
            "role IN ('host', 'participant')",
            name="ck_room_members_role_valid",
        ),
        CheckConstraint(
            "state IN ('waiting', 'active', 'left', 'kicked', 'rejected')",
            name="ck_room_members_state_valid",
        ),
        CheckConstraint(
            "("
            "(state IN ('waiting', 'active') AND left_at IS NULL)"
            " OR "
            "(state IN ('left', 'kicked', 'rejected') AND left_at IS NOT NULL)"
            ")",
            name="ck_room_members_left_at_lifecycle",
        ),
        Index(
            "ix_room_members_room_user_latest",
            "room_id",
            "user_id",
            "id",
        ),
        Index(
            "uq_room_members_single_live_membership",
            "room_id",
            "user_id",
            unique=True,
            sqlite_where=text("state IN ('waiting', 'active')"),
            postgresql_where=text("state IN ('waiting', 'active')"),
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    display_name = Column(String(64), nullable=False, default="")
    role = Column(String, nullable=False)
    state = Column(String, nullable=False)
    joined_at = Column(DateTime, nullable=True)
    left_at = Column(DateTime, nullable=True)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False, index=True)
    from_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    content_encrypted = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=func.now())
    msg_type = Column(String, nullable=False)


class EventLog(Base):
    __tablename__ = "events_log"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    event_type = Column(String, nullable=False)
    data_json = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=func.now())
