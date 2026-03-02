from cryptography.fernet import Fernet

def generate_room_key() -> bytes:
    return Fernet.generate_key()

def encrypt_message(plaintext: str, room_key: bytes) -> str:
    if not isinstance(plaintext, str):
        raise TypeError("plaintext must be str")
    if not isinstance(room_key, (bytes, bytearray)):
        raise TypeError("room_key must be bytes")
    
    f = Fernet(bytes(room_key))
    token: bytes = f.encrypt(plaintext.encode("utf-8"))
    return token.decode("utf-8")

def decrypt_message(token: str, room_key: bytes) -> str:
    if not isinstance(token, str):
        raise TypeError("token must be str")
    if not isinstance(room_key, (bytes, bytearray)):
        raise TypeError("room_key must be bytes")
    
    f = Fernet(bytes(room_key))
    plaintext_bytes: bytes = f.decrypt(token.encode("utf-8"))
    return plaintext_bytes.decode("utf-8")