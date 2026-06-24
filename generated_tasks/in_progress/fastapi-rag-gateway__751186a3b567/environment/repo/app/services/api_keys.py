"""API-key service."""

from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import Settings, get_settings
from app.core.exceptions import AuthenticationError, NotFoundError
from app.core.pagination import Page, PageRequest
from app.core.security import generate_api_key, hash_api_key
from app.models.api_key import ApiKey
from app.repositories.api_key import ApiKeyRepository
from app.schemas.api_key import ApiKeyCreate, ApiKeyUpdate


class ApiKeyService:
    def __init__(self, session: AsyncSession, *, settings: Settings | None = None) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.api_keys = ApiKeyRepository(session)

    async def create(self, owner_id: str, payload: ApiKeyCreate) -> tuple[ApiKey, str]:
        plaintext = generate_api_key(prefix=self.settings.api_key_prefix)
        prefix, last_four = _prefix_and_last_four(plaintext, prefix=self.settings.api_key_prefix)
        key = ApiKey(
            owner_id=owner_id,
            name=payload.name,
            prefix=prefix,
            last_four=last_four,
            hashed_key=hash_api_key(plaintext),
            scopes=list(payload.scopes),
            expires_at=payload.expires_at,
            is_active=True,
        )
        await self.api_keys.create(key)
        return key, plaintext

    async def list(self, owner_id: str, request: PageRequest) -> Page[ApiKey]:
        return await self.api_keys.list_for_owner(owner_id, request)

    async def update(self, owner_id: str, key_id: str, payload: ApiKeyUpdate) -> ApiKey:
        key = await self._owned(owner_id, key_id)
        if payload.name is not None:
            key.name = payload.name
        if payload.is_active is not None:
            key.is_active = payload.is_active
        if payload.scopes is not None:
            key.scopes = list(payload.scopes)
        if payload.expires_at is not None:
            key.expires_at = payload.expires_at
        await self.session.flush()
        return key

    async def revoke(self, owner_id: str, key_id: str) -> ApiKey:
        key = await self._owned(owner_id, key_id)
        return await self.api_keys.revoke(key)

    async def authenticate(self, plaintext: str) -> ApiKey:
        key = await self.api_keys.find_by_plaintext(plaintext)
        if key is None or not key.is_active:
            raise AuthenticationError("Invalid API key.")
        if key.is_expired:
            raise AuthenticationError("API key has expired.")
        await self.api_keys.touch(key)
        return key

    async def _owned(self, owner_id: str, key_id: str) -> ApiKey:
        key = await self.api_keys.get(key_id)
        if key is None or key.owner_id != owner_id:
            raise NotFoundError("API key not found.")
        return key


def _prefix_and_last_four(plaintext: str, *, prefix: str) -> tuple[str, str]:
    if plaintext.startswith(prefix + "_"):
        body = plaintext[len(prefix) + 1 :]
    else:
        body = plaintext
    return prefix, body[-4:]


__all__ = ["ApiKeyService"]
