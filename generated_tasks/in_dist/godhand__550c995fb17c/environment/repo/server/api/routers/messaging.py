from __future__ import annotations

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from server.api.security.jwt import JWTService
from server.api.websockets.lobby_chat import chat_service, connection_hub
from server.external.db.models.user import User
from server.domain.messaging.errors import InvalidMessageError
from server.utils.constants import HttpStatus, ResponseMessages
from server.utils.error_handlers import AuthenticationError, DomainValidationError

messaging_routes = APIRouter(prefix="/api/v1/messaging", tags=["messaging"])

class SendMessageRequest(BaseModel):
    # Raw message content (validated by domain rules in ChatService).
    text: str


@messaging_routes.get("/lobbies/{lobby_id}", status_code=HttpStatus.OK)
async def get_lobby_status(lobby_id: str):
    """Return the current participant count for a lobby."""
    count = await connection_hub.lobby_size(lobby_id)
    return JSONResponse(
        {"lobbyId": lobby_id, "count": count},
        status_code=HttpStatus.OK,
    )

@messaging_routes.post("/lobbies/{lobby_id}/messages", status_code=HttpStatus.OK)
async def send_lobby_message(lobby_id: str, payload: SendMessageRequest, request: Request):
    """Validate and broadcast a chat message from authenticated user identity."""
    claims = JWTService.require_access(request)
    user_id = str(claims.get("sub") or "")
    user = User.get_by_id(user_id)
    if not user or not user.username:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    try:
        await chat_service.send_message(lobby_id, user.username, payload.text)
    except InvalidMessageError as exc:
        raise DomainValidationError(str(exc)) from exc

    return JSONResponse(
        {
            "ok": True,
            "event": "message",
            "lobbyId": lobby_id,
            "user": user.username,
        },
        status_code=HttpStatus.OK,
    )