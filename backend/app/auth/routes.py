from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth.schemas import UserRegistrationRequest, UserResponse, UserLoginRequest, Token
from app.auth.service import register_user, login_user
from app.db.session import get_db
from app.auth.deps import get_current_user
from app.db.models import User

router = APIRouter()

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegistrationRequest, db: Session = Depends(get_db)):
    try:
        new_user = register_user(
            db=db,
            email=payload.email,
            username=payload.username,
            password=payload.password
        )

        return new_user

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/login", response_model=Token, status_code=status.HTTP_200_OK)
def login(payload: UserLoginRequest, db: Session = Depends(get_db)):
    try:
        user_login = login_user(
            db=db,
            email=payload.email,
            password=payload.password
        )

        return user_login
    
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication failed")

@router.get("/me", response_model=UserResponse, status_code=status.HTTP_200_OK)
def get_me(current_user: User = Depends(get_current_user)) -> User:
    return current_user