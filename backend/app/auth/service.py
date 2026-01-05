from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.auth.security import hash_password, create_access_token, verify_password
from app.db.models import User
from app.auth.schemas import Token
import re

def email_validation(email: str) -> str:
    email = email.strip()
    email = email.lower()

    if email == "":
        raise ValueError("Email cannot be empty")
    if email.count(" ") > 0 or not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        raise ValueError("Invalid email format")
    
    return email


def register_user(db: Session, email: str , username: str, password: str) -> User:
    username = username.strip()
    email = email_validation(email=email)

    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    if username == "":
        raise ValueError("Username cannot be empty")

    if db.query(User).filter(User.email == email).first():
        raise ValueError("Email already registered")
    if db.query(User).filter(User.username == username).first():
        raise ValueError("Username already exists")
    
    hashed_password = hash_password(password)
    new_user = User(email=email, username=username, password_hash=hashed_password)
    
    try:
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except SQLAlchemyError:
        db.rollback()
        raise RuntimeError("Failed to register user")

def authenticate_user(db: Session, email: str, password: str) -> User | None:
    email = email_validation(email=email)

    login_user = db.query(User).filter(User.email == email).first()
    if login_user is None:
        return None
    
    if verify_password(password, login_user.password_hash):
        return login_user
    
    return None