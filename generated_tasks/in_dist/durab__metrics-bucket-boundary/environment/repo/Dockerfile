FROM golang:1.25-bookworm

ENV CGO_ENABLED=0 \
    GOFLAGS="-mod=mod -buildvcs=false" \
    GOCACHE=/root/.cache/go-build \
    GOPATH=/go \
    PATH="/usr/local/bin:/go/bin:${PATH}"

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o /usr/local/bin/durab-server ./cmd/durab-server \
 && go build -o /usr/local/bin/durab-worker ./cmd/durab-worker \
 && go build -o /usr/local/bin/durabctl     ./cmd/durabctl

EXPOSE 7233

CMD ["bash"]
