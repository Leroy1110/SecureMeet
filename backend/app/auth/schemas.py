from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserRegistrationRequest(UserBase):
    password: str

class UserResponse(UserBase):
    id: int
    created_at: datetime