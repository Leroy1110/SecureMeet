from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError
from app.auth.security import decode_access_token
from app.db.session import get_db
from app.db.models import User

def get_token_from_header(authorization: str) -> str:
    if authorization is None:
        raise ValueError("Authorization header is missing")
    if authorization.strip() == "":
        raise ValueError("Authorization header cannot be empty")

    token_list = authorization.split()

    if len(token_list) != 2:
        raise ValueError("Invalid Authorization header format")
    
    token_first_value = token_list[0].lower()

    if token_first_value != "bearer":
        raise ValueError("Authorization header must start with 'Bearer'")
    
    token_value = token_list[1].strip()
    return token_value