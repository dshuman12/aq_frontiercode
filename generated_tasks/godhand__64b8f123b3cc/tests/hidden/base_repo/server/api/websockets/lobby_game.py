from __future__ import annotations

import asyncio
import json
import math
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from server.api.security.jwt import JWTService
from server.api.security.websocket_rate_limit import allow_connect, allow_message
from server.api.websockets.connection_hub import ConnectionHub
from server.external.db.models.lobby import Lobby
from server.external.db.models.user import User
from server.utils.error_handlers import AuthenticationError

router = APIRouter(prefix="/api/v1")

game_connection_hub = ConnectionHub()

_PERSIST_COALESCE_SECONDS = 0.25
_LOCKSTEP_TICK_RATE_HZ = 60
_LOCKSTEP_TICK_INTERVAL_MS = 1000 / _LOCKSTEP_TICK_RATE_HZ
_VALID_DIRECTIONS = {"up", "right", "down", "left"}
_MAX_WS_MESSAGE_BYTES = 2 * 1024 * 1024
_MAX_LOCKSTEP_FUTURE_TICKS = _LOCKSTEP_TICK_RATE_HZ * 5
_MAX_LOCKSTEP_STEPS = 256

_snapshot_lock = asyncio.Lock()
_pending_snapshot_by_lobby: dict[str, dict[str, Any]] = {}
_snapshot_flush_task_by_lobby: dict[str, asyncio.Task[None]] = {}

_presence_lock = asyncio.Lock()
_presence_by_lobby: dict[str, dict[str, dict[str, Any]]] = {}


@dataclass
class LockstepLobbyState:
    current_tick: int = 0
    pending_commands_by_tick: dict[int, list[dict[str, Any]]] = field(default_factory=dict)
    task: asyncio.Task[None] | None = None


_lockstep_lock = asyncio.Lock()
_lockstep_state_by_lobby: dict[str, LockstepLobbyState] = {}


def _parse_grid_cell(raw: Any, field_name: str) -> dict[str, int] | None:
    if raw is None:
        return None
    if not isinstance(raw, dict):
        raise ValueError(f"Field '{field_name}' must be an object or null.")

    x_raw = raw.get("x")
    y_raw = raw.get("y")
    if not isinstance(x_raw, (int, float)) or not isinstance(y_raw, (int, float)):
        raise ValueError(f"Field '{field_name}' must include numeric x/y coordinates.")

    x = float(x_raw)
    y = float(y_raw)
    if not math.isfinite(x) or not math.isfinite(y):
        raise ValueError(f"Field '{field_name}' contains invalid numeric values.")

    return {"x": int(round(x)), "y": int(round(y))}


def _parse_direction(raw: Any, field_name: str) -> str:
    if isinstance(raw, str) and raw in _VALID_DIRECTIONS:
        return raw
    raise ValueError(f"Field '{field_name}' must be one of up/right/down/left.")


def _parse_lockstep_step(raw: Any, field_name: str) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError(f"Field '{field_name}' must be an object.")
    cell = _parse_grid_cell(raw, field_name)
    if cell is None:
        raise ValueError(f"Field '{field_name}' must include x/y coordinates.")
    return {
        "x": cell["x"],
        "y": cell["y"],
        "direction": _parse_direction(raw.get("direction"), f"{field_name}.direction"),
    }


def _parse_lockstep_command(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        raise ValueError("Field 'command' must be an object.")
    command_type = raw.get("type")
    if command_type == "place_steps":
        build_id = raw.get("buildId")
        if not isinstance(build_id, str) or not build_id:
            raise ValueError("Field 'command.buildId' must be a non-empty string.")
        steps_raw = raw.get("steps")
        if not isinstance(steps_raw, list) or len(steps_raw) == 0:
            raise ValueError("Field 'command.steps' must be a non-empty array.")
        if len(steps_raw) > _MAX_LOCKSTEP_STEPS:
            raise ValueError(f"Field 'command.steps' exceeds maximum of {_MAX_LOCKSTEP_STEPS}.")
        steps = [_parse_lockstep_step(step, "command.steps[]") for step in steps_raw]
        return {
            "type": "place_steps",
            "buildId": build_id,
            "steps": steps,
        }

    if command_type == "remove_cell":
        cell = _parse_grid_cell(raw.get("cell"), "command.cell")
        if cell is None:
            raise ValueError("Field 'command.cell' must be an object with numeric x/y coordinates.")
        return {
            "type": "remove_cell",
            "cell": cell,
        }

    if command_type == "set_machine_recipe":
        machine_key = raw.get("machineKey")
        if not isinstance(machine_key, str) or not machine_key:
            raise ValueError("Field 'command.machineKey' must be a non-empty string.")
        recipe_id_raw = raw.get("recipeId")
        if recipe_id_raw is not None and not isinstance(recipe_id_raw, str):
            raise ValueError("Field 'command.recipeId' must be a string or null.")
        return {
            "type": "set_machine_recipe",
            "machineKey": machine_key,
            "recipeId": recipe_id_raw if isinstance(recipe_id_raw, str) else None,
        }

    raise ValueError("Unsupported lockstep command type.")


def _safe_parse_payload(text: str) -> dict[str, Any]:
    payload = json.loads(text)
    if not isinstance(payload, dict):
        raise ValueError("Expected a JSON object payload.")

    kind = payload.get("kind")
    if kind == "state_sync":
        snapshot = payload.get("snapshot")
        if not isinstance(snapshot, dict):
            raise ValueError("Field 'snapshot' must be an object.")
        return {"kind": "state_sync", "snapshot": snapshot}

    if kind == "presence_update":
        presence = payload.get("presence")
        if not isinstance(presence, dict):
            raise ValueError("Field 'presence' must be an object.")

        placement_direction_raw = presence.get("placementDirection")
        if placement_direction_raw is None:
            placement_direction = None
        elif isinstance(placement_direction_raw, str) and placement_direction_raw in _VALID_DIRECTIONS:
            placement_direction = placement_direction_raw
        else:
            raise ValueError(
                "Field 'presence.placementDirection' must be one of up/right/down/left or null."
            )

        placement_build_id_raw = presence.get("placementBuildId")
        if placement_build_id_raw is None:
            placement_build_id = None
        elif isinstance(placement_build_id_raw, str):
            placement_build_id = placement_build_id_raw
        else:
            raise ValueError("Field 'presence.placementBuildId' must be a string or null.")

        return {
            "kind": "presence_update",
            "presence": {
                "cursorCell": _parse_grid_cell(presence.get("cursorCell"), "presence.cursorCell"),
                "placementCell": _parse_grid_cell(presence.get("placementCell"), "presence.placementCell"),
                "placementBuildId": placement_build_id,
                "placementDirection": placement_direction,
            },
        }

    if kind == "presence_clear":
        return {"kind": "presence_clear"}

    if kind == "lockstep_command":
        tick_raw = payload.get("tick")
        if not isinstance(tick_raw, (int, float)):
            raise ValueError("Field 'tick' must be a number.")
        if not math.isfinite(float(tick_raw)):
            raise ValueError("Field 'tick' must be finite.")
        tick = int(math.floor(float(tick_raw)))
        if tick < 0:
            raise ValueError("Field 'tick' must be >= 0.")
        return {
            "kind": "lockstep_command",
            "tick": tick,
            "command": _parse_lockstep_command(payload.get("command")),
        }

    raise ValueError("Unsupported payload kind.")


async def _send_error(websocket: WebSocket, code: str, detail: str) -> None:
    await websocket.send_json(
        {
            "type": "error",
            "code": code,
            "detail": detail,
        }
    )


async def _send_snapshot(websocket: WebSocket, lobby_id: str, snapshot: dict[str, Any] | None) -> None:
    await websocket.send_json(
        {
            "type": "snapshot",
            "lobbyId": lobby_id,
            "snapshot": snapshot,
        }
    )


async def _send_presence_batch(
    websocket: WebSocket,
    lobby_id: str,
    presences: list[dict[str, Any]],
) -> None:
    await websocket.send_json(
        {
            "type": "presence_batch",
            "lobbyId": lobby_id,
            "presences": presences,
        }
    )


async def _ensure_lockstep_loop(lobby_id: str) -> int:
    async with _lockstep_lock:
        state = _lockstep_state_by_lobby.get(lobby_id)
        if state is None:
            state = LockstepLobbyState()
            _lockstep_state_by_lobby[lobby_id] = state
        if state.task is None or state.task.done():
            state.task = asyncio.create_task(_lockstep_tick_loop(lobby_id))
        return state.current_tick


async def _send_lockstep_bootstrap(websocket: WebSocket, lobby_id: str, current_tick: int) -> None:
    await websocket.send_json(
        {
            "type": "lockstep_bootstrap",
            "lobbyId": lobby_id,
            "currentTick": current_tick,
            "tickIntervalMs": _LOCKSTEP_TICK_INTERVAL_MS,
        }
    )


async def _queue_lockstep_command(
    lobby_id: str,
    *,
    tick: int,
    user_id: str,
    username: str,
    command: dict[str, Any],
) -> tuple[bool, int]:
    async with _lockstep_lock:
        state = _lockstep_state_by_lobby.get(lobby_id)
        if state is None:
            state = LockstepLobbyState()
            _lockstep_state_by_lobby[lobby_id] = state

        current_tick = state.current_tick
        if tick < current_tick:
            return False, current_tick
        if tick > current_tick + _MAX_LOCKSTEP_FUTURE_TICKS:
            return False, current_tick

        bucket = state.pending_commands_by_tick.setdefault(tick, [])
        bucket.append(
            {
                "tick": tick,
                "userId": user_id,
                "username": username,
                "command": command,
            }
        )
        return True, current_tick


async def _lockstep_tick_loop(lobby_id: str) -> None:
    tick_interval_sec = _LOCKSTEP_TICK_INTERVAL_MS * 0.001
    try:
        while True:
            await asyncio.sleep(tick_interval_sec)
            if await game_connection_hub.lobby_size(lobby_id) == 0:
                return

            tick = 0
            commands: list[dict[str, Any]] = []
            async with _lockstep_lock:
                state = _lockstep_state_by_lobby.get(lobby_id)
                if state is None:
                    return
                tick = state.current_tick
                commands = state.pending_commands_by_tick.pop(tick, [])
                state.current_tick += 1

            await game_connection_hub.broadcast(
                lobby_id,
                {
                    "type": "lockstep_tick",
                    "lobbyId": lobby_id,
                    "tick": tick,
                    "commands": commands,
                },
            )
    except Exception:
        return
    finally:
        current_task = asyncio.current_task()
        async with _lockstep_lock:
            state = _lockstep_state_by_lobby.get(lobby_id)
            if not state:
                return
            if state.task is current_task:
                state.task = None


async def _queue_snapshot_persist(lobby_id: str, snapshot: dict[str, Any]) -> None:
    async with _snapshot_lock:
        _pending_snapshot_by_lobby[lobby_id] = snapshot
        task = _snapshot_flush_task_by_lobby.get(lobby_id)
        if task is None or task.done():
            _snapshot_flush_task_by_lobby[lobby_id] = asyncio.create_task(
                _snapshot_persist_loop(lobby_id)
            )


async def _snapshot_persist_loop(lobby_id: str) -> None:
    try:
        while True:
            await asyncio.sleep(_PERSIST_COALESCE_SECONDS)

            async with _snapshot_lock:
                pending_snapshot = _pending_snapshot_by_lobby.pop(lobby_id, None)

            if pending_snapshot is None:
                return

            Lobby.update_world_snapshot(lobby_id, world_snapshot=pending_snapshot)
    except Exception:
        return
    finally:
        current = asyncio.current_task()
        async with _snapshot_lock:
            task = _snapshot_flush_task_by_lobby.get(lobby_id)
            if task is current:
                _snapshot_flush_task_by_lobby.pop(lobby_id, None)
            if lobby_id not in _snapshot_flush_task_by_lobby:
                _pending_snapshot_by_lobby.pop(lobby_id, None)


async def _resolve_latest_snapshot(
    lobby_id: str, persisted_snapshot: dict[str, Any] | None
) -> dict[str, Any] | None:
    async with _snapshot_lock:
        pending = _pending_snapshot_by_lobby.get(lobby_id)
        if isinstance(pending, dict):
            return pending
    return persisted_snapshot


async def _upsert_presence(
    lobby_id: str,
    user_id: str,
    username: str,
    presence: dict[str, Any],
) -> dict[str, Any]:
    normalized = {
        "userId": user_id,
        "username": username,
        "updatedAtMs": int(time.time() * 1000),
        "cursorCell": presence.get("cursorCell"),
        "placementCell": presence.get("placementCell"),
        "placementBuildId": presence.get("placementBuildId"),
        "placementDirection": presence.get("placementDirection"),
    }
    async with _presence_lock:
        lobby_presences = _presence_by_lobby.setdefault(lobby_id, {})
        lobby_presences[user_id] = normalized
    return normalized


async def _remove_presence(lobby_id: str, user_id: str) -> bool:
    async with _presence_lock:
        lobby_presences = _presence_by_lobby.get(lobby_id)
        if not lobby_presences:
            return False
        removed = lobby_presences.pop(user_id, None)
        if not lobby_presences:
            _presence_by_lobby.pop(lobby_id, None)
    return removed is not None


async def _presence_batch_for_user(
    lobby_id: str, *, exclude_user_id: str | None = None
) -> list[dict[str, Any]]:
    async with _presence_lock:
        lobby_presences = _presence_by_lobby.get(lobby_id, {})
        result = []
        for presence in lobby_presences.values():
            if exclude_user_id and presence.get("userId") == exclude_user_id:
                continue
            result.append(presence)
    return result


async def reset_lobby_runtime_state(lobby_id: str, *, disconnect_reason: str = "Developer reset.") -> dict[str, int]:
    cancelled_snapshot_tasks = 0
    cancelled_lockstep_tasks = 0

    async with _snapshot_lock:
        _pending_snapshot_by_lobby.pop(lobby_id, None)
        task = _snapshot_flush_task_by_lobby.pop(lobby_id, None)
    if task is not None and not task.done():
        task.cancel()
        cancelled_snapshot_tasks = 1

    async with _presence_lock:
        _presence_by_lobby.pop(lobby_id, None)

    async with _lockstep_lock:
        lockstep_state = _lockstep_state_by_lobby.pop(lobby_id, None)
    if lockstep_state and lockstep_state.task and not lockstep_state.task.done():
        lockstep_state.task.cancel()
        cancelled_lockstep_tasks = 1

    closed_connections = await game_connection_hub.close_lobby(
        lobby_id,
        code=1012,
        reason=disconnect_reason[:120],
    )
    return {
        "closedConnections": closed_connections,
        "cancelledSnapshotTasks": cancelled_snapshot_tasks,
        "cancelledLockstepTasks": cancelled_lockstep_tasks,
    }


@router.websocket("/ws/game/{lobby_id}")
async def lobby_game_ws(websocket: WebSocket, lobby_id: str) -> None:
    connect_allowed, connect_retry_after = allow_connect(websocket=websocket, channel="game")
    if not connect_allowed:
        await websocket.close(code=1013, reason=f"Rate limited. Retry in {connect_retry_after}s.")
        return

    try:
        claims = JWTService.require_access_websocket(websocket)
    except AuthenticationError:
        await websocket.close(code=1008)
        return

    user_id = str(claims.get("sub"))
    user = User.get_by_id(user_id)
    if not user:
        await websocket.close(code=1008)
        return

    lobby = Lobby.get_by_id(lobby_id)
    if not lobby:
        await websocket.close(code=1008)
        return

    players = lobby.players or []
    if user_id not in players:
        await websocket.close(code=1008)
        return

    await game_connection_hub.connect(
        lobby_id,
        websocket,
        user_id=user_id,
        username=user.username,
    )

    persisted_snapshot = lobby.world_snapshot if isinstance(lobby.world_snapshot, dict) else None
    latest_snapshot = await _resolve_latest_snapshot(lobby_id, persisted_snapshot)
    await _send_snapshot(websocket, lobby_id, latest_snapshot)
    await _send_presence_batch(
        websocket,
        lobby_id,
        await _presence_batch_for_user(lobby_id, exclude_user_id=user_id),
    )
    current_tick = await _ensure_lockstep_loop(lobby_id)
    await _send_lockstep_bootstrap(websocket, lobby_id, current_tick)
    await game_connection_hub.broadcast(
        lobby_id,
        {
            "type": "snapshot_request",
            "lobbyId": lobby_id,
            "requestedByUserId": user_id,
        },
        exclude=websocket,
    )

    try:
        while True:
            raw = await websocket.receive_text()
            message_allowed, message_retry_after = allow_message(
                websocket=websocket,
                channel="game",
                user_id=user_id,
            )
            if not message_allowed:
                await _send_error(
                    websocket,
                    "rate_limited",
                    f"Message rate limit exceeded. Retry in {message_retry_after}s.",
                )
                await websocket.close(code=1013)
                return
            if len(raw.encode("utf-8")) > _MAX_WS_MESSAGE_BYTES:
                await _send_error(websocket, "payload_too_large", "Payload exceeds maximum allowed size.")
                continue
            try:
                incoming = _safe_parse_payload(raw)
            except (json.JSONDecodeError, ValueError) as exc:
                await _send_error(websocket, "invalid_payload", str(exc))
                continue

            kind = incoming["kind"]
            if kind == "state_sync":
                snapshot = incoming["snapshot"]
                await _queue_snapshot_persist(lobby_id, snapshot)

                await websocket.send_json(
                    {
                        "type": "ack",
                        "event": "state_sync",
                        "lobbyId": lobby_id,
                    }
                )
                await game_connection_hub.broadcast(
                    lobby_id,
                    {
                        "type": "state_sync",
                        "lobbyId": lobby_id,
                        "byUserId": user_id,
                        "snapshot": snapshot,
                    },
                    exclude=websocket,
                )
                continue

            if kind == "presence_update":
                normalized_presence = await _upsert_presence(
                    lobby_id,
                    user_id,
                    user.username,
                    incoming["presence"],
                )
                await game_connection_hub.broadcast(
                    lobby_id,
                    {
                        "type": "presence_sync",
                        "lobbyId": lobby_id,
                        "presence": normalized_presence,
                    },
                    exclude=websocket,
                )
                continue

            if kind == "presence_clear":
                removed = await _remove_presence(lobby_id, user_id)
                if removed:
                    await game_connection_hub.broadcast(
                        lobby_id,
                        {
                            "type": "presence_clear",
                            "lobbyId": lobby_id,
                            "userId": user_id,
                        },
                        exclude=websocket,
                    )
                continue

            if kind == "lockstep_command":
                accepted, current_tick = await _queue_lockstep_command(
                    lobby_id,
                    tick=incoming["tick"],
                    user_id=user_id,
                    username=user.username,
                    command=incoming["command"],
                )
                if not accepted:
                    await _send_error(
                        websocket,
                        "late_command",
                        f"Command tick is behind current tick {current_tick}.",
                    )
                continue
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await game_connection_hub.disconnect(lobby_id, websocket)
        removed = await _remove_presence(lobby_id, user_id)
        if removed:
            await game_connection_hub.broadcast(
                lobby_id,
                {
                    "type": "presence_clear",
                    "lobbyId": lobby_id,
                    "userId": user_id,
                },
            )
