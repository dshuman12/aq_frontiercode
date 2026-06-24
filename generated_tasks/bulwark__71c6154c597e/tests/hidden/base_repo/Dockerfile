FROM python:3.12.7-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml /app/pyproject.toml
COPY src /app/src

RUN pip install --upgrade pip==24.2 \
    && pip install hatchling==1.25.0 \
    && pip install \
        "h11==0.14.0" \
        "anyio==4.6.0" \
        "httpx==0.27.2" \
        "pydantic==2.9.2" \
        "structlog==24.4.0" \
        "typer==0.12.5" \
        "pyyaml==6.0.2"

COPY . /app

ENV PYTHONPATH=/app/src

EXPOSE 7878

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["python", "-m", "bulwark", "--help"]
