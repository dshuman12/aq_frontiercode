FROM golang:1.25-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git make patch build-essential python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/frontiercode-repo
COPY repo/ .
RUN set -eux; \
    if command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages pytest; fi; \
    for req in requirements.txt server/requirements.txt; do \
      if [ -f "$req" ] && command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages -r "$req"; fi; \
    done; \
    for pkg in package.json frontend/package.json; do \
      if [ -f "$pkg" ] && command -v npm >/dev/null 2>&1; then (cd "$(dirname "$pkg")" && npm install --legacy-peer-deps); fi; \
    done; \
    mkdir -p /environment; \
    ln -s /testbed/frontiercode-repo /environment/repo

ENTRYPOINT []
