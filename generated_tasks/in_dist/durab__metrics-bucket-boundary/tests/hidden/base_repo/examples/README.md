# examples

These are starter modules that exercise the host ABI from inside a
WASM workflow / activity.

Building the modules requires either TinyGo (recommended) or Rust with
the `wasm32-unknown-unknown` target. The repository does not check in
compiled `.wasm` artifacts; they are produced by `make examples` in
each subdirectory.

The simplest example:

```
$ tinygo build -o hello-wf.wasm -target=wasi -no-debug ./hello/
$ durab-server -db ./durab.db &
$ durab-worker -db ./durab.db -wf Hello=hello-wf.wasm -queue default &
$ durabctl start -id hello-1 -type Hello -queue default
```

The `hello/` workflow simply completes itself with a fixed result. See
the inline comments for the host-function pattern.
