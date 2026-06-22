from .auth import auth_routes
from .messaging import messaging_routes
from server.api.websockets.lobby_chat import router as lobby_chat_ws_router

"""Define the register_routers function"""
def register_routers(app):
    """Register FASTAPI routers."""
    app.include_router(auth_routes)
    app.include_router(messaging_routes)
    app.include_router(lobby_chat_ws_router)
