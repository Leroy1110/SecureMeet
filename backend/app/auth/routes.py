from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth.schemas import UserRegistrationRequest, UserResponse, UserLoginRequest, Token
from app.auth.service import register_user, login_user
from app.db.session import get_db

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