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

def get_current_user(db: Session = Depends(get_db), authorization: str = Header(default=None)) -> User:
    if authorization is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing or invalid Authorization header")
    
    try:
        token_value = get_token_from_header(authorization)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))
    
    try:
        payload = decode_access_token(token_value)
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id: int = payload.get("user_id")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    
    user_query = db.query(User).filter(User.id == user_id).first()
    if user_query is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return user_query