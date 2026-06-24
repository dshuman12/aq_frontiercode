FROM golang:1.22.3-bookworm

ENTRYPOINT []

WORKDIR /testbed/Drift

COPY . .

RUN go build ./cmd/drift/

RUN go test ./... -count=1