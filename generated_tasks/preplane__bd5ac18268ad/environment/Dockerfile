FROM node:20-bookworm
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates curl git make patch python3 python3-pip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/frontiercode-repo
COPY repo/ .
RUN set -eux; \
    npm install --legacy-peer-deps; \
    mkdir -p /environment; \
    ln -s /testbed/frontiercode-repo /environment/repo

ENTRYPOINT []
