# Makefile is a convenience for contributors who don't have lattice
# installed yet. Once you've built bin/lattice, you can `eval
# "$(./bin/lattice completion bash)"` and use lattice itself.

.PHONY: build test lint fmt vet bench cover clean install

VERSION ?= $(shell git describe --tags --always 2>/dev/null || echo dev)
COMMIT  ?= $(shell git rev-parse HEAD 2>/dev/null || echo unknown)

LDFLAGS := -s -w \
	-X 'github.com/manojgowda/lattice/pkg/cli.Version=$(VERSION)' \
	-X 'github.com/manojgowda/lattice/pkg/cli.Commit=$(COMMIT)'

build:
	go build -trimpath -ldflags "$(LDFLAGS)" -o bin/lattice ./cmd/lattice

test:
	go test -race -count=1 -timeout=60s ./...

lint:
	go vet ./...
	@command -v golangci-lint >/dev/null 2>&1 && golangci-lint run ./... || echo "(skipping golangci-lint: not installed)"

fmt:
	gofmt -w -l .
	@command -v goimports >/dev/null 2>&1 && goimports -w -local github.com/manojgowda/lattice . || true

bench:
	go test -bench=. -benchmem -run=^$$ ./...

cover:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html
	@echo "open coverage.html in your browser"

clean:
	rm -rf bin/ dist/ coverage.out coverage.html .lattice/

install: build
	install -m 0755 bin/lattice $(GOPATH)/bin/lattice
