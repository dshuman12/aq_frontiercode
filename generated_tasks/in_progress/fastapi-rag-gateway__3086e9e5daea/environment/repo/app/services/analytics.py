"""Analytics service.

Provides aggregate counts and time-bucketed statistics over the gateway's
core tables. Designed to be cheap enough to render on an admin dashboard
yet flexible enough to power downstream BI tools when paired with the
audit log.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from datetime import datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import utc_now
from app.models.audit_log import AuditLog
from app.models.conversation import Conversation
from app.models.document import Document
from app.models.ingestion_job import IngestionJob
from app.models.message import Message
from app.models.user import User


@dataclass(slots=True)
class CountReport:
    users: int = 0
    active_users: int = 0
    documents: int = 0
    indexed_documents: int = 0
    chunks: int = 0
    conversations: int = 0
    messages: int = 0
    audit_events: int = 0


@dataclass(slots=True)
class TimeSeriesPoint:
    timestamp: datetime
    value: float


@dataclass(slots=True)
class IngestionReport:
    success: int = 0
    failed: int = 0
    pending: int = 0
    average_duration_ms: float | None = None
    busiest_day: TimeSeriesPoint | None = None


@dataclass(slots=True)
class ActivityReport:
    daily_messages: list[TimeSeriesPoint] = field(default_factory=list)
    daily_uploads: list[TimeSeriesPoint] = field(default_factory=list)


class AnalyticsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def counts(self) -> CountReport:
        users = await self._count(User)
        active_users = await self._count(User, User.is_active.is_(True))
        documents = await self._count(Document, Document.deleted_at.is_(None))
        indexed = await self._count(
            Document,
            Document.deleted_at.is_(None),
            Document.status == "indexed",
        )
        chunks_total = (
            await self.session.execute(select(func.coalesce(func.sum(Document.chunk_count), 0)))
        ).scalar_one()
        conversations = await self._count(Conversation, Conversation.deleted_at.is_(None))
        messages = await self._count(Message)
        audit = await self._count(AuditLog)
        return CountReport(
            users=int(users),
            active_users=int(active_users),
            documents=int(documents),
            indexed_documents=int(indexed),
            chunks=int(chunks_total or 0),
            conversations=int(conversations),
            messages=int(messages),
            audit_events=int(audit),
        )

    async def ingestion(self) -> IngestionReport:
        success = await self._count(IngestionJob, IngestionJob.status == "succeeded")
        failed = await self._count(IngestionJob, IngestionJob.status == "failed")
        pending = await self._count(IngestionJob, IngestionJob.status.in_(("pending", "running")))
        avg_duration = (
            await self.session.execute(select(func.avg(IngestionJob.attempt)))
        ).scalar_one()
        return IngestionReport(
            success=int(success),
            failed=int(failed),
            pending=int(pending),
            average_duration_ms=float(avg_duration) if avg_duration else None,
        )

    async def activity(self, days: int = 14) -> ActivityReport:
        since = utc_now() - timedelta(days=days)
        message_rows = (
            await self.session.execute(
                select(
                    func.date_trunc("day", Message.created_at).label("bucket"),
                    func.count(Message.id),
                )
                .where(Message.created_at >= since)
                .group_by("bucket")
            )
        ).all()
        upload_rows = (
            await self.session.execute(
                select(
                    func.date_trunc("day", Document.created_at).label("bucket"),
                    func.count(Document.id),
                )
                .where(Document.created_at >= since, Document.deleted_at.is_(None))
                .group_by("bucket")
            )
        ).all()
        return ActivityReport(
            daily_messages=list(_to_series(message_rows)),
            daily_uploads=list(_to_series(upload_rows)),
        )

    # ------------------------------------------------------------------

    async def _count(self, model, *whereclauses) -> int:
        stmt = select(func.count()).select_from(model)
        if whereclauses:
            stmt = stmt.where(*whereclauses)
        try:
            result = await self.session.execute(stmt)
        except Exception:  # pragma: no cover - SQLite without date_trunc
            return 0
        return int(result.scalar_one())


def _to_series(rows: Iterable[tuple[datetime, int]]) -> Iterable[TimeSeriesPoint]:
    for timestamp, value in rows:
        if isinstance(timestamp, datetime):
            yield TimeSeriesPoint(timestamp=timestamp, value=float(value))


__all__ = [
    "ActivityReport",
    "AnalyticsService",
    "CountReport",
    "IngestionReport",
    "TimeSeriesPoint",
]
