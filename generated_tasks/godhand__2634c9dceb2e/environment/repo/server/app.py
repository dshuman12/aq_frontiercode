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

# Import Routers
from server.api.routers import register_routers

# Import Error Handler
from server.utils.error_handlers import register_error_handlers

def create_app() -> FastAPI:
    """Create FastAPI application."""
    # Create FastAPI and Register HTTP Endpoints
    init_time = time.time()
    fastapi_app = FastAPI()

    # Register Error Handlers
    start_time = time.time()
    register_error_handlers(fastapi_app)
    app_logger.info(f"Registered error handlers [{time.time() - start_time:.5f}s]")

    # Register Middleware
    start_time = time.time()
    register_middleware(fastapi_app)
    app_logger.info(f"Registered middleware [{time.time() - start_time:.5f}s]")

    # Routers
    start_time = time.time()
    register_routers(fastapi_app)
    app_logger.info(f"Registered routers [{time.time() - start_time:.2f}s]")

    # Service Initialization
    start_time = time.time()
    initialize_services()
    app_logger.info(f"Initialized services [{time.time() - start_time:.5f}s]")

    # Total Initialization Time
    app_logger.info(f"Total initialization time: [{time.time() - init_time:.5f}s]")
    return fastapi_app


app = create_app()
