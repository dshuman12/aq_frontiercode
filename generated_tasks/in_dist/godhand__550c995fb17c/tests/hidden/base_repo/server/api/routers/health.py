from fastapi import APIRouter, Request

from server.utils.logging import get_app_logger

app_logger = get_app_logger()

health_routes = APIRouter(tags=["health"])


@health_routes.get("/health")
def health_check(request: Request):
    client_host = request.client.host if request.client else "unknown"
    app_logger.info(f"Health check received from {client_host}")
    return {"status": "ok"}
