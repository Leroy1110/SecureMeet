from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.db.models import Room, Message
from app.crypto.rsa import decrypt_room_key
from app.crypto.symmetric import encrypt_message


def get_room_key(db: Session, room_id: int) -> bytes:
    room = db.query(Room).filter(Room.id == room_id).first()
    if not room:
        raise ValueError("Room not found")
    
    encrypted = room.encryption_key_encrypted
    room_key_bytes = decrypt_room_key(encrypted)

    return room_key_bytes

def save_message(
    db: Session,
    room_id: int,
    from_user_id: int,
    to_user_id: int | None,
    content_plain: str,
    msg_type: str = "chat"
) -> Message:
    try:
        room_key = get_room_key(db=db, room_id=room_id)
    except ValueError:
        raise ValueError("Failed to get room key for message encryption")
    
    ciphertext = encrypt_message(plaintext=content_plain, room_key=room_key)
    new_message = Message(
        room_id=room_id,
        from_user_id=from_user_id,
        to_user_id=to_user_id,
        content_encrypted=ciphertext,
        msg_type=msg_type
    )

    try:
        db.add(new_message)
        db.commit()
        db.refresh(new_message)

        return new_message
    except SQLAlchemyError:
        db.rollback()
        raise RuntimeError("Failed to save message to database")