from __future__ import annotations

import time
from collections import defaultdict, deque
from math import ceil
from threading import Lock

from fastapi import WebSocket

from server.config import get_app_config


class _SlidingWindowLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def consume(self, key: str, *, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        if max_requests <= 0 or window_seconds <= 0:
            return True, 0

        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            events = self._events[key]
            while events and events[0] <= cutoff:
                events.popleft()

            if len(events) >= max_requests:
                retry_after = max(1, int(ceil(window_seconds - (now - events[0]))))
                return False, retry_after

            events.append(now)
            return True, 0


_limiter = _SlidingWindowLimiter()


def _client_key(websocket: WebSocket) -> str:
    forwarded_for = (websocket.headers.get("x-forwarded-for") or "").split(",", 1)[0].strip()
    if forwarded_for:
        return forwarded_for
    if websocket.client and websocket.client.host:
        return websocket.client.host
    return "unknown"


def allow_connect(*, websocket: WebSocket, channel: str) -> tuple[bool, int]:
    cfg = get_app_config()
    return _limiter.consume(
        key=f"ws:connect:{channel}:{_client_key(websocket)}",
        max_requests=cfg.WS_RATE_LIMIT_CONNECT_MAX,
        window_seconds=cfg.WS_RATE_LIMIT_CONNECT_WINDOW_SECONDS,
    )


def allow_message(*, websocket: WebSocket, channel: str, user_id: str | None) -> tuple[bool, int]:
    cfg = get_app_config()
    principal = user_id or _client_key(websocket)
    return _limiter.consume(
        key=f"ws:message:{channel}:{principal}",
        max_requests=cfg.WS_RATE_LIMIT_MESSAGES_MAX,
        window_seconds=cfg.WS_RATE_LIMIT_MESSAGES_WINDOW_SECONDS,
    )

