"""Audit log repository."""

from __future__ import annotations

from typing import Any

from app.core.pagination import Page, PageRequest
from app.models.audit_log import AuditLog
from app.repositories.base import BaseRepository


class AuditLogRepository(BaseRepository[AuditLog]):
    model = AuditLog

    async def record(
        self,
        *,
        action: str,
        resource_type: str,
        resource_id: str | None = None,
        actor_id: str | None = None,
        ip: str | None = None,
        user_agent: str | None = None,
        status_code: int | None = None,
        message: str | None = None,
        payload: dict | None = None,
    ) -> AuditLog:
        log = AuditLog(
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            actor_id=actor_id,
            ip=ip,
            user_agent=user_agent,
            status_code=status_code,
            message=message,
            payload=payload or {},
        )
        await self.create(log)
        return log

    async def list_recent(self, request: PageRequest, **filters: Any) -> Page[AuditLog]:
        whereclauses = []
        if "actor_id" in filters and filters["actor_id"]:
            whereclauses.append(AuditLog.actor_id == filters["actor_id"])
        if "action" in filters and filters["action"]:
            whereclauses.append(AuditLog.action == filters["action"])
        if "resource_type" in filters and filters["resource_type"]:
            whereclauses.append(AuditLog.resource_type == filters["resource_type"])
        return await self.page(
            request,
            *whereclauses,
            order_by=(AuditLog.created_at.desc(),),
        )
