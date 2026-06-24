# bulwark

A small HTTP filtering reverse-proxy and rule engine. Drop it in front
of an internal service and write rules in a tiny typed DSL instead of
hand-coding nginx maps and lua snippets.

```bash
$ cat << 'EOF' > rules.cdn
phase pre_route {
    rule block_admin {
        when path matches "^/admin" and not header.x-internal == "1"
        then block(status=403, reason="admin path")
    }
    rule rate_login {
        when path == "/login" and method == "POST"
        then limit(key=ident.client_ip, rate="5/min")
    }
}
EOF

$ bulwark serve --rules rules.cdn --upstream http://127.0.0.1:8000
bulwark listening on 127.0.0.1:7878 → 127.0.0.1:8000
```

## why

We had three nginx maps, two lua scripts, a sidecar that did rate
limiting in redis, and nobody was sure which file actually decided whether
a request got through. bulwark is the answer to "can we just write the
rules in one place, in a language a typechecker can yell at us about".

It is intentionally small. It is not a CDN, not a bot manager, not a
real WAF. It is a process that sits between a load balancer and an app
and runs a few thousand requests per second through a programmable
decision pipeline.

## features

- **Typed rule DSL** with paths, regex match, CIDR membership, set
  membership, and a few dozen built-in atoms. Rules are compiled to
  bytecode at load time; loads are atomic and version-pinned per request.
- **HTTP/1.1 wire layer** built on `h11`. Strict about Content-Length /
  Transfer-Encoding precedence -- request smuggling vectors get a 400.
- **URL canonicalization** that percent-decodes, collapses `..`, and
  re-encodes safely without folding `%2F` into `/`.
- **Identity extraction** from `X-Forwarded-For` and `Forwarded` with a
  configurable trust depth. Falls back to socket peer when the chain is
  shorter than configured.
- **Rate limiting** primitives: token bucket, GCRA, and sliding-window
  log. Composable into a single keyed limiter.
- **Body inspection**: streaming JSON depth/size guard, a real multipart
  parser, and per-content-type buffering caps.
- **Reputation** via an in-memory radix CIDR trie, populated from a
  signed feed file with TTLs.
- **Audit log** with hash-chained entries; jsonpath-based redaction
  applied to bodies before they ever hit disk.
- **Hot reload** of rules on `SIGHUP` -- in-flight requests keep their
  pinned version.

## install

```bash
pip install -e .[dev,server]
```

## status

Pre-1.0. The DSL grammar is settled enough that we don't expect to
break it; everything else may move. See `NOTES.md` for the running
list of "things we know we got wrong and want to fix".

## docs

- `docs/architecture.md` -- how a request flows through the layers.
- `docs/rules.md` -- the rule language reference.
- `docs/deployment.md` -- running it behind a load balancer.
- `examples/` -- annotated rulesets.
