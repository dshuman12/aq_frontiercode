# syntax=docker/dockerfile:1.7
#
# kindling container image.
#
# Multi-stage:
#   builder  - Go toolchain, compiles the static binary
#   runtime  - distroless / debian:slim with the bare binary
#
# kindling has no runtime persistence; bind whichever log directories
# you want it to read at /data.

ARG GO_VERSION=1.22
ARG DEBIAN_VERSION=bookworm-20240926-slim

# ---------- builder ----------
FROM golang:${GO_VERSION}-bookworm AS builder

ENV CGO_ENABLED=0 \
    GOFLAGS="-trimpath" \
    GO111MODULE=on

WORKDIR /src

COPY go.mod ./
COPY cmd ./cmd
COPY internal ./internal
COPY integration ./integration

RUN go build -ldflags="-s -w" -o /out/kindling ./cmd/kindling


# ---------- runtime ----------
FROM debian:${DEBIAN_VERSION} AS runtime

ARG BUILD_DATE
ARG REVISION
ARG VERSION=0.6.0

LABEL org.opencontainers.image.title="kindling" \
      org.opencontainers.image.description="Self-hosted structured log analyzer for small operations." \
      org.opencontainers.image.source="https://github.com/kindling-tools/kindling" \
      org.opencontainers.image.url="https://github.com/kindling-tools/kindling" \
      org.opencontainers.image.documentation="https://github.com/kindling-tools/kindling/blob/main/README.md" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.vendor="kindling maintainers" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}" \
      org.opencontainers.image.created="${BUILD_DATE}"

ENV KINDLING_DATA_DIR=/data \
    KINDLING_CACHE_DIR=/data/cache \
    KINDLING_LOG_FORMAT=json \
    KINDLING_LOG_LEVEL=info \
    TZ=UTC

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates tzdata \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1110 kindler \
    && useradd --system --uid 1110 --gid 1110 --home /var/lib/kindling --shell /usr/sbin/nologin kindler \
    && install -d -o kindler -g kindler -m 0750 /data /data/cache /var/lib/kindling

COPY --from=builder --chown=root:root /out/kindling /usr/local/bin/kindling
COPY --chown=root:root LICENSE NOTICE /usr/local/share/kindling/

USER kindler
WORKDIR /var/lib/kindling

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD ["/usr/local/bin/kindling", "healthcheck"]

STOPSIGNAL SIGTERM

ENTRYPOINT ["/usr/local/bin/kindling"]
CMD ["--help"]
