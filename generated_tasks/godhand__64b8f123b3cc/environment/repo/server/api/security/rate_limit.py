from __future__ import annotations

import time
from collections import defaultdict, deque
from dataclasses import dataclass
from math import ceil
from threading import Lock
from typing import Callable

from fastapi import FastAPI, HTTPException, Request

from server.config import BaseConfig, get_app_config
from server.utils.constants import HttpStatus, ResponseMessages
from server.utils.logging import get_auth_logger

auth_logger = get_auth_logger()


@dataclass(frozen=True)
class RateLimitRule:
    max_requests: int
    window_seconds: int


class InMemorySlidingWindowLimiter:
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

    def reset(self) -> None:
        with self._lock:
            self._events.clear()


class AuthRateLimiter:
    def __init__(self, cfg: BaseConfig) -> None:
        self._limiter = InMemorySlidingWindowLimiter()
        self._rules = {
            "login": RateLimitRule(
                max_requests=cfg.AUTH_RATE_LIMIT_LOGIN_MAX,
                window_seconds=cfg.AUTH_RATE_LIMIT_LOGIN_WINDOW_SECONDS,
            ),
            "register": RateLimitRule(
                max_requests=cfg.AUTH_RATE_LIMIT_REGISTER_MAX,
                window_seconds=cfg.AUTH_RATE_LIMIT_REGISTER_WINDOW_SECONDS,
            ),
        }

    def enforce(self, bucket: str, request: Request) -> None:
        rule = self._rules.get(bucket)
        if rule is None:
            return

        client_key = self._client_key(request)
        key = f"{bucket}:{client_key}"
        allowed, retry_after = self._limiter.consume(
            key, max_requests=rule.max_requests, window_seconds=rule.window_seconds
        )

        if allowed:
            return

        auth_logger.warning(
            "Rate limit exceeded: bucket=%s client=%s limit=%s window=%ss",
            bucket,
            client_key,
            rule.max_requests,
            rule.window_seconds,
        )
        raise HTTPException(
            status_code=HttpStatus.TOO_MANY_REQUESTS,
            detail=ResponseMessages.RATE_LIMIT_EXCEEDED,
            headers={"Retry-After": str(retry_after)},
        )

    def reset(self) -> None:
        self._limiter.reset()

    @staticmethod
    def _client_key(request: Request) -> str:
        forwarded_for = (request.headers.get("x-forwarded-for") or "").split(",", 1)[0].strip()
        if forwarded_for:
            return forwarded_for
        if request.client and request.client.host:
            return request.client.host
        return "unknown"


def initialize_auth_rate_limiter(app: FastAPI) -> None:
    app.state.auth_rate_limiter = AuthRateLimiter(get_app_config())


def require_rate_limit(bucket: str) -> Callable[[Request], None]:
    def dependency(request: Request) -> None:
        limiter: AuthRateLimiter | None = getattr(request.app.state, "auth_rate_limiter", None)
        if limiter is None:
            limiter = AuthRateLimiter(get_app_config())
            request.app.state.auth_rate_limiter = limiter
        limiter.enforce(bucket, request)

    return dependency


limit_login_rate = require_rate_limit("login")
limit_register_rate = require_rate_limit("register")
