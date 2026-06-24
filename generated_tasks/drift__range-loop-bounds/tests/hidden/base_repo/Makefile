.PHONY: build test bench fmt vet lint clean install run repl

BINARY := drift
BUILD_DIR := build
VERSION := 0.2.0
GOFLAGS := -trimpath
LDFLAGS := -ldflags "-s -w -X main.version=$(VERSION)"

# Build the drift binary
build:
	@echo "Building $(BINARY)..."
	@mkdir -p $(BUILD_DIR)
	go build $(GOFLAGS) $(LDFLAGS) -o $(BUILD_DIR)/$(BINARY) ./cmd/drift

# Run all tests
test:
	@echo "Running tests..."
	go test ./... -count=1

# Run tests with verbose output
test-v:
	go test ./... -v -count=1

# Run tests with coverage
cover:
	@echo "Running tests with coverage..."
	go test ./... -coverprofile=coverage.out
	go tool cover -func=coverage.out
	@rm -f coverage.out

# Run benchmarks
bench:
	@echo "Running benchmarks..."
	go test ./integration/ -bench=. -benchmem -count=3

# Format source code
fmt:
	@echo "Formatting..."
	gofmt -w -s .

# Run go vet
vet:
	@echo "Vetting..."
	go vet ./...

# Run all checks (fmt + vet + test)
check: fmt vet test

# Clean build artifacts
clean:
	@echo "Cleaning..."
	@rm -rf $(BUILD_DIR)
	@rm -f coverage.out

# Install to $GOPATH/bin
install:
	go install ./cmd/drift

# Run a drift file
run:
	@test -n "$(FILE)" || (echo "Usage: make run FILE=examples/fibonacci.drift" && exit 1)
	go run ./cmd/drift $(FILE)

# Start the REPL
repl:
	go run ./cmd/drift

# Show lines of code
loc:
	@echo "Lines of Go code:"
	@find . -name '*.go' -not -path './.git/*' | xargs wc -l | tail -1
	@echo "Test count:"
	@grep -r 'func Test\|func Benchmark' --include='*.go' | wc -l

# Run all examples
examples:
	@for f in examples/*.drift; do \
		echo "=== Running $$f ==="; \
		go run ./cmd/drift "$$f" || true; \
		echo ""; \
	done