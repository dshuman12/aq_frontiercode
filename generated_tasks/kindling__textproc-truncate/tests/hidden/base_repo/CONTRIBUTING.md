# Contributing

Thanks for your interest in kindling.

## Local setup

```bash
git clone https://github.com/kindling-tools/kindling
cd kindling
go build ./...
go test ./...
go vet ./...
```

Required toolchain: Go 1.22 or newer.

## Branching

- `main` is the integration branch.
- Release branches: `release/0.6.x`.
- Feature branches: `<area>/<short-slug>`.

## Commit style

```
<area>: <imperative summary>

<body, optional, wrapped at 72 cols>

Refs: #<issue>
```

## Tests

Every package has a paired `*_test.go`. Integration tests live under
`integration_*/`. CI runs `go test ./...` against Go 1.22 and
the latest stable.

## Reviewing

Reviewers check:
1. Tests cover the new behavior, including a failure path.
2. Public APIs are documented.
3. No new runtime dependencies without sign-off.
4. The diff is the smallest change that solves the problem.
