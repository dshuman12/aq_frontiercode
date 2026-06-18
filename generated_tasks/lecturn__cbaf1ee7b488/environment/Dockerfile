FROM node:22-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git make patch build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY repo/ /tmp/frontiercode-repo/
RUN set -eux; \
    if command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages --upgrade pip pytest; fi; \
    for req in /tmp/frontiercode-repo/requirements.txt /tmp/frontiercode-repo/server/requirements.txt; do \
      if [ -f "$req" ] && command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages -r "$req"; fi; \
    done; \
    for pkg in /tmp/frontiercode-repo/package.json /tmp/frontiercode-repo/frontend/package.json; do \
      if [ -f "$pkg" ] && command -v npm >/dev/null 2>&1; then (cd "$(dirname "$pkg")" && npm install --legacy-peer-deps); fi; \
    done; \
    rm -rf /tmp/frontiercode-repo

WORKDIR /app

