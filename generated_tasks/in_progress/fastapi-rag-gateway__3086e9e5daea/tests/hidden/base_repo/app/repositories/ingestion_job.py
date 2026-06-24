"""Ingestion-job repository."""

from __future__ import annotations

from collections.abc import Sequence

from sqlalchemy import select

from app.core.security import utc_now
from app.models.ingestion_job import IngestionJob
from app.repositories.base import BaseRepository


class IngestionJobRepository(BaseRepository[IngestionJob]):
    model = IngestionJob

    async def list_for_document(self, document_id: str) -> Sequence[IngestionJob]:
        result = await self.session.execute(
            select(IngestionJob)
            .where(IngestionJob.document_id == document_id)
            .order_by(IngestionJob.created_at.desc())
        )
        return result.scalars().all()

    async def claim(self, job: IngestionJob) -> IngestionJob:
        job.status = "running"
        job.attempt += 1
        job.started_at = utc_now()
        await self.session.flush()
        return job

    async def complete(
        self,
        job: IngestionJob,
        *,
        result: dict,
        error: str | None = None,
    ) -> IngestionJob:
        job.status = "succeeded" if error is None else "failed"
        job.error = error
        job.result = result
        job.progress = 1.0
        job.finished_at = utc_now()
        await self.session.flush()
        return job
