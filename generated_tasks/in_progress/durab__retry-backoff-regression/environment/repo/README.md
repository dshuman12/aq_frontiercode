# durab

durable workflow engine. activities run as wasm.

## quickstart

```
make build
./bin/durab-server -db ./durab.db &
./bin/durab-worker -db ./durab.db -wf Hello=examples/hello/hello.wasm
./bin/durabctl start -id h1 -type Hello -queue default
./bin/durabctl describe h1 <run-id>
./bin/durabctl wait h1 <run-id>
```

the server listens on `:7233` by default. open `http://localhost:7233/`
in a browser for a tiny operator UI (list runs, start one, watch status).

see `examples/` for sample workflows. host abi is in `internal/wasm/abi.go`.

## layout

```
cmd/      server, worker and ctl binaries
internal/ engine, storage, wasm runtime, api, ui
pkg/      public client sdk and shared types
```

## testing

```
make test
make vet
make cover
```
