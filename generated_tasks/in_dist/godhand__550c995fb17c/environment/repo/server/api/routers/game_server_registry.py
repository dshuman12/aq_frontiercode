from __future__ import annotations

import hashlib
import hmac
import json
import time
from typing import Literal

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from server.config import get_app_config
from server.external.db.models.game_server_registry import GameServerRegistry
from server.utils.constants import HttpStatus

game_server_registry_routes = APIRouter(prefix="/api/v1/internal/game-servers", tags=["game-server-registry"])


def _load_server_credentials() -> dict[str, dict[str, object]]:
    raw = (get_app_config().GAME_SERVER_CREDENTIALS_JSON or "").strip()
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
    except Exception:
        return {}
    if not isinstance(parsed, dict):
        return {}

    result: dict[str, dict[str, object]] = {}
    for raw_server_id, raw_entry in parsed.items():
        server_id = str(raw_server_id or "").strip()
        if not server_id or not isinstance(raw_entry, dict):
            continue
        secret = str(raw_entry.get("signing_secret") or "").strip()
        if not secret:
            continue
        allowed_official_keys_raw = raw_entry.get("allowed_official_keys")
        allowed_official_keys: list[str] = []
        if isinstance(allowed_official_keys_raw, list):
            allowed_official_keys = [
                str(item).strip().lower() for item in allowed_official_keys_raw if str(item).strip()
            ]
        result[server_id] = {
            "signing_secret": secret,
            "allowed_official_keys": allowed_official_keys,
        }
    return result


def _validate_official_keys_allowlist(
    server_id: str,
    requested_official_keys: list[str],
    credentials: dict[str, dict[str, object]],
) -> None:
    credential = credentials.get(server_id)
    if credential is None:
        return

    allowlist = {
        str(item).strip().lower()
        for item in (credential.get("allowed_official_keys") or [])
        if str(item).strip()
    }
    if not allowlist:
        return

    requested = {key.strip().lower() for key in requested_official_keys if key.strip()}
    if not requested.issubset(allowlist):
        raise HTTPException(
            status_code=HttpStatus.FORBIDDEN,
            detail="Requested official keys are not allowed for this server identity.",
        )


def _require_server_auth(
    *,
    server_id_header: str | None,
    timestamp_header: str | None,
    signature_header: str | None,
    expected_server_id: str | None = None,
) -> str:
    cfg = get_app_config()
    credentials = _load_server_credentials()
    if not credentials:
        raise HTTPException(
            status_code=503,
            detail="Per-server credentials are not configured.",
        )

    server_id = (server_id_header or "").strip()
    if not server_id:
        raise HTTPException(status_code=HttpStatus.UNAUTHORIZED, detail="Missing game server id header.")
    if expected_server_id and server_id != expected_server_id:
        raise HTTPException(status_code=HttpStatus.UNAUTHORIZED, detail="Server id does not match path.")

    credential = credentials.get(server_id)
    if not credential:
        raise HTTPException(status_code=HttpStatus.UNAUTHORIZED, detail="Unknown game server id.")
    signing_secret = str(credential.get("signing_secret") or "").strip()
    if not signing_secret:
        raise HTTPException(status_code=HttpStatus.UNAUTHORIZED, detail="Invalid game server credentials.")

    try:
        timestamp_seconds = int(float((timestamp_header or "").strip()))
    except Exception:
        raise HTTPException(status_code=HttpStatus.UNAUTHORIZED, detail="Invalid timestamp header.")

    now_seconds = int(time.time())
    max_skew = max(1, int(cfg.GAME_SERVER_SIGNATURE_MAX_SKEW_SECONDS))
    if abs(now_seconds - timestamp_seconds) > max_skew:
        raise HTTPException(status_code=HttpStatus.UNAUTHORIZED, detail="Stale signature timestamp.")

    payload = f"{server_id}:{timestamp_seconds}"
    expected_sig = hmac.new(
        signing_secret.encode("utf-8"),
        payload.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    provided_sig = (signature_header or "").strip()
    if not provided_sig or not hmac.compare_digest(provided_sig, expected_sig):
        raise HTTPException(status_code=HttpStatus.UNAUTHORIZED, detail="Invalid game server signature.")
    return server_id


class RegisterGameServerRequest(BaseModel):
    serverId: str = Field(..., min_length=1)
    ownerType: Literal["official", "player"] = "official"
    region: str = Field(..., min_length=1)
    gameWsBaseUrl: str = Field(..., min_length=1)
    chatWsBaseUrl: str | None = None
    officialKeys: list[str] = Field(default_factory=list)
    currentPlayers: int = Field(default=0, ge=0)
    maxPlayers: int = Field(default=0, ge=0)


class GameServerHeartbeatRequest(BaseModel):
    currentPlayers: int | None = Field(default=None, ge=0)
    maxPlayers: int | None = Field(default=None, ge=0)


@game_server_registry_routes.post("/register", status_code=HttpStatus.OK)
async def register_game_server(
    payload: RegisterGameServerRequest,
    x_game_server_id: str | None = Header(default=None),
    x_game_server_timestamp: str | None = Header(default=None),
    x_game_server_signature: str | None = Header(default=None),
):
    authenticated_server_id = _require_server_auth(
        server_id_header=x_game_server_id,
        timestamp_header=x_game_server_timestamp,
        signature_header=x_game_server_signature,
        expected_server_id=payload.serverId.strip(),
    )
    credentials = _load_server_credentials()
    requested_official_keys = [key.strip() for key in payload.officialKeys if key.strip()]
    _validate_official_keys_allowlist(
        authenticated_server_id or payload.serverId.strip(),
        requested_official_keys,
        credentials,
    )

    cfg = get_app_config()
    entry = GameServerRegistry.upsert_registration(
        server_id=payload.serverId.strip(),
        owner_type=payload.ownerType,
        region=payload.region.strip(),
        game_ws_base_url=payload.gameWsBaseUrl.strip(),
        chat_ws_base_url=(payload.chatWsBaseUrl or "").strip() or None,
        official_keys=requested_official_keys,
        current_players=payload.currentPlayers,
        max_players=payload.maxPlayers,
        ttl_seconds=cfg.GAME_SERVER_HEARTBEAT_TTL_SECONDS,
    )
    if not entry:
        raise HTTPException(status_code=HttpStatus.INTERNAL_SERVER_ERROR, detail="Failed to register server.")

    return {"server": entry.model_dump(by_alias=True)}


@game_server_registry_routes.post("/{server_id}/heartbeat", status_code=HttpStatus.OK)
async def heartbeat_game_server(
    server_id: str,
    payload: GameServerHeartbeatRequest,
    x_game_server_id: str | None = Header(default=None),
    x_game_server_timestamp: str | None = Header(default=None),
    x_game_server_signature: str | None = Header(default=None),
):
    _require_server_auth(
        server_id_header=x_game_server_id,
        timestamp_header=x_game_server_timestamp,
        signature_header=x_game_server_signature,
        expected_server_id=server_id.strip(),
    )

    cfg = get_app_config()
    entry = GameServerRegistry.heartbeat(
        server_id=server_id.strip(),
        current_players=payload.currentPlayers,
        max_players=payload.maxPlayers,
        ttl_seconds=cfg.GAME_SERVER_HEARTBEAT_TTL_SECONDS,
    )
    if not entry:
        raise HTTPException(status_code=HttpStatus.NOT_FOUND, detail="Game server is not registered.")

    return {"server": entry.model_dump(by_alias=True)}

