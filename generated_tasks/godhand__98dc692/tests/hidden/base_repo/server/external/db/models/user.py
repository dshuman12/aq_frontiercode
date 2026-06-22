from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from server.external.db.models.base import Timestamped
from server.utils.constants import ValidationConstraints
from server.external.db.mongo import MongoDBClient

from pydantic import ConfigDict, EmailStr, Field, field_validator
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash
from bson import ObjectId


class User(Timestamped):
    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    id: Optional[str] = Field(default=None, alias="_id")
    username: str = Field(
        ...,
        min_length=ValidationConstraints.USERNAME_MIN_LENGTH,
        max_length=ValidationConstraints.USERNAME_MAX_LENGTH,
        description="Unique username",
    )
    email: EmailStr = Field(..., description="User's email address")
    password: Optional[str] = Field(
        None,
        min_length=ValidationConstraints.PASSWORD_MIN_LENGTH,
        description="Hashed password recommended",
    )
    first_name: Optional[str] = Field(None, description="User's first name")
    last_name: Optional[str] = Field(None, description="User's last name")
    is_verified: bool = Field(default=False, description="Whether email verification is complete")
    email_verification_token_hash: Optional[str] = Field(
        None, description="SHA-256 hash of the active email verification token"
    )
    email_verification_token_expires_at: Optional[datetime] = Field(
        None, description="Expiration timestamp for active email verification token"
    )
    last_verification_email_sent_at: Optional[datetime] = Field(
        None, description="Timestamp of most recent verification email sent"
    )

    @field_validator("email", mode="before")
    @classmethod
    def normalize_email(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: Any) -> Any:
        if isinstance(value, str):
            return value.strip().lower()
        return value

    @classmethod
    def collection(cls):
        return MongoDBClient.get_db()["users"]

    @classmethod
    def ensure_indexes(cls) -> None:
        cls.collection().create_index([("email", ASCENDING)], unique=True, name="uniq_email")
        cls.collection().create_index([("username", ASCENDING)], unique=True, name="uniq_username")
        cls.collection().create_index(
            [("email_verification_token_hash", ASCENDING)],
            name="idx_email_verification_token_hash",
            sparse=True,
        )

    @classmethod
    def from_mongo(cls, data: dict[str, Any] | None) -> Optional["User"]:
        if not data:
            return None
        doc = dict(data)
        object_id = doc.get("_id")
        if object_id is not None:
            doc["_id"] = str(object_id)
        return cls(**doc)

    @classmethod
    def create(cls, **kwargs) -> Optional["User"]:
        cls.ensure_indexes()
        user = cls(**kwargs)
        doc = user.model_dump(by_alias=True, exclude_none=True)
        # Let MongoDB generate `_id` when absent.
        doc.pop("_id", None)
        try:
            result = cls.collection().insert_one(doc)
        except DuplicateKeyError:
            return None
        doc["_id"] = result.inserted_id
        return cls.from_mongo(doc)

    @classmethod
    def get_by_id(cls, user_id: str) -> Optional["User"]:
        if not user_id:
            return None
        try:
            object_id = ObjectId(user_id)
        except Exception:
            return None
        user = cls.collection().find_one({"_id": object_id})
        return cls.from_mongo(user)

    @classmethod
    def get_by_email(cls, email: str) -> Optional["User"]:
        normalized = (email or "").strip().lower()
        if not normalized:
            return None
        user = cls.collection().find_one({"email": normalized})
        return cls.from_mongo(user)

    @classmethod
    def get_by_username(cls, username: str) -> Optional["User"]:
        normalized = (username or "").strip().lower()
        if not normalized:
            return None
        user = cls.collection().find_one({"username": normalized})
        return cls.from_mongo(user)

    @classmethod
    def find_by_verification_token_hash(cls, token_hash: str) -> Optional["User"]:
        if not token_hash:
            return None
        user = cls.collection().find_one({"email_verification_token_hash": token_hash})
        return cls.from_mongo(user)

    def _object_id(self) -> ObjectId | None:
        try:
            return ObjectId(self.id) if self.id else None
        except Exception:
            return None

    def _apply_update(self, fields: dict[str, Any]) -> "User" | None:
        object_id = self._object_id()
        if object_id is None:
            return None

        update_fields = dict(fields)
        update_fields["updated_at"] = datetime.now(timezone.utc)
        self.collection().update_one({"_id": object_id}, {"$set": update_fields})
        refreshed = self.get_by_id(str(object_id))
        if refreshed is not None:
            self.__dict__.update(refreshed.__dict__)
        return refreshed

    def set_email_verification_token(self, token_hash: str, expires_at: datetime) -> "User" | None:
        return self._apply_update(
            {
                "email_verification_token_hash": token_hash,
                "email_verification_token_expires_at": expires_at,
                "is_verified": False,
            }
        )

    def clear_email_verification_token(self) -> "User" | None:
        return self._apply_update(
            {
                "email_verification_token_hash": None,
                "email_verification_token_expires_at": None,
            }
        )

    def mark_email_verified(self) -> "User" | None:
        return self._apply_update(
            {
                "is_verified": True,
                "email_verification_token_hash": None,
                "email_verification_token_expires_at": None,
            }
        )

    def set_last_verification_email_sent_at(self, sent_at: datetime) -> "User" | None:
        return self._apply_update({"last_verification_email_sent_at": sent_at})

    def verify_password(self, raw_password: str) -> bool:
        if not self.password or not raw_password:
            return False
        return check_password_hash(self.password, raw_password)
