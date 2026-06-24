FROM node:22-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git make patch build-essential python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/frontiercode-repo
COPY repo/ .
RUN set -eux; \
    if command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages --upgrade pip pytest; fi; \
    for req in requirements.txt server/requirements.txt; do \
      if [ -f "$req" ] && command -v python3 >/dev/null 2>&1; then python3 -m pip install --break-system-packages -r "$req"; fi; \
    done; \
    node_install() { ( cd "$1" || exit 0; \
      corepack enable >/dev/null 2>&1 || true; \
      if [ -f bun.lockb ] || grep -q 'bun run' package.json 2>/dev/null; then \
        (command -v bun >/dev/null 2>&1 || npm install -g bun >/dev/null 2>&1) && bun install; \
      elif [ -f pnpm-lock.yaml ]; then (pnpm install --no-frozen-lockfile || npm install --legacy-peer-deps); \
      elif [ -f yarn.lock ]; then (yarn install || npm install --legacy-peer-deps); \
      else npm install --legacy-peer-deps; fi; \
      if grep -q '\"build\"' package.json 2>/dev/null; then (npm run build 2>/dev/null || bun run build 2>/dev/null || true); fi ); }; \
    if [ -f package.json ] && command -v node >/dev/null 2>&1; then node_install .; fi; \
    for pkg in frontend/package.json server/package.json; do \
      if [ -f "$pkg" ] && command -v node >/dev/null 2>&1; then node_install "$(dirname "$pkg")" || true; fi; \
    done; \
    mkdir -p /environment; \
    ln -s /testbed/frontiercode-repo /environment/repo

ENV PYTHONPATH=/testbed/frontiercode-repo:/testbed/frontiercode-repo/src

ENTRYPOINT []

