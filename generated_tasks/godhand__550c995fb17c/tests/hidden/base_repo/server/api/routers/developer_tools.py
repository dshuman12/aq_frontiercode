from __future__ import annotations

import hmac
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from server.api.websockets.lobby_chat import reset_lobby_chat_state
from server.api.websockets.lobby_game import reset_lobby_runtime_state
from server.config import get_app_config
from server.external.db.models.lobby import Lobby
from server.utils.constants import HttpStatus

developer_tools_routes = APIRouter(prefix="/api/v1/internal/developer", tags=["developer-tools"])


def _require_developer_token(x_dev_admin_token: str | None) -> None:
    cfg = get_app_config()
    if not getattr(cfg, "IS_DEV", False):
        raise HTTPException(status_code=HttpStatus.FORBIDDEN, detail="Developer tools are disabled.")

    expected = (cfg.DEV_ADMIN_TOKEN or "").strip()
    if not expected:
        raise HTTPException(
            status_code=HttpStatus.INTERNAL_SERVER_ERROR,
            detail="DEV_ADMIN_TOKEN is not configured.",
        )

    incoming = (x_dev_admin_token or "").strip()
    if not incoming or not hmac.compare_digest(incoming, expected):
        raise HTTPException(status_code=HttpStatus.UNAUTHORIZED, detail="Invalid developer token.")


class LobbyResetRequest(BaseModel):
    mode: Literal["regenerate_world", "reset_lobby"] = "regenerate_world"
    clearPopulation: bool = Field(default=False)
    disconnectReason: str = Field(default="Developer reset.")


class ServerResetRequest(BaseModel):
    clearPopulation: bool = Field(default=False)
    disconnectReason: str = Field(default="Developer reset.")


@developer_tools_routes.post("/lobbies/{lobby_id}/reset", status_code=HttpStatus.OK)
async def reset_lobby(
    lobby_id: str,
    payload: LobbyResetRequest,
    x_dev_admin_token: str | None = Header(default=None),
):
    _require_developer_token(x_dev_admin_token)
    lobby = Lobby.get_by_id(lobby_id)
    if not lobby:
        raise HTTPException(status_code=HttpStatus.NOT_FOUND, detail="Lobby not found.")

    clear_players = payload.mode == "reset_lobby"
    updated = Lobby.reset_runtime_state(
        lobby_id,
        clear_players=clear_players,
        clear_population=bool(payload.clearPopulation),
        clear_world_snapshot=True,
    )
    if not updated:
        raise HTTPException(status_code=HttpStatus.INTERNAL_SERVER_ERROR, detail="Failed to reset lobby state.")

    game_reset = await reset_lobby_runtime_state(lobby_id, disconnect_reason=payload.disconnectReason)
    chat_reset = await reset_lobby_chat_state(lobby_id, disconnect_reason=payload.disconnectReason)
    return {
        "mode": payload.mode,
        "lobbyId": lobby_id,
        "db": {
            "clearedWorldSnapshot": True,
            "clearedPlayers": clear_players,
            "clearedPopulation": bool(payload.clearPopulation),
        },
        "runtime": {
            "game": game_reset,
            "chat": chat_reset,
        },
    }


@developer_tools_routes.post("/game-servers/{game_server_id}/reset", status_code=HttpStatus.OK)
async def reset_game_server_lobbies(
    game_server_id: str,
    payload: ServerResetRequest,
    x_dev_admin_token: str | None = Header(default=None),
):
    _require_developer_token(x_dev_admin_token)

    target_server = (game_server_id or "").strip()
    if not target_server:
        raise HTTPException(status_code=HttpStatus.BAD_REQUEST, detail="game_server_id is required.")

    target_lobbies = [
        lobby
        for lobby in Lobby.get_all()
        if (lobby.assigned_game_server_id or "").strip() == target_server
    ]

    db_modified = Lobby.reset_by_assigned_game_server(
        target_server,
        clear_players=True,
        clear_population=bool(payload.clearPopulation),
        clear_world_snapshot=True,
    )

    runtime_summaries: list[dict[str, object]] = []
    for lobby in target_lobbies:
        lobby_id = lobby.id or ""
        if not lobby_id:
            continue
        game_reset = await reset_lobby_runtime_state(lobby_id, disconnect_reason=payload.disconnectReason)
        chat_reset = await reset_lobby_chat_state(lobby_id, disconnect_reason=payload.disconnectReason)
        runtime_summaries.append(
            {
                "lobbyId": lobby_id,
                "game": game_reset,
                "chat": chat_reset,
            }
        )

    return {
        "gameServerId": target_server,
        "dbModifiedLobbies": db_modified,
        "runtimeResets": runtime_summaries,
    }
