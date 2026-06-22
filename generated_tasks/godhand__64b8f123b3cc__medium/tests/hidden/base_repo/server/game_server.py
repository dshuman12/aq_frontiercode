"""
Dedicated game websocket server entrypoint.

Run this as a separate process to split realtime game sync from the main API:
  uvicorn server.game_server:app --host 0.0.0.0 --port 5051
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import time

from fastapi import FastAPI
import httpx

from server.api.middleware.middleware import register_middleware
from server.api.routers import register_game_ws_router
from server.api.routers.health import health_routes
from server.config import get_app_config
from server.external import initialize_services
from server.utils.error_handlers import register_error_handlers
from server.utils.logging import get_app_logger
from server.utils.startup_alerts import emit_startup_alerts

app_logger = get_app_logger()


def _split_csv(raw: str) -> list[str]:
    return [item.strip() for item in (raw or "").split(",") if item.strip()]


def _build_server_auth_headers(*, server_id: str, signing_secret: str) -> dict[str, str]:
    headers: dict[str, str] = {}
    if server_id and signing_secret:
        timestamp_seconds = int(time.time())
        payload = f"{server_id}:{timestamp_seconds}"
        signature = hmac.new(
            signing_secret.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()
        headers["X-Game-Server-Id"] = server_id
        headers["X-Game-Server-Timestamp"] = str(timestamp_seconds)
        headers["X-Game-Server-Signature"] = signature
    return headers


async def _register_and_heartbeat_loop() -> None:
    cfg = get_app_config()
    server_id = (cfg.GAME_SERVER_SELF_ID or "").strip()
    signing_secret = (cfg.GAME_SERVER_SELF_SIGNING_SECRET or "").strip()
    region = (cfg.GAME_SERVER_SELF_REGION or "").strip() or cfg.DEFAULT_GAME_SERVER_REGION

    if not server_id or not signing_secret:
        app_logger.warning(
            "[GameServer] Registry heartbeat disabled. Missing GAME_SERVER_SELF_ID or GAME_SERVER_SELF_SIGNING_SECRET."
        )
        return

    base_url = cfg.CONTROL_PLANE_INTERNAL_BASE_URL.rstrip("/")
    register_url = f"{base_url}/api/v1/internal/game-servers/register"
    heartbeat_url = f"{base_url}/api/v1/internal/game-servers/{server_id}/heartbeat"
    official_keys = _split_csv(cfg.GAME_SERVER_SELF_OFFICIAL_KEYS)

    register_payload = {
        "serverId": server_id,
        "ownerType": "official",
        "region": region,
        "gameWsBaseUrl": cfg.GAME_WS_PUBLIC_BASE_URL,
        "chatWsBaseUrl": cfg.CHAT_WS_PUBLIC_BASE_URL,
        "officialKeys": official_keys,
        "currentPlayers": 0,
        "maxPlayers": 0,
    }
    heartbeat_payload = {"currentPlayers": 0, "maxPlayers": 0}
    heartbeat_interval = max(1, int(cfg.GAME_SERVER_HEARTBEAT_INTERVAL_SECONDS))

    async with httpx.AsyncClient(timeout=5.0) as client:
        while True:
            try:
                headers = _build_server_auth_headers(
                    server_id=server_id,
                    signing_secret=signing_secret,
                )
                register_response = await client.post(register_url, json=register_payload, headers=headers)
                register_response.raise_for_status()
                app_logger.info(f"[GameServer] Registered server_id={server_id} with control-plane.")
                break
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                app_logger.warning(f"[GameServer] Register failed for server_id={server_id}: {exc}")
                await asyncio.sleep(2)

        while True:
            try:
                headers = _build_server_auth_headers(
                    server_id=server_id,
                    signing_secret=signing_secret,
                )
                heartbeat_response = await client.post(
                    heartbeat_url,
                    json=heartbeat_payload,
                    headers=headers,
                )
                if heartbeat_response.status_code == 404:
                    headers = _build_server_auth_headers(
                        server_id=server_id,
                        signing_secret=signing_secret,
                    )
                    register_response = await client.post(register_url, json=register_payload, headers=headers)
                    register_response.raise_for_status()
                    app_logger.info(f"[GameServer] Re-registered server_id={server_id} after missing record.")
                else:
                    heartbeat_response.raise_for_status()
            except asyncio.CancelledError:
                raise
            except Exception as exc:
                app_logger.warning(f"[GameServer] Heartbeat failed for server_id={server_id}: {exc}")

            await asyncio.sleep(heartbeat_interval)


def create_game_server_app() -> FastAPI:
    init_time = time.time()
    fastapi_app = FastAPI()
    cfg = get_app_config()

    start_time = time.time()
    register_error_handlers(fastapi_app)
    app_logger.info(f"[GameServer] Registered error handlers [{time.time() - start_time:.5f}s]")

    start_time = time.time()
    register_middleware(fastapi_app)
    app_logger.info(f"[GameServer] Registered middleware [{time.time() - start_time:.5f}s]")

    start_time = time.time()
    initialize_services()
    app_logger.info(f"[GameServer] Initialized services [{time.time() - start_time:.5f}s]")
    emit_startup_alerts(cfg=cfg, logger=app_logger, service_name="game-server")

    fastapi_app.include_router(health_routes)
    register_game_ws_router(fastapi_app)

    @fastapi_app.on_event("startup")
    async def _start_registry_heartbeat_task() -> None:
        fastapi_app.state.registry_task = asyncio.create_task(_register_and_heartbeat_loop())

    @fastapi_app.on_event("shutdown")
    async def _stop_registry_heartbeat_task() -> None:
        task = getattr(fastapi_app.state, "registry_task", None)
        if task is None:
            return
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    app_logger.info(f"[GameServer] Total initialization time [{time.time() - init_time:.5f}s]")
    return fastapi_app


app = create_game_server_app()
