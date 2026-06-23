FROM python:3.12-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates git patch \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /testbed/frontiercode-repo
COPY repo/ .
RUN python3 -m pip install --break-system-packages --upgrade pip pytest
RUN mkdir -p /environment && ln -s /testbed/frontiercode-repo /environment/repo

ENTRYPOINT []

