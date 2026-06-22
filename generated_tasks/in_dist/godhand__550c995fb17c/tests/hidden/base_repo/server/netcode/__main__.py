from __future__ import annotations

import uvicorn

from .config import NetcodeSettings


def main() -> None:
    settings = NetcodeSettings.from_env()
    uvicorn.run(
        "netcode.app:app",
        host=settings.host,
        port=settings.port,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
