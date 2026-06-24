import hmac
from secrets import token_urlsafe
from fastapi import Request, Response
from fastapi import Depends
from server.config import get_app_config
from server.utils.constants import TokenExpiry, ResponseMessages
from server.utils.logging import get_app_logger
from server.api.security.cookies import CookieUtils
from server.utils.error_handlers import AuthenticationError

app_logger = get_app_logger()

_ANON_CSRF_COOKIE = "anon_csrf"

class Csrf:
    @staticmethod
    def issue_anon_csrf_token(response: Response, *, token: str | None = None) -> str:
        token_value = token or token_urlsafe(32)
        # 4 hours (TokenExpiry.CSRF_TOKEN_HOURS)
        max_age = int(TokenExpiry.CSRF_TOKEN_HOURS * 60 * 60)
        CookieUtils.set_cookie(
            response, _ANON_CSRF_COOKIE, token_value, max_age=max_age, httponly=False
        )
        app_logger.info("Issued anonymous CSRF token")
        return token_value

    @staticmethod
    def clear_anon_csrf(response: Response) -> None:
        CookieUtils.delete_cookie(response, _ANON_CSRF_COOKIE)

    @staticmethod
    def verify_header_matches_cookie(request: Request) -> None:
        cfg = get_app_config()
        header_name = (cfg.CSRF_HEADER_NAME or "X-CSRF-TOKEN")
        header_val = request.headers.get(header_name)
        cookie_val = request.cookies.get(_ANON_CSRF_COOKIE)

        if not header_val or not cookie_val:
            app_logger.warning("Anonymous CSRF missing (header or cookie)")
            raise AuthenticationError(ResponseMessages.CSRF_TOKEN_INVALID)

        if not hmac.compare_digest(header_val, cookie_val):
            app_logger.warning("Anonymous CSRF mismatch")
            raise AuthenticationError(ResponseMessages.CSRF_TOKEN_INVALID)

def verify_anon_csrf(request: Request = None) -> None:
    # request is injected by FastAPI automatically
    Csrf.verify_header_matches_cookie(request)