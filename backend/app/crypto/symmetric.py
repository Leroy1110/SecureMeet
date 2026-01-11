from cryptography.fernet import Fernet

def generate_room_key() -> bytes:
    return Fernet.generate_key()