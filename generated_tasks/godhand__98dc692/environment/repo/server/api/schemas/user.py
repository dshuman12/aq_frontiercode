from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from server.external.db.models.user import User as UserModel


class PublicUser(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str = Field(alias="_id")
    username: str
    email: EmailStr
    first_name: str | None = None
    last_name: str | None = None
    is_verified: bool
    created_at: datetime
    updated_at: datetime


def to_public_user(user: UserModel) -> PublicUser:
    return PublicUser.model_validate(user, from_attributes=True)
