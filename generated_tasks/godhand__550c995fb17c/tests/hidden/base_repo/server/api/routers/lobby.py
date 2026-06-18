from __future__ import annotations

from typing import Any
from urllib.parse import quote

from fastapi import APIRouter, Request, HTTPException, Query
from pydantic import BaseModel, Field
from fastapi.responses import JSONResponse

from server.api.security.jwt import JWTService
from server.api.websockets.lobby_chat import connection_hub
from server.external.db.models.game_server_registry import GameServerRegistry
from server.external.db.models.lobby import Lobby
from server.external.db.models.user import User
from server.utils.constants import HttpStatus, ResponseMessages
from server.utils.error_handlers import AuthenticationError

lobby_routes = APIRouter(prefix="/api/v1/lobbies", tags=["lobbies"])


OFFICIAL_LOBBY_BLUEPRINTS: list[dict[str, Any]] = [
    {
        "official_key": "na-west-1",
        "lobby_name": "NA West 1",
        "server_region": "NA West 1",
        "server_description": "Official NA West server #1.",
        "user_capacity": 12,
    },
    {
        "official_key": "na-west-2",
        "lobby_name": "NA West 2",
        "server_region": "NA West 2",
        "server_description": "Official NA West server #2.",
        "user_capacity": 12,
    },
    {
        "official_key": "na-west-3",
        "lobby_name": "NA West 3",
        "server_region": "NA West 3",
        "server_description": "Official NA West server #3.",
        "user_capacity": 12,
    },
]


def _normalize_lobby_kind(raw_kind: str) -> str:
    kind = (raw_kind or "").strip().lower()
    if kind in {"official", "custom", "all"}:
        return kind
    raise HTTPException(status_code=HttpStatus.BAD_REQUEST, detail="Invalid lobby kind filter.")


def _is_official_lobby(lobby: Lobby) -> bool:
    return (lobby.lobby_kind or "custom").strip().lower() == "official"


def _upsert_official_lobbies() -> None:
    for blueprint in OFFICIAL_LOBBY_BLUEPRINTS:
        Lobby.upsert_official(
            official_key=blueprint["official_key"],
            lobby_name=blueprint["lobby_name"],
            user_capacity=blueprint["user_capacity"],
            server_region=blueprint["server_region"],
            server_description=blueprint["server_description"],
        )


def _normalize_match_token(raw: str) -> str:
    normalized = (raw or "").strip().lower().replace("-", " ").replace("_", " ")
    return " ".join(normalized.split())


def _materialize_assignment(lobby: Lobby, assignment: dict[str, Any]) -> dict[str, str]:
    default_region = (lobby.server_region or "").strip() or "unknown-region"
    return {
        "game_server_id": str(assignment.get("game_server_id") or "").strip(),
        "game_region": str(assignment.get("region") or "").strip() or default_region,
        "game_ws_base_url": str(assignment.get("game_ws_base_url") or "").strip(),
        "chat_ws_base_url": str(assignment.get("chat_ws_base_url") or "").strip(),
    }


def _select_game_server_assignment(lobby: Lobby) -> dict[str, str] | None:
    healthy_registry = GameServerRegistry.list_healthy()
    if not healthy_registry:
        return None

    lobby_official_key = (lobby.official_key or "").strip().lower()
    lobby_region_token = _normalize_match_token(lobby.server_region or "")

    def _registry_candidate(entry: GameServerRegistry) -> dict[str, Any]:
        return {
            "game_server_id": entry.server_id,
            "region": entry.region,
            "official_keys": entry.official_keys,
            "game_ws_base_url": entry.game_ws_base_url,
            "chat_ws_base_url": entry.chat_ws_base_url,
        }

    for entry in healthy_registry:
        entry_official_keys = [key.strip().lower() for key in (entry.official_keys or []) if key.strip()]
        if lobby_official_key and lobby_official_key in entry_official_keys:
            return _materialize_assignment(lobby, _registry_candidate(entry))

    for entry in healthy_registry:
        entry_region_token = _normalize_match_token(entry.region)
        if lobby_region_token and entry_region_token and lobby_region_token == entry_region_token:
            return _materialize_assignment(lobby, _registry_candidate(entry))

    return _materialize_assignment(lobby, _registry_candidate(healthy_registry[0]))


def _ensure_lobby_routing_assignment(lobby: Lobby) -> Lobby | None:
    selected = _select_game_server_assignment(lobby)
    if selected is None:
        return None

    updated = Lobby.update_routing_assignment(
        lobby.id or "",
        game_server_id=selected["game_server_id"],
        game_region=selected["game_region"],
        game_ws_base_url=selected["game_ws_base_url"],
        chat_ws_base_url=selected["chat_ws_base_url"],
    )
    return updated


def _build_assigned_lobby_ws_urls(lobby: Lobby) -> dict[str, str]:
    encoded_lobby_id = quote(lobby.id or "", safe="")
    game_ws_base = (lobby.assigned_game_ws_base_url or "").strip()
    chat_ws_base = (lobby.assigned_chat_ws_base_url or "").strip()
    if not game_ws_base or not chat_ws_base:
        raise HTTPException(
            status_code=HttpStatus.SERVICE_UNAVAILABLE,
            detail="No healthy game server assignment is available.",
        )
    return {
        "gameWsUrl": f"{game_ws_base.rstrip('/')}/api/v1/ws/game/{encoded_lobby_id}",
        "chatWsUrl": f"{chat_ws_base.rstrip('/')}/api/v1/ws/lobby/{encoded_lobby_id}",
    }


