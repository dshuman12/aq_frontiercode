from fastapi import Response
from server.config import get_app_config

class CookieUtils:
    @staticmethod
    def set_cookie(
        response: Response,
        name: str,
        value: str,
        *,
        max_age: int | None = None,
        expires: int | None = None,
        httponly: bool = False,
    ) -> None:
        cfg = get_app_config()
        domain = getattr(cfg, "JWT_COOKIE_DOMAIN", None)
        if getattr(cfg, "IS_DEV", False):
            domain = None
        response.set_cookie(
            key=name,
            value=value,
            max_age=max_age,
            expires=expires,
            path="/",
            domain=domain,
            secure=bool(cfg.JWT_COOKIE_SECURE),
            httponly=httponly,
            samesite=(cfg.JWT_COOKIE_SAMESITE or "Lax"),
        )

    @staticmethod
    def delete_cookie(response: Response, name: str) -> None:
        cfg = get_app_config()
        domain = getattr(cfg, "JWT_COOKIE_DOMAIN", None)
        if getattr(cfg, "IS_DEV", False):
            domain = None
        response.delete_cookie(
            key=name,
            path="/",
            domain=domain,
            secure=bool(cfg.JWT_COOKIE_SECURE),
            samesite=(cfg.JWT_COOKIE_SAMESITE or "Lax"),
        )