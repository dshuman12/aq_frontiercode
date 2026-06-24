# architecture

bulwark sits between an L4/L7 load balancer and an application. it
terminates HTTP/1.1, runs each request through a phased rule pipeline,
and forwards or rejects.

```
           ┌────────┐    ┌──────────────────────┐    ┌──────────┐
client ──▶ │  load  │ ──▶│        bulwark         │ ──▶│ upstream │
           │balancer│    │   pre_route phase     │    │          │
           └────────┘    │   post_route phase    │    └──────────┘
                         │   response phase      │
                         └──────────────────────┘
```

## layers, in request order

1. **wire** -- `h11`-based HTTP/1.1 parser. emits a `RawRequest`.
2. **headers** -- case-insensitive multimap. preserves the order and the
   first-seen casing for emit; comparison is ASCII-case-insensitive.
3. **chunked** -- transfer-encoding decoder. enforces the
   `Transfer-Encoding` / `Content-Length` precedence rule (smuggling
   guard).
4. **normalize** -- URL canonicalization. percent-decode, then collapse
   `..`/`.`, then re-encode safely. `%2F` is *not* folded into `/`.
5. **identity** -- walks `X-Forwarded-For` (and eventually `Forwarded`)
   under a configurable trust depth. falls back to socket peer.
6. **inspector** -- body buffering with per-content-type caps; jsonguard
   (depth, dup keys, size); multipart parser.
7. **engine** -- runs the compiled rule bytecode for the current phase.
   each phase is first-match-wins. action priority within a match group:
   `block > challenge > tag > allow`.
8. **limiter** -- token bucket / GCRA / sliding window. keyed by an
   identity composition the rule chooses.
9. **proxy** -- async upstream forward via `httpx`. connection pool with
   lazy health check on checkout. circuit breaker per upstream.
10. **audit** -- hash-chained log of every decision. body redaction via
    jsonpath rules applied *before* anything reaches disk.

## ruleset versioning

a request reads `cfg.current()` exactly once, on entry. all phases for
that request use that pinned ruleset. hot-reload (SIGHUP) installs a new
version; in-flight requests keep theirs.

## not in scope

- TLS termination (let the load balancer do it)
- bot detection / device fingerprinting
- positive security model / schema validation of bodies
- a dashboard. bulwark is a daemon. logs and metrics go out as JSON.
