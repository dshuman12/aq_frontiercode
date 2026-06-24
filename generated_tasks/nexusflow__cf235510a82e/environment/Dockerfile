FROM python:3.12-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git make patch build-essential python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/frontiercode-repo
COPY repo/ .
RUN set -eux; \
    if command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages --upgrade pip pytest; fi; \
    for req in requirements.txt server/requirements.txt; do \
      if [ -f "$req" ] && command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages -r "$req"; fi; \
    done; \
    if command -v python3 >/dev/null 2>&1 && { [ -f pyproject.toml ] || [ -f setup.py ] || [ -f setup.cfg ]; }; then \
      python3 -m pip install --break-system-packages -e . 2>/dev/null || python3 -m pip install --break-system-packages . 2>/dev/null || true; \
      for ex in test tests dev testing; do python3 -m pip install --break-system-packages -e ".[$ex]" 2>/dev/null || true; done; \
    fi; \
    if command -v python3 >/dev/null 2>&1 && grep -rqsE 'asyncio_mode|pytest-asyncio' pyproject.toml pytest.ini setup.cfg tox.ini 2>/dev/null; then \
      python3 -m pip install --break-system-packages pytest-asyncio 2>/dev/null || true; \
    fi; \
    for pkg in package.json frontend/package.json; do \
      if [ -f "$pkg" ] && command -v npm >/dev/null 2>&1; then (cd "$(dirname "$pkg")" && npm install --legacy-peer-deps); fi; \
    done; \
    mkdir -p /environment; \
    ln -s /testbed/frontiercode-repo /environment/repo

ENTRYPOINT []

