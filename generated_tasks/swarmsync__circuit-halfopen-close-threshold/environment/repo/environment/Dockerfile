FROM golang:1.22.3-bookworm

ENTRYPOINT []

WORKDIR /testbed/SwarmSync

COPY . .

RUN go build ./cmd/swarmsync/

RUN go test ./... -count=1 -timeout=120s