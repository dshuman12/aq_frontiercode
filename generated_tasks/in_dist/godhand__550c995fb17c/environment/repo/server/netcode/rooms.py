from __future__ import annotations

import asyncio
import json
import time
from dataclasses import dataclass, field
from typing import Any

from fastapi import WebSocket
from starlette.websockets import WebSocketDisconnect

from .config import NetcodeSettings
from .models import CommandEnvelope, CommandResult, RoomState
from .models import PlayerState
from .persistence import SQLiteWorldStore
from .protocol import ProtocolError, decode_client_envelope, encode_server_payload
from .simulation import (
    ResourceCatalog,
    advance_room_tick,
    apply_command,
    create_new_room_state,
    room_snapshot,
)


def _unix_ms() -> int:
    return int(time.time() * 1000)


@dataclass(slots=True)
class RoomClient:
    player_id: str
    display_name: str
    role: str
    socket: WebSocket
    send_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


class RoomSession:
    def __init__(
        self,
        *,
        settings: NetcodeSettings,
        store: SQLiteWorldStore,
        catalog: ResourceCatalog,
        state: RoomState,
    ) -> None:
        self.settings = settings
        self.store = store
        self.catalog = catalog
        self.state = state

        self._clients: dict[str, RoomClient] = {}
        self._state_lock = asyncio.Lock()
        self._stop_event = asyncio.Event()
        self._tick_task: asyncio.Task[None] | None = None

        self._last_activity = time.monotonic()
        self._dirty = False

    @property
    def room_id(self) -> str:
        return self.state.room_id

    @property
    def connected_count(self) -> int:
        return len(self._clients)

    async def start(self) -> None:
        if self._tick_task is None:
            self._tick_task = asyncio.create_task(self._tick_loop(), name=f"netcode-room-{self.room_id}")

    async def stop(self) -> None:
        self._stop_event.set()
        if self._tick_task is not None:
            await self._tick_task
            self._tick_task = None
        await self.force_save()

    async def force_save(self) -> None:
        async with self._state_lock:
            snapshot = self.state.model_copy(deep=True)
            self._dirty = False
        await asyncio.to_thread(self.store.save_room_state, snapshot)

    async def replace_state(self, new_state: RoomState) -> None:
        async with self._state_lock:
            self.state = new_state
            self._dirty = False
        await self.broadcast({"type": "snapshot", "room": room_snapshot(self.state, self.catalog)})

    def is_idle(self, ttl_sec: int) -> bool:
        if self._clients:
            return False
        idle_sec = time.monotonic() - self._last_activity
        return idle_sec >= ttl_sec

    async def join(self, websocket: WebSocket, *, player_id: str, display_name: str, role: str) -> RoomClient:
        async with self._state_lock:
            if len(self._clients) >= self.settings.max_players_per_room:
                raise RuntimeError("room_full")

            existing = self._clients.get(player_id)
            if existing is not None:
                await self._safe_send(existing, {"type": "error", "code": "replaced", "message": "session replaced"})
                await existing.socket.close(code=4001, reason="replaced")
                self._clients.pop(player_id, None)

            player_state = self.state.players.get(player_id)
            if player_state is None:
                self.state.players[player_id] = player_state = PlayerState(
                    player_id=player_id,
                    display_name=display_name,
                    role=role,
                    connected=True,
                    last_seen_ms=_unix_ms(),
                    joined_tick=self.state.tick,
                )
            else:
                player_state.display_name = display_name
                player_state.role = role
                player_state.connected = True
                player_state.last_seen_ms = _unix_ms()

            client = RoomClient(
                player_id=player_id,
                display_name=display_name,
                role=role,
                socket=websocket,
            )
            self._clients[player_id] = client
            self._last_activity = time.monotonic()

            payload = {
                "type": "hello",
                "room_id": self.room_id,
                "player_id": player_id,
                "tick_rate_hz": self.settings.tick_rate_hz,
                "snapshot_rate_hz": self.settings.snapshot_rate_hz,
                "room": room_snapshot(self.state, self.catalog),
            }

        await self._safe_send(client, payload)
        await self.broadcast({"type": "player_joined", "player_id": player_id, "display_name": display_name})
        return client

    async def leave(self, client: RoomClient) -> None:
        async with self._state_lock:
            self._clients.pop(client.player_id, None)
            player_state = self.state.players.get(client.player_id)
            if player_state is not None:
                player_state.connected = False
                player_state.last_seen_ms = _unix_ms()
            self._last_activity = time.monotonic()
            self._dirty = True
        await self.broadcast({"type": "player_left", "player_id": client.player_id})

    async def handle_client_text(self, client: RoomClient, text: str) -> None:
        try:
            envelope = decode_client_envelope(text, max_bytes=self.settings.max_message_bytes)
        except ProtocolError as exc:
            await self._safe_send(
                client,
                {
                    "type": "error",
                    "code": exc.code,
                    "message": exc.message,
                },
            )
            return

        self._last_activity = time.monotonic()
        player_state = self.state.players.get(client.player_id)
        if player_state:
            player_state.last_seen_ms = _unix_ms()

        if envelope.kind == "ping":
            await self._safe_send(
                client,
                {
                    "type": "pong",
                    "seq": envelope.seq,
                    "server_time_ms": _unix_ms(),
                    "client_time_ms": envelope.client_time_ms,
                },
            )
            return

        assert isinstance(envelope, CommandEnvelope)

        async with self._state_lock:
            result: CommandResult = apply_command(
                self.state,
                self.catalog,
                player_id=client.player_id,
                player_role=client.role,
                command=envelope.data,
            )
            tick_value = self.state.tick
            if result.state_changed:
                self._dirty = True
                snapshot_payload: dict[str, Any] | None = {"type": "snapshot", "room": room_snapshot(self.state, self.catalog)}
            else:
                snapshot_payload = None

        if self.settings.command_audit_enabled:
            await asyncio.to_thread(
                self.store.log_command,
                room_id=self.room_id,
                player_id=client.player_id,
                tick=tick_value,
                seq=envelope.seq,
                command_json=json.dumps(envelope.data.model_dump(mode="json"), separators=(",", ":")),
                accepted=result.accepted,
                reason=result.reason,
            )

        await self._safe_send(
            client,
            {
                "type": "ack",
                "seq": envelope.seq,
                "tick": tick_value,
                "accepted": result.accepted,
                "reason": result.reason,
            },
        )
        if snapshot_payload is not None:
            await self.broadcast(snapshot_payload)

    async def broadcast(self, payload: dict[str, Any]) -> None:
        if not self._clients:
            return
        clients = list(self._clients.values())
        for client in clients:
            await self._safe_send(client, payload)

    async def _safe_send(self, client: RoomClient, payload: dict[str, Any]) -> None:
        try:
            async with client.send_lock:
                await client.socket.send_text(encode_server_payload(payload))
        except WebSocketDisconnect:
            pass
        except RuntimeError:
            pass
        except Exception:
            pass

    async def _tick_loop(self) -> None:
        tick_interval = 1.0 / max(1, self.settings.tick_rate_hz)
        snapshot_interval_ticks = max(1, self.settings.tick_rate_hz // max(1, self.settings.snapshot_rate_hz))
        next_autosave_at = time.monotonic() + self.settings.autosave_interval_sec

        while not self._stop_event.is_set():
            loop_start = time.monotonic()
            snapshot_payload: dict[str, Any] | None = None
            state_to_save: RoomState | None = None

            async with self._state_lock:
                state_changed = advance_room_tick(self.state, self.catalog, self.settings.tick_rate_hz)
                if state_changed:
                    self._dirty = True

                if self.state.tick % snapshot_interval_ticks == 0:
                    snapshot_payload = {"type": "snapshot", "room": room_snapshot(self.state, self.catalog)}

                now = time.monotonic()
                if self._dirty and now >= next_autosave_at:
                    state_to_save = self.state.model_copy(deep=True)
                    self._dirty = False
                    next_autosave_at = now + self.settings.autosave_interval_sec

            if state_to_save is not None:
                await asyncio.to_thread(self.store.save_room_state, state_to_save)

            if snapshot_payload is not None:
                await self.broadcast(snapshot_payload)

            elapsed = time.monotonic() - loop_start
            await asyncio.sleep(max(0.001, tick_interval - elapsed))


class RoomManager:
    def __init__(self, *, settings: NetcodeSettings, store: SQLiteWorldStore, catalog: ResourceCatalog) -> None:
        self.settings = settings
        self.store = store
        self.catalog = catalog

        self._sessions: dict[str, RoomSession] = {}
        self._lock = asyncio.Lock()
        self._cleanup_task: asyncio.Task[None] | None = None
        self._stop_event = asyncio.Event()

    async def start(self) -> None:
        if self._cleanup_task is None:
            self._cleanup_task = asyncio.create_task(self._cleanup_loop(), name="netcode-room-cleanup")

    async def shutdown(self) -> None:
        self._stop_event.set()
        if self._cleanup_task is not None:
            await self._cleanup_task
            self._cleanup_task = None

        async with self._lock:
            sessions = list(self._sessions.values())
            self._sessions.clear()
        for session in sessions:
            await session.stop()

    async def get_or_create_room(self, room_id: str, *, seed: int | None = None) -> RoomSession:
        async with self._lock:
            existing = self._sessions.get(room_id)
        if existing is not None:
            return existing

        loaded_state = await asyncio.to_thread(self.store.load_room_state, room_id)
        if loaded_state is None:
            loaded_state = create_new_room_state(
                room_id,
                seed=seed,
                width=self.settings.world_width,
                height=self.settings.world_height,
                catalog=self.catalog,
            )

        session = RoomSession(settings=self.settings, store=self.store, catalog=self.catalog, state=loaded_state)
        await session.start()

        async with self._lock:
            existing = self._sessions.get(room_id)
            if existing is not None:
                await session.stop()
                return existing
            self._sessions[room_id] = session
            return session

    async def save_room(self, room_id: str) -> tuple[bool, str, dict[str, Any] | None]:
        async with self._lock:
            session = self._sessions.get(room_id)
        if session is None:
            loaded = await asyncio.to_thread(self.store.load_room_state, room_id)
            if loaded is None:
                return False, "room_not_found", None
            return True, "room_already_saved", room_snapshot(loaded, self.catalog)

        await session.force_save()
        return True, "room_saved", room_snapshot(session.state, self.catalog)

    async def load_room(self, room_id: str) -> tuple[bool, str, dict[str, Any] | None]:
        loaded = await asyncio.to_thread(self.store.load_room_state, room_id)
        if loaded is None:
            return False, "room_not_found", None

        async with self._lock:
            session = self._sessions.get(room_id)

        if session is None:
            session = RoomSession(settings=self.settings, store=self.store, catalog=self.catalog, state=loaded)
            await session.start()
            async with self._lock:
                self._sessions[room_id] = session
        else:
            await session.replace_state(loaded)

        return True, "room_loaded", room_snapshot(session.state, self.catalog)

    async def list_rooms(self) -> list[dict[str, Any]]:
        saved = await asyncio.to_thread(self.store.list_saved_rooms)
        saved_map = {entry["room_id"]: entry for entry in saved}

        async with self._lock:
            sessions = list(self._sessions.values())

        summaries: list[dict[str, Any]] = []
        now_unix = int(time.time())

        for session in sessions:
            summary = {
                "room_id": session.room_id,
                "tick": session.state.tick,
                "players_connected": session.connected_count,
                "players_total": len(session.state.players),
                "buildings": len(session.state.buildings),
                "updated_at_unix": saved_map.get(session.room_id, {}).get("updated_at_unix", now_unix),
                "active_in_memory": True,
            }
            summaries.append(summary)
            saved_map.pop(session.room_id, None)

        for room_id, saved_entry in saved_map.items():
            summaries.append(
                {
                    "room_id": room_id,
                    "tick": 0,
                    "players_connected": 0,
                    "players_total": 0,
                    "buildings": 0,
                    "updated_at_unix": saved_entry["updated_at_unix"],
                    "active_in_memory": False,
                }
            )

        summaries.sort(key=lambda entry: entry["updated_at_unix"], reverse=True)
        return summaries

    def counts(self) -> tuple[int, int]:
        rooms = list(self._sessions.values())
        return len(rooms), sum(session.connected_count for session in rooms)

    async def _cleanup_loop(self) -> None:
        while not self._stop_event.is_set():
            await asyncio.sleep(self.settings.cleanup_interval_sec)

            async with self._lock:
                idle_room_ids = [
                    room_id
                    for room_id, session in self._sessions.items()
                    if session.is_idle(self.settings.idle_room_ttl_sec)
                ]
                idle_sessions = [self._sessions.pop(room_id) for room_id in idle_room_ids]

            for session in idle_sessions:
                await session.stop()
