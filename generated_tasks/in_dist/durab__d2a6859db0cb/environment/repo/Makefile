.PHONY: build test cover lint run-server run-worker examples clean

build:
	go build ./...
	go build -o bin/durab-server ./cmd/durab-server
	go build -o bin/durab-worker ./cmd/durab-worker
	go build -o bin/durabctl ./cmd/durabctl

test:
	go test -race ./...

cover:
	go test -race -coverprofile=coverage.out ./...
	go tool cover -func=coverage.out | tail -1

lint:
	go vet ./...

run-server: build
	./bin/durab-server -db ./durab.db -log debug

run-worker: build
	./bin/durab-worker -db ./durab.db -queue default

examples:
	$(MAKE) -C examples/hello

clean:
	rm -rf bin/ coverage.out *.db *.db-wal *.db-shm
