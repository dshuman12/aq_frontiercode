from __future__ import annotations

from server.external.db.models.user import User


def login_user(identifier: str, password: str) -> User | None:
    normalized_identifier = (identifier or "").strip().lower()
    if not normalized_identifier or not password:
        return None

    if "@" in normalized_identifier:
        user = User.get_by_email(normalized_identifier)
    else:
        user = User.get_by_username(normalized_identifier)

    if not user or not user.verify_password(password):
        return None
    return user
