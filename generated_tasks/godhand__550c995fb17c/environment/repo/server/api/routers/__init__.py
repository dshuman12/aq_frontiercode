from .auth import auth_routes
from .developer_tools import developer_tools_routes
from .game_server_registry import game_server_registry_routes
from .health import health_routes
from .messaging import messaging_routes
from .lobby import lobby_routes
from server.api.websockets.lobby_chat import router as lobby_chat_ws_router
from server.api.websockets.lobby_game import router as lobby_game_ws_router

"""Router registration helpers for modular app composition."""


def register_http_routers(app):
    """Register HTTP routers used by control-plane APIs."""
    app.include_router(auth_routes)
    app.include_router(health_routes)
    app.include_router(messaging_routes)
    app.include_router(lobby_routes)
    app.include_router(game_server_registry_routes)
    app.include_router(developer_tools_routes)


def register_chat_ws_router(app):
    """Register lobby chat websocket router."""
    app.include_router(lobby_chat_ws_router)


def register_game_ws_router(app):
    """Register lobby game websocket router."""
    app.include_router(lobby_game_ws_router)


def register_routers(app, *, include_chat_ws: bool = True, include_game_ws: bool = True):
    """Register routers with optional realtime route inclusion."""
    register_http_routers(app)
    if include_chat_ws:
        register_chat_ws_router(app)
    if include_game_ws:
        register_game_ws_router(app)
