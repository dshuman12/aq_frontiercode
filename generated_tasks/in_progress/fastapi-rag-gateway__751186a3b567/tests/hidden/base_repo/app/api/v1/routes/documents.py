"""Document endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import current_user, db_session, get_app_settings, page_params
from app.api.responses import to_envelope
from app.core.config import Settings
from app.core.pagination import PageRequest
from app.models.user import User
from app.schemas.common import PageEnvelope, StatusResponse
from app.schemas.document import DocumentCreate, DocumentOut, DocumentUpdate
from app.services.documents import DocumentService
from app.services.ingestion import IngestionService

router = APIRouter()


@router.get("/", response_model=PageEnvelope[DocumentOut])
async def list_documents(
    request: PageRequest = Depends(page_params),
    statuses: list[str] | None = Query(default=None),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> PageEnvelope[DocumentOut]:
    service = DocumentService(session)
    page = await service.list(user.id, request, statuses=statuses)
    items = [DocumentOut.model_validate(item) for item in page.items]
    return to_envelope(page, items)


@router.post("/", response_model=DocumentOut, status_code=201)
async def create_document(
    payload: DocumentCreate,
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> DocumentOut:
    service = IngestionService(session, settings=settings)
    if payload.source_uri and payload.source_uri.startswith(("http://", "https://")):
        result = await service.ingest_url(
            payload.source_uri,
            owner_id=user.id,
            title=payload.title,
            tags=payload.tags,
            metadata=payload.metadata,
        )
    else:
        result = await service.ingest_text(
            payload.text or payload.description or "",
            owner_id=user.id,
            title=payload.title,
            tags=payload.tags,
            metadata=payload.metadata,
        )
    await session.commit()
    return DocumentOut.model_validate(result.document)


@router.post("/upload", response_model=DocumentOut, status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Query(default=None),
    user: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
    settings: Settings = Depends(get_app_settings),
) -> DocumentOut:
    payload = await file.read()
    text = payload.decode("utf-8", errors="replace")
    service = IngestionService(session, settings=settings)
    result = await service.ingest_text(
        text,
        owner_id=user.id,
        title=title or file.filename or "uploaded",
    )
    await session.commit()
    return DocumentOut.model_validate(result.document)


@router.get("/{document_id}", response_model=DocumentOut)
async def read_document(
    document_id: str,
    _: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> DocumentOut:
    service = DocumentService(session)
    document = await service.get(document_id)
    return DocumentOut.model_validate(document)


@router.patch("/{document_id}", response_model=DocumentOut)
async def update_document(
    document_id: str,
    payload: DocumentUpdate,
    _: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> DocumentOut:
    service = DocumentService(session)
    document = await service.update(document_id, payload)
    await session.commit()
    return DocumentOut.model_validate(document)


@router.delete("/{document_id}", response_model=StatusResponse)
async def delete_document(
    document_id: str,
    _: User = Depends(current_user),
    session: AsyncSession = Depends(db_session),
) -> StatusResponse:
    service = DocumentService(session)
    await service.delete(document_id)
    await session.commit()
    return StatusResponse(status="ok", message="Document scheduled for deletion")


__all__ = ["router"]
