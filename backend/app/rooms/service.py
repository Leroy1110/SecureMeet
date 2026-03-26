from datetime import datetime, timedelta
import secrets

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.security import create_room_token, hash_password, verify_password
from app.crypto.rsa import encrypt_room_key
from app.crypto.symmetric import generate_room_key
from app.db.models import Room, RoomMember, User
from app.rooms.schemas import normalize_room_display_name


def _resolve_display_name_for_user(db: Session, user_id: int, requested_display_name: str | None) -> str:
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise ValueError("User not found")

    normalized_display_name = normalize_room_display_name(requested_display_name)
    return normalized_display_name or user.username


def create_room(
    db: Session,
    host_user_id: int,
    host_display_name: str | None = None,
) -> tuple[Room, str, str]:
    room_code = secrets.token_urlsafe(8)
    while db.query(Room).filter_by(room_code=room_code).first():
        room_code = secrets.token_urlsafe(8)

    room_password = secrets.token_urlsafe(12)
    password_hash = hash_password(room_password)

    room_key = generate_room_key()
    encrypted_room_key = encrypt_room_key(room_key)

    expires_at = datetime.utcnow() + timedelta(hours=2)

    new_room = Room(
        room_code=room_code,
        host_id=host_user_id,
        password_hash=password_hash,
        status="active",
        expires_at=expires_at,
        encryption_key_encrypted=encrypted_room_key,
    )

    try:
        resolved_host_display_name = _resolve_display_name_for_user(db, host_user_id, host_display_name)
    except ValueError as error:
        raise RuntimeError(str(error)) from error

    host_member = RoomMember(
        room_id=new_room.id,
        user_id=host_user_id,
        display_name=resolved_host_display_name,
        role="host",
        state="active",
        joined_at=datetime.utcnow(),
    )

    try:
        db.add(new_room)
        db.flush()

        host_member.room_id = new_room.id
        db.add(host_member)

        db.commit()
        db.refresh(new_room)
        db.refresh(host_member)

        host_room_jwt = create_room_token(
            {
                "room_id": host_member.room_id,
                "room_code": new_room.room_code,
                "user_id": host_member.user_id,
                "role": "host",
                "state": "active",
                "display_name": host_member.display_name,
            }
        )

        return (new_room, room_password, host_room_jwt)
    except SQLAlchemyError as error:
        db.rollback()
        raise RuntimeError("Failed to create room") from error


def join_room(
    db: Session,
    user_id: int,
    room_code: str,
    room_password: str,
    display_name: str | None = None,
) -> str:
    normalized_room_code = room_code.strip()
    normalized_room_password = room_password.strip()

    room = db.query(Room).filter_by(room_code=normalized_room_code).first()
    if not room:
        raise ValueError("Room not found")

    if room.status != "active":
        raise ValueError("Room is not active")

    if room.expires_at < datetime.utcnow():
        raise ValueError("Room has expired")

    if not verify_password(normalized_room_password, room.password_hash):
        raise ValueError("Invalid room password")

    if (
        db.query(RoomMember)
        .filter(
            RoomMember.room_id == room.id,
            RoomMember.user_id == user_id,
            RoomMember.state.in_(["active", "waiting"]),
        )
        .first()
    ):
        raise ValueError("Already joined")

    count_members = db.query(RoomMember).filter_by(room_id=room.id, state="active").count()
    if count_members >= room.max_participants:
        raise ValueError("Room is full")

    resolved_display_name = _resolve_display_name_for_user(db, user_id, display_name)

    room_member = RoomMember(
        room_id=room.id,
        user_id=user_id,
        display_name=resolved_display_name,
        role="participant",
        state="waiting",
        joined_at=datetime.utcnow(),
    )

    try:
        db.add(room_member)
        db.commit()
        db.refresh(room_member)

        room_token_data = create_room_token(
            {
                "room_id": room.id,
                "room_code": normalized_room_code,
                "user_id": user_id,
                "role": room_member.role,
                "state": room_member.state,
                "display_name": room_member.display_name,
            }
        )

        return room_token_data
    except SQLAlchemyError as error:
        db.rollback()
        raise RuntimeError("Failed to join room") from error


def update_room_member_display_name(db: Session, room_code: str, user_id: int, display_name: str) -> str:
    normalized_room_code = room_code.strip()
    normalized_display_name = normalize_room_display_name(display_name)

    if normalized_display_name is None:
        raise ValueError("Display name is required.")

    room = db.query(Room).filter(Room.room_code == normalized_room_code).first()
    if room is None:
        raise ValueError("Room not found")

    room_member = (
        db.query(RoomMember)
        .filter(
            RoomMember.room_id == room.id,
            RoomMember.user_id == user_id,
            RoomMember.state.in_(["waiting", "active"]),
        )
        .first()
    )

    if room_member is None:
        raise ValueError("Room member not found")

    room_member.display_name = normalized_display_name

    try:
        db.add(room_member)
        db.commit()
        db.refresh(room_member)
        return room_member.display_name
    except SQLAlchemyError as error:
        db.rollback()
        raise RuntimeError("Failed to update display name") from error


def update_user_state(
    db: Session,
    room_id: int,
    user_id: int,
    new_state: str,
    left_at: datetime | None = None,
) -> bool:
    room_member = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == user_id).first()

    if not room_member:
        raise ValueError("RoomMember not found")

    if room_member.state != "waiting":
        raise ValueError("User is not in waiting state")

    if new_state not in ["active", "rejected"]:
        raise ValueError("Invalid state")

    room_member.state = new_state
    if left_at:
        room_member.left_at = left_at

    try:
        db.add(room_member)
        db.commit()
        db.refresh(room_member)

        return True
    except SQLAlchemyError:
        db.rollback()
        raise RuntimeError("Failed to change user state")


def mark_member_left(db: Session, room_id: int, user_id: int) -> None:
    room_member = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == user_id).first()

    if room_member is None:
        return

    if room_member.state not in ["left", "kicked", "rejected"]:
        room_member.state = "left"
        room_member.left_at = datetime.utcnow()

        try:
            db.add(room_member)
            db.commit()
            db.refresh(room_member)
        except SQLAlchemyError:
            db.rollback()
            return


def mark_member_kicked(db: Session, room_id: int, user_id: int) -> None:
    room_member = db.query(RoomMember).filter(RoomMember.room_id == room_id, RoomMember.user_id == user_id).first()

    if room_member is None:
        return

    if room_member.state not in ["left", "kicked", "rejected"]:
        room_member.state = "kicked"
        room_member.left_at = datetime.utcnow()

        try:
            db.add(room_member)
            db.commit()
            db.refresh(room_member)
        except SQLAlchemyError:
            db.rollback()
            return
