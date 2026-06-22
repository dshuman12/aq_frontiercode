"""
FastAPI application entrypoint.

This module wires up routers, middleware, error handlers, service initialization,
and serves the static frontend from `frontend/`.
"""
from __future__ import annotations
import os
from fastapi import FastAPI
import time
import uvicorn

from server.utils.logging import get_app_logger
app_logger = get_app_logger()

# Import Services
from server.external import initialize_services

# Import MiddleWare
from server.api.middleware.middleware import register_middleware
from server.api.security.rate_limit import initialize_auth_rate_limiter
from server.config import get_app_config
from server.utils.startup_alerts import emit_startup_alerts

# Import Routers
from server.api.routers import register_routers

# Import Error Handler
from server.utils.error_handlers import register_error_handlers

def create_app() -> FastAPI:
    """Create FastAPI application."""
    # Create FastAPI and Register HTTP Endpoints
    init_time = time.time()
    fastapi_app = FastAPI()
    cfg = get_app_config()

    # Register Error Handlers
    start_time = time.time()
    register_error_handlers(fastapi_app)
    app_logger.info(f"Registered error handlers [{time.time() - start_time:.5f}s]")

    # Register Middleware
    start_time = time.time()
    register_middleware(fastapi_app)
    app_logger.info(f"Registered middleware [{time.time() - start_time:.5f}s]")

    # Initialize rate limiter
    start_time = time.time()
    initialize_auth_rate_limiter(fastapi_app)
    app_logger.info(f"Initialized auth rate limiter [{time.time() - start_time:.5f}s]")

    # Routers
    start_time = time.time()
    register_routers(
        fastapi_app,
        include_chat_ws=True,
        include_game_ws=cfg.MAIN_APP_INCLUDE_GAME_WS,
    )
    app_logger.info(f"Registered routers [{time.time() - start_time:.2f}s]")

    emit_startup_alerts(cfg=cfg, logger=app_logger, service_name="api")

    # Service Initialization
    start_time = time.time()
    initialize_services()
    app_logger.info(f"Initialized services [{time.time() - start_time:.5f}s]")

    # Total Initialization Time
    app_logger.info(f"Total initialization time: [{time.time() - init_time:.5f}s]")
    return fastapi_app


app = create_app()
