from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.auth.schemas import UserRegistrationRequest, UserResponse
from app.auth.service import register_user
from app.db.session import get_db

router = APIRouter()

@router.post("/auth/register")
def register(payload: UserRegistrationRequest, db: Session = Depends(get_db)):
    new_user = register_user(
        db=db,
        email=payload.email,
        username=payload.username,
        password=payload.password
    )

    response_user = UserResponse(new_user.email, new_user.username, new_user.id, new_user.created_at)
    return response_user