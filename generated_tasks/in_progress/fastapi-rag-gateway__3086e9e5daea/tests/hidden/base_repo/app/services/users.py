"""User-management service."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictError, NotFoundError
from app.core.pagination import Page, PageRequest
from app.core.security import hash_password, utc_now
from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


class UserService:
    """Business logic for users."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)

    async def get(self, user_id: str) -> User:
        return await self.users.get_or_404(user_id)

    async def get_by_email(self, email: str) -> User | None:
        return await self.users.get_by_email(email)

    async def create(self, payload: UserCreate, *, is_superuser: bool = False) -> User:
        existing = await self.users.get_by_email(payload.email)
        if existing is not None:
            raise ConflictError(
                f"A user with email {payload.email!r} already exists.",
                details={"email": payload.email},
            )
        user = User(
            email=payload.email.lower(),
            full_name=payload.full_name,
            hashed_password=hash_password(payload.password),
            roles=list(_normalise_roles(payload.roles, is_superuser=is_superuser)),
            is_active=True,
            is_superuser=is_superuser,
            is_verified=is_superuser,
        )
        await self.users.create(user)
        return user

    async def update(self, user_id: str, payload: UserUpdate) -> User:
        user = await self.users.get_or_404(user_id)
        if payload.full_name is not None:
            user.full_name = payload.full_name
        if payload.is_active is not None:
            user.is_active = payload.is_active
        if payload.roles is not None:
            user.roles = list(payload.roles)
        if payload.preferences is not None:
            user.preferences = dict(payload.preferences)
        await self.session.flush()
        return user

    async def deactivate(self, user_id: str) -> User:
        user = await self.users.get_or_404(user_id)
        return await self.users.deactivate(user)

    async def list(self, request: PageRequest, *, query: str | None = None) -> Page[User]:
        if query:
            return await self.users.search(query, request)
        return await self.users.list_active(request)

    async def set_password(self, user_id: str, new_password: str) -> User:
        user = await self.users.get_or_404(user_id)
        user.hashed_password = hash_password(new_password)
        user.password_changed_at = utc_now()
        await self.session.flush()
        return user

    async def mark_logged_in(
        self, user: User, *, ip: str | None, when: datetime | None = None
    ) -> User:
        return await self.users.update_last_login(user, ip=ip, when=when or utc_now())

    async def ensure_default_admin(self, *, email: str, password: str) -> User:
        existing = await self.users.get_by_email(email)
        if existing is not None:
            if not existing.is_superuser:
                existing.is_superuser = True
                await self.session.flush()
            return existing
        return await self.create(
            UserCreate(email=email, password=password, roles=["admin"]),
            is_superuser=True,
        )

    async def must_exist(self, user_id: str) -> User:
        user = await self.users.get(user_id)
        if user is None:
            raise NotFoundError(f"User {user_id!r} not found.")
        return user


def _normalise_roles(roles: Iterable[str], *, is_superuser: bool) -> list[str]:
    out = sorted({role.strip().lower() for role in roles if role and role.strip()})
    if is_superuser and "admin" not in out:
        out.append("admin")
    return out


__all__ = ["UserService"]
