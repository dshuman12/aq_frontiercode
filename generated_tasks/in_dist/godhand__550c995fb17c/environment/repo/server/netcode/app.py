from __future__ import annotations

import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException, Request, WebSocket
from starlette.websockets import WebSocketDisconnect

from .config import NetcodeSettings
from .models import AdminRoomSummary, HealthResponse, SaveLoadResponse, TokenIssueRequest, TokenIssueResponse
from .persistence import SQLiteWorldStore
from .rooms import RoomClient, RoomManager
from .security import issue_player_token, validate_admin_key, verify_player_token
from .simulation import load_resource_catalog


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    settings = NetcodeSettings.from_env()
    store = SQLiteWorldStore(settings.save_db_path)
    catalog = load_resource_catalog()
    manager = RoomManager(settings=settings, store=store, catalog=catalog)
    await manager.start()

    fastapi_app.state.settings = settings
    fastapi_app.state.store = store
    fastapi_app.state.manager = manager
    fastapi_app.state.catalog = catalog
    try:
        yield
    finally:
        await manager.shutdown()
        store.close()


app = FastAPI(title="Project Godhand Netcode", version="0.1.0", lifespan=lifespan)


def _require_admin(
    request: Request,
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> None:
    settings: NetcodeSettings = request.app.state.settings
    if validate_admin_key(x_admin_key, settings.admin_api_key):
        return
    raise HTTPException(status_code=403, detail="admin key required")


@app.get("/health", response_model=HealthResponse)
async def health(request: Request) -> HealthResponse:
    manager: RoomManager = request.app.state.manager
    active_rooms, active_players = manager.counts()
    return HealthResponse(active_rooms=active_rooms, active_players=active_players)


@app.post("/session/token", response_model=TokenIssueResponse)
async def issue_token(
    payload: TokenIssueRequest,
    request: Request,
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
) -> TokenIssueResponse:
    settings: NetcodeSettings = request.app.state.settings
    if not settings.insecure_allow_anonymous_tokens and not validate_admin_key(x_admin_key, settings.admin_api_key):
        raise HTTPException(status_code=403, detail="admin key required to mint player tokens")

    token, claims = issue_player_token(
        secret=settings.auth_secret,
        room_id=payload.room_id,
        player_id=payload.player_id,
        display_name=payload.display_name,
        role=payload.role,
        ttl_sec=settings.auth_token_ttl_sec,
    )
    return TokenIssueResponse(
        token=token,
        room_id=claims.room_id,
        player_id=claims.player_id,
        expires_at_unix=claims.exp,
    )


@app.get("/admin/rooms", response_model=list[AdminRoomSummary], dependencies=[Depends(_require_admin)])
async def admin_list_rooms(request: Request) -> list[AdminRoomSummary]:
    manager: RoomManager = request.app.state.manager
    entries = await manager.list_rooms()
    return [AdminRoomSummary.model_validate(entry) for entry in entries]


@app.post(
    "/admin/save/{room_id}",
    response_model=SaveLoadResponse,
    dependencies=[Depends(_require_admin)],
)
async def admin_save_room(room_id: str, request: Request) -> SaveLoadResponse:
    manager: RoomManager = request.app.state.manager
    ok, message, state = await manager.save_room(room_id)
    return SaveLoadResponse(ok=ok, room_id=room_id, message=message, state=state)


@app.post(
    "/admin/load/{room_id}",
    response_model=SaveLoadResponse,
    dependencies=[Depends(_require_admin)],
)
async def admin_load_room(room_id: str, request: Request) -> SaveLoadResponse:
    manager: RoomManager = request.app.state.manager
    ok, message, state = await manager.load_room(room_id)
    return SaveLoadResponse(ok=ok, room_id=room_id, message=message, state=state)


@app.websocket("/ws/{room_id}")
async def room_socket(websocket: WebSocket, room_id: str) -> None:
    settings: NetcodeSettings = websocket.app.state.settings
    manager: RoomManager = websocket.app.state.manager

    token = websocket.query_params.get("token")
    claims = verify_player_token(token or "", secret=settings.auth_secret, expected_room_id=room_id) if token else None

    if claims is None and settings.insecure_allow_anonymous_tokens:
        random_player_id = f"anon_{uuid.uuid4().hex[:10]}"
        random_display = f"Anon-{random_player_id[-4:]}"
        token, claims = issue_player_token(
            secret=settings.auth_secret,
            room_id=room_id,
            player_id=random_player_id,
            display_name=random_display,
            role="player",
            ttl_sec=3_600,
        )

    if claims is None:
        await websocket.close(code=1008, reason="invalid or missing token")
        return

    await websocket.accept()

    session = await manager.get_or_create_room(room_id)
    client: RoomClient | None = None
    try:
        client = await session.join(
            websocket,
            player_id=claims.player_id,
            display_name=claims.display_name,
            role=claims.role,
        )
        while True:
            message = await websocket.receive_text()
            await session.handle_client_text(client, message)
    except RuntimeError as exc:
        await websocket.send_json({"type": "error", "code": str(exc), "message": "room join failed"})
        await websocket.close(code=4003, reason="room join failed")
    except WebSocketDisconnect:
        pass
    finally:
        if client is not None:
            await session.leave(client)
