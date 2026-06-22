from __future__ import annotations

from server.config import BaseConfig


def emit_startup_alerts(*, cfg: BaseConfig, logger, service_name: str) -> None:
    """
    Lightweight production startup warnings to reduce obvious misconfiguration risk.
    Intentionally log-only (no hard fail) to keep student project ops simple.
    """
    if cfg.IS_DEV:
        return

    if not cfg.JWT_COOKIE_SECURE:
        logger.warning("[%s ALERT] JWT_COOKIE_SECURE=false in production.", service_name)

    samesite = (cfg.JWT_COOKIE_SAMESITE or "").strip().lower()
    if samesite == "none" and not cfg.JWT_COOKIE_SECURE:
        logger.warning(
            "[%s ALERT] JWT_COOKIE_SAMESITE=None requires JWT_COOKIE_SECURE=true in browsers.",
            service_name,
        )

    if cfg.SECRET_KEY == cfg.JWT_SECRET_KEY:
        logger.warning("[%s ALERT] SECRET_KEY and JWT_SECRET_KEY should not be identical.", service_name)

    local_origins = [
        origin
        for origin in cfg.CORS_ALLOWED_ORIGINS
        if "localhost" in origin.lower() or "127.0.0.1" in origin.lower()
    ]
    if local_origins:
        logger.warning(
            "[%s ALERT] Localhost origins present in production CORS_ALLOWED_ORIGINS: %s",
            service_name,
            ",".join(local_origins),
        )

