from pydantic import BaseModel, EmailStr, Field

from server.api.schemas.user import PublicUser

class RegisterRequest(BaseModel):
    first_name: str = Field(min_length=1)
    last_name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=1)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

class ResendVerificationRequest(BaseModel):
    email: EmailStr


class UserResponse(BaseModel):
    user: PublicUser


class RegisterResponse(BaseModel):
    message: str
    user: PublicUser
