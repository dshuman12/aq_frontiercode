"""User repository."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime

from sqlalchemy import or_, select

from app.core.pagination import Page, PageRequest
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Persistence operations for :class:`User`."""

    model = User

    async def get_by_email(self, email: str) -> User | None:
        return await self.find_one(User.email == email.lower())

    async def list_active(self, request: PageRequest) -> Page[User]:
        return await self.page(
            request,
            User.is_active.is_(True),
            order_by=(User.created_at.desc(),),
        )

    async def search(self, query: str, request: PageRequest) -> Page[User]:
        like = f"%{query.strip().lower()}%"
        return await self.page(
            request,
            or_(
                User.email.ilike(like),
                User.full_name.ilike(like),
            ),
            order_by=(User.created_at.desc(),),
        )

    async def update_last_login(self, user: User, *, ip: str | None, when: datetime) -> User:
        user.last_login_at = when
        user.last_login_ip = ip
        await self.session.flush()
        return user

    async def deactivate(self, user: User) -> User:
        user.is_active = False
        await self.session.flush()
        return user

    async def superusers(self) -> Sequence[User]:
        result = await self.session.execute(select(User).where(User.is_superuser.is_(True)))
        return result.scalars().all()
