#!/usr/bin/env python3
from __future__ import annotations

import os
import sys
from pathlib import Path


def _load_env_file(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line[len("export ") :].strip()
        if "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        values[key] = value
    return values


def _is_true(raw: str | None) -> bool:
    if raw is None:
        return False
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _looks_local(raw: str | None) -> bool:
    if raw is None:
        return False
    val = raw.lower()
    return "localhost" in val or "127.0.0.1" in val


def main() -> int:
    env_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("server/.env")
    file_env = _load_env_file(env_path)
    merged_env = dict(file_env)
    merged_env.update(os.environ)

    errors: list[str] = []
    warnings: list[str] = []

    env_name = (merged_env.get("FASTAPI_ENV") or "").strip().lower()
    if env_name != "production":
        errors.append("FASTAPI_ENV must be 'production'.")

    required = [
        "SECRET_KEY",
        "JWT_SECRET_KEY",
        "GAME_SERVER_INTERNAL_TOKEN",
        "BACKEND_PUBLIC_BASE_URL",
        "FRONTEND_PUBLIC_BASE_URL",
    ]
    for key in required:
        if not (merged_env.get(key) or "").strip():
            errors.append(f"{key} is required.")

    for secret_key in ("SECRET_KEY", "JWT_SECRET_KEY", "GAME_SERVER_INTERNAL_TOKEN"):
        secret_val = (merged_env.get(secret_key) or "").encode("utf-8")
        if secret_val and len(secret_val) < 32:
            errors.append(f"{secret_key} must be at least 32 bytes.")

    if merged_env.get("SECRET_KEY") == merged_env.get("JWT_SECRET_KEY"):
        warnings.append("SECRET_KEY and JWT_SECRET_KEY are identical; use different values.")

    if not _is_true(merged_env.get("JWT_COOKIE_SECURE")):
        errors.append("JWT_COOKIE_SECURE must be true in production.")

    for url_key in ("BACKEND_PUBLIC_BASE_URL", "FRONTEND_PUBLIC_BASE_URL"):
        if _looks_local(merged_env.get(url_key)):
            errors.append(f"{url_key} points to localhost/127.0.0.1.")

    for url_key in ("GAME_WS_PUBLIC_BASE_URL", "CHAT_WS_PUBLIC_BASE_URL"):
        if _looks_local(merged_env.get(url_key)):
            warnings.append(f"{url_key} points to localhost/127.0.0.1.")

    cors_origins = (merged_env.get("CORS_ALLOWED_ORIGINS") or "").lower()
    if "localhost" in cors_origins or "127.0.0.1" in cors_origins:
        warnings.append("CORS_ALLOWED_ORIGINS includes localhost/127.0.0.1.")

    if errors:
        print("Preflight FAILED")
        for msg in errors:
            print(f"ERROR: {msg}")
        for msg in warnings:
            print(f"WARN:  {msg}")
        return 1

    print("Preflight OK")
    if warnings:
        for msg in warnings:
            print(f"WARN:  {msg}")
    else:
        print("No warnings.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
