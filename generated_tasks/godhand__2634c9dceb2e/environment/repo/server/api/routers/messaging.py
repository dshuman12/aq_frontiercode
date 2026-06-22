from __future__ import annotations

from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from server.api.websockets.lobby_chat import chat_service, connection_hub
from server.domain.messaging.errors import InvalidMessageError
from server.utils.constants import HttpStatus
from server.utils.error_handlers import DomainValidationError

messaging_routes = APIRouter(prefix="/api/v1/messaging", tags=["messaging"])


class PresenceRequest(BaseModel):
    # Optional username to include in join/leave system messages.
    username: str | None = None


class SendMessageRequest(BaseModel):
    # Display name of the sender.
    user: str = Field(min_length=1)
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


@messaging_routes.post("/lobbies/{lobby_id}/join", status_code=HttpStatus.OK)
async def join_lobby(lobby_id: str, payload: PresenceRequest):
    """Broadcast a system 'joined' event for the lobby and return an ack payload."""
    await chat_service.on_join(lobby_id, payload.username)
    count = await connection_hub.lobby_size(lobby_id)
    return JSONResponse(
        {
            "ok": True,
            "event": "join",
            "lobbyId": lobby_id,
            "username": payload.username,
            "count": count,
        },
        status_code=HttpStatus.OK,
    )


@messaging_routes.post("/lobbies/{lobby_id}/leave", status_code=HttpStatus.OK)
async def leave_lobby(lobby_id: str, payload: PresenceRequest):
    """Broadcast a system 'left' event for the lobby and return an ack payload."""
    await chat_service.on_leave(lobby_id, payload.username)
    count = await connection_hub.lobby_size(lobby_id)
    return JSONResponse(
        {
            "ok": True,
            "event": "leave",
            "lobbyId": lobby_id,
            "username": payload.username,
            "count": count,
        },
        status_code=HttpStatus.OK,
    )


@messaging_routes.post("/lobbies/{lobby_id}/messages", status_code=HttpStatus.OK)
async def send_lobby_message(lobby_id: str, payload: SendMessageRequest):
    """Validate and broadcast a chat message; map domain validation failures to HTTP 400."""
    try:
        await chat_service.send_message(lobby_id, payload.user, payload.text)
    except InvalidMessageError as exc:
        raise DomainValidationError(str(exc)) from exc

    return JSONResponse(
        {
            "ok": True,
            "event": "message",
            "lobbyId": lobby_id,
            "user": payload.user,
        },
        status_code=HttpStatus.OK,
    )
