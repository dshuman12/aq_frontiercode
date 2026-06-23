# durab

durable workflow engine. activities run as wasm.

## quickstart

```
make build
./bin/durab-server -db ./durab.db &
./bin/durab-worker -db ./durab.db -wf Hello=examples/hello/hello.wasm
./bin/durabctl start -id h1 -type Hello -queue default
./bin/durabctl describe h1 <run-id>
```

see `examples/` for sample workflows. host abi is in `internal/wasm/abi.go`.
