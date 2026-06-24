"""API key repository."""

from __future__ import annotations

from app.core.pagination import Page, PageRequest
from app.core.security import hash_api_key, utc_now
from app.models.api_key import ApiKey
from app.repositories.base import BaseRepository


class ApiKeyRepository(BaseRepository[ApiKey]):
    model = ApiKey

    async def find_by_plaintext(self, plaintext: str) -> ApiKey | None:
        if not plaintext:
            return None
        return await self.find_one(ApiKey.hashed_key == hash_api_key(plaintext))

    async def list_for_owner(self, owner_id: str, request: PageRequest) -> Page[ApiKey]:
        return await self.page(
            request,
            ApiKey.owner_id == owner_id,
            order_by=(ApiKey.created_at.desc(),),
        )

    async def revoke(self, key: ApiKey) -> ApiKey:
        key.is_active = False
        await self.session.flush()
        return key

    async def touch(self, key: ApiKey) -> ApiKey:
        key.last_used_at = utc_now()
        await self.session.flush()
        return key
