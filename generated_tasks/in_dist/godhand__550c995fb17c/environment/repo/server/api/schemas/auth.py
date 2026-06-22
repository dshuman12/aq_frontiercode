from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator

from server.api.schemas.user import PublicUser
from server.utils.constants import ValidationConstraints


class RegisterRequest(BaseModel):
    username: str | None = Field(
        default=None,
        min_length=ValidationConstraints.USERNAME_MIN_LENGTH,
        max_length=ValidationConstraints.USERNAME_MAX_LENGTH,
    )
    email: EmailStr
    password: str = Field(min_length=1)


class LoginRequest(BaseModel):
    identifier: str | None = Field(default=None, min_length=1)
    email: EmailStr | None = None
    password: str = Field(min_length=1)

    @model_validator(mode="after")
    def normalize_identifier(self) -> "LoginRequest":
        identifier = (self.identifier or self.email or "").strip()
        if not identifier:
            raise ValueError("identifier is required")
        self.identifier = identifier
        return self


class UpdateUsernameRequest(BaseModel):
    username: str = Field(
        min_length=ValidationConstraints.USERNAME_MIN_LENGTH,
        max_length=ValidationConstraints.USERNAME_MAX_LENGTH,
    )

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: str) -> str:
        return str(value).strip().lower()


class UserResponse(BaseModel):
    user: PublicUser


class RegisterResponse(BaseModel):
    message: str
    user: PublicUser


class OAuthLinkStartResponse(BaseModel):
    url: str