async def _to_lobby_browser_payload(lobby: Lobby) -> dict[str, Any]:
    lobby_id = lobby.id or ""

    active_player_ids: list[str] = []
    seen_active_player_ids: set[str] = set()
    for raw_player_id in lobby.players or []:
        player_id = (raw_player_id or "").strip()
        if not player_id or player_id in seen_active_player_ids:
            continue
        seen_active_player_ids.add(player_id)
        active_player_ids.append(player_id)

    population_ids: list[str] = []
    seen_population_ids: set[str] = set()
    source_population_ids = lobby.population or lobby.players or []
    for raw_player_id in source_population_ids:
        player_id = (raw_player_id or "").strip()
        if not player_id or player_id in seen_population_ids:
            continue
        seen_population_ids.add(player_id)
        population_ids.append(player_id)

    users_by_id = User.get_by_ids(population_ids)
    online_user_ids: set[str] = set()
    for member in await connection_hub.lobby_members(lobby_id):
        if member.user_id:
            online_user_ids.add(member.user_id)

    players_payload = []
    for player_id in population_ids:
        resolved_user = users_by_id.get(player_id)
        players_payload.append(
            {
                "userId": player_id,
                "username": (resolved_user.username if resolved_user else "unknown"),
                "isOwner": player_id == lobby.owner_user_id,
                "isOnline": player_id in online_user_ids,
            }
        )

    max_players = max(1, int(lobby.user_capacity or 0))
    active_player_count = len(active_player_ids)
    population_count = len(population_ids)
    online_player_count = len(online_user_ids)
    status = "full" if active_player_count >= max_players else "online"

    return {
        "id": lobby_id,
        "name": lobby.lobby_name,
        "kind": (lobby.lobby_kind or "custom"),
        "officialKey": lobby.official_key,
        "region": lobby.server_region,
        "description": lobby.server_description,
        "status": status,
        "ownerUserId": lobby.owner_user_id,
        "maxPlayers": max_players,
        "playerCount": online_player_count,
        "populationCount": population_count,
        "playersOnline": online_player_count,
        "players": players_payload,
    }


class CreateLobbyRequest(BaseModel):
    lobby_name: str = Field(..., min_length=1)
    user_capacity: int = Field(default=4, ge=1, le=100)


@lobby_routes.post("", status_code=HttpStatus.CREATED)
async def create_lobby(payload: CreateLobbyRequest, request: Request):
    claims = JWTService.require_access(request)
    user_id = str(claims.get("sub") or "")
    if not user_id:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    lobby = Lobby.create(
        lobby_name=payload.lobby_name,
        owner_user_id=user_id,
        lobby_kind="custom",
        user_capacity=payload.user_capacity,
        players=[user_id],
        world_snapshot=None,
    )
    assigned = _ensure_lobby_routing_assignment(lobby)
    if assigned is not None:
        lobby = assigned

    return {"lobby": lobby.model_dump(by_alias=True)}


@lobby_routes.get("/{lobby_id}", status_code=HttpStatus.OK)
async def get_lobby(lobby_id: str):
    lobby = Lobby.get_by_id(lobby_id)
    if not lobby:
        raise HTTPException(status_code=404, detail="Lobby not found")

    return {"lobby": lobby.model_dump(by_alias=True)}


@lobby_routes.post("/{lobby_id}/join", status_code=HttpStatus.OK)
async def join_lobby(lobby_id: str, request: Request):
    claims = JWTService.require_access(request)
    user_id = str(claims.get("sub") or "")
    if not user_id:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    existing = Lobby.get_by_id(lobby_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Lobby not found")

    updated = Lobby.move_user_to_lobby(lobby_id, user_id=user_id)
    if not updated:
        raise HTTPException(status_code=409, detail="Lobby is full")
    updated = _ensure_lobby_routing_assignment(updated)
    if updated is None:
        raise HTTPException(
            status_code=HttpStatus.SERVICE_UNAVAILABLE,
            detail="No healthy game server is available for this lobby.",
        )

    return {
        "lobby": updated.model_dump(by_alias=True),
        **_build_assigned_lobby_ws_urls(updated),
    }


@lobby_routes.post("/{lobby_id}/leave", status_code=HttpStatus.OK)
async def leave_lobby(lobby_id: str, request: Request):
    claims = JWTService.require_access(request)
    user_id = str(claims.get("sub") or "")
    if not user_id:
        raise AuthenticationError(ResponseMessages.INVALID_OR_EXPIRED_TOKEN)

    updated = Lobby.leave(lobby_id, user_id=user_id)
    if not updated:
        raise HTTPException(status_code=404, detail="Lobby not found")

    return {"lobby": updated.model_dump(by_alias=True)}

@lobby_routes.get("", status_code=HttpStatus.OK)
async def list_lobbies(kind: str = Query(default="official")):
    requested_kind = _normalize_lobby_kind(kind)
    _upsert_official_lobbies()
    allowed_official_keys = {item["official_key"] for item in OFFICIAL_LOBBY_BLUEPRINTS}
    healthy_official_keys = {
        key.strip().lower()
        for entry in GameServerRegistry.list_healthy()
        for key in (entry.official_keys or [])
        if key and key.strip()
    }

    filtered_lobbies: list[Lobby] = []
    for lobby in Lobby.get_all():
        is_official = _is_official_lobby(lobby)
        if requested_kind == "official" and not is_official:
            continue
        if requested_kind == "official" and (lobby.official_key or "") not in allowed_official_keys:
            continue
        if is_official and (lobby.official_key or "").strip().lower() not in healthy_official_keys:
            continue
        if requested_kind == "custom" and is_official:
            continue
        filtered_lobbies.append(lobby)

    browser_payload = [await _to_lobby_browser_payload(lobby) for lobby in filtered_lobbies]
    return JSONResponse(
        status_code=HttpStatus.OK,
        content={"lobbies": browser_payload},
    )
