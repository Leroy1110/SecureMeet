"""JWT token helper utilities shared across tests."""
from datetime import datetime

from jose import jwt

from app.config import JWT_ALGORITHM, JWT_SECRET_KEY


def decode_expiry(token: str) -> datetime:
    payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    return datetime.utcfromtimestamp(payload["exp"])
