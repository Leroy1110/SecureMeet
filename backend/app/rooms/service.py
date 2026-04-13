from datetime import datetime, timedelta
import secrets

from sqlalchemy import func, select, update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.security import create_room_token, hash_password, verify_password
from app.config import ROOM_DEFAULT_DURATION_HOURS
from app.crypto.rsa import encrypt_room_key
from app.crypto.symmetric import generate_room_key
from app.db.models import Room, RoomMember, User
from app.rooms.schemas import normalize_room_display_name


def get_latest_room_member(
        db: Session,
        room_id: int,
        user_id: int) -> RoomMember | None:
    return (
        db.query(RoomMember)
        .filter(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id,
        )
        .order_by(RoomMember.id.desc())
        .first()
    )


def get_latest_room_members_map(
        db: Session,
        room_id: int,
        user_ids: list[int]) -> dict[int, RoomMember]:
    normalized_user_ids = list(dict.fromkeys(user_ids))
    if not normalized_user_ids:
        return {}

    latest_members_subquery = (
        db.query(
            RoomMember.user_id.label("user_id"),
            func.max(RoomMember.id).label("latest_id"),
        )
        .filter(
            RoomMember.room_id == room_id,
            RoomMember.user_id.in_(normalized_user_ids),
        )
        .group_by(RoomMember.user_id)
        .subquery()
    )

    latest_members = (
        db.query(RoomMember)
        .join(
            latest_members_subquery,
            RoomMember.id == latest_members_subquery.c.latest_id,
        )
        .all()
    )

    return {member.user_id: member for member in latest_members}


def count_current_active_members(db: Session, room_id: int) -> int:
    latest_members_subquery = (
        db.query(
            RoomMember.user_id.label("user_id"),
            func.max(RoomMember.id).label("latest_id"),
        )
        .filter(RoomMember.room_id == room_id)
        .group_by(RoomMember.user_id)
        .subquery()
    )

    return (
        db.query(RoomMember)
        .join(
            latest_members_subquery,
            RoomMember.id == latest_members_subquery.c.latest_id,
        )
        .filter(RoomMember.state == "active")
        .count()
    )


def _resolve_display_name_for_user(
        db: Session,
        user_id: int,
        requested_display_name: str | None) -> str:
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

    expires_at = datetime.utcnow() + timedelta(hours=ROOM_DEFAULT_DURATION_HOURS)

    new_room = Room(
        room_code=room_code,
        host_id=host_user_id,
        password_hash=password_hash,
        status="active",
        expires_at=expires_at,
        encryption_key_encrypted=encrypted_room_key,
    )

    try:
        resolved_host_display_name = _resolve_display_name_for_user(
            db, host_user_id, host_display_name)
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
            },
            expires_delta=expires_at - datetime.utcnow(),
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

    latest_room_member = get_latest_room_member(db, room.id, user_id)
    if (
        latest_room_member is not None
        and latest_room_member.state in {"active", "waiting"}
    ):
        raise ValueError("Already joined")

    count_members = count_current_active_members(db, room.id)
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
            },
            expires_delta=room.expires_at - datetime.utcnow(),
        )

        return room_token_data
    except SQLAlchemyError as error:
        db.rollback()
        raise RuntimeError("Failed to join room") from error


def update_room_member_display_name(
        db: Session,
        room_code: str,
        user_id: int,
        display_name: str) -> str:
    normalized_room_code = room_code.strip()
    normalized_display_name = normalize_room_display_name(display_name)

    if normalized_display_name is None:
        raise ValueError("Display name is required.")

    room = db.query(Room).filter(Room.room_code == normalized_room_code).first()
    if room is None:
        raise ValueError("Room not found")

    room_member = get_latest_room_member(db, room.id, user_id)

    if room_member is None or room_member.state not in {"waiting", "active"}:
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
    if new_state not in ["active", "rejected"]:
        raise ValueError("Invalid state")

    updated_left_at = left_at
    if new_state == "rejected":
        updated_left_at = left_at or datetime.utcnow()

    latest_id_subquery = (
        select(func.max(RoomMember.id))
        .where(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id,
        )
        .scalar_subquery()
    )

    try:
        update_result = db.execute(
            update(RoomMember)
            .where(
                RoomMember.id == latest_id_subquery,
                RoomMember.state == "waiting",
            )
            .values(
                state=new_state,
                left_at=updated_left_at,
            )
        )

        if update_result.rowcount != 1:
            db.rollback()
            latest_room_member = get_latest_room_member(db, room_id, user_id)
            if latest_room_member is None:
                raise ValueError("RoomMember not found")
            raise ValueError("User is not in waiting state")

        db.commit()
        return True
    except SQLAlchemyError:
        db.rollback()
        raise RuntimeError("Failed to change user state")


def mark_member_left(db: Session, room_id: int, user_id: int) -> None:
    latest_id_subquery = (
        select(func.max(RoomMember.id))
        .where(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id,
        )
        .scalar_subquery()
    )

    try:
        update_result = db.execute(
            update(RoomMember)
            .where(
                RoomMember.id == latest_id_subquery,
                RoomMember.state.notin_(["left", "kicked", "rejected"]),
            )
            .values(
                state="left",
                left_at=datetime.utcnow(),
            )
        )

        if update_result.rowcount == 1:
            db.commit()
        else:
            db.rollback()
    except SQLAlchemyError:
        db.rollback()
        return


def mark_member_kicked(db: Session, room_id: int, user_id: int) -> None:
    latest_id_subquery = (
        select(func.max(RoomMember.id))
        .where(
            RoomMember.room_id == room_id,
            RoomMember.user_id == user_id,
        )
        .scalar_subquery()
    )

    try:
        update_result = db.execute(
            update(RoomMember)
            .where(
                RoomMember.id == latest_id_subquery,
                RoomMember.state.notin_(["left", "kicked", "rejected"]),
            )
            .values(
                state="kicked",
                left_at=datetime.utcnow(),
            )
        )

        if update_result.rowcount == 1:
            db.commit()
        else:
            db.rollback()
    except SQLAlchemyError:
        db.rollback()
        return
