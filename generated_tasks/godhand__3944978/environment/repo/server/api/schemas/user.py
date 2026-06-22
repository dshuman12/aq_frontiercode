from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from server.external.db.models.user import User as UserModel


class PublicUser(BaseModel):
    model_config = ConfigDict(populate_by_name=True, from_attributes=True)

    id: str = Field(alias="_id")
    username: str
    email: EmailStr
    google_email: EmailStr | None = None
    google_linked: bool = False
    created_at: datetime
    updated_at: datetime


def to_public_user(user: UserModel) -> PublicUser:
    payload = user.model_dump(by_alias=True, exclude_none=False)
    payload["google_linked"] = bool(getattr(user, "google_subject", None))
    payload["google_email"] = getattr(user, "google_email", None)
    return PublicUser.model_validate(payload)
