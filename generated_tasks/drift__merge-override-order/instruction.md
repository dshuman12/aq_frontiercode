# Task description

The `merge` map builtin (`builtinMerge` in `pkg/stdlib/maps.go`) combines two maps but resolves key conflicts with the wrong precedence. When the same key appears in both maps, `merge(a, b)` currently keeps the value from the first map `a`, but the documented and expected semantics are last-writer-wins: the value from the second map `b` must override the value from `a`.

Correct `builtinMerge` so that:

- Keys present only in `a` keep `a`'s value.
- Keys present only in `b` keep `b`'s value.
- Keys present in both resolve to `b`'s value.

The set of resulting keys and the overall map length are already correct and must stay that way; only the conflict-resolution value is wrong. Keep the existing `*object.Map` API usage (e.g. iterating entries and setting pairs) and the builtin's signature `func(args ...object.Object) object.Object` unchanged, including its current argument-count and type validation and error messages. Do not alter other map builtins, the registration in `registerMaps`, or unrelated stdlib functions. Behavior for non-map arguments must remain identical.

# Test guidelines

Run `go test ./pkg/stdlib/...` and ensure it passes.

Add or extend tests in `pkg/stdlib` covering `merge` precedence: overlapping keys where `b` overrides `a`, keys unique to each map, merging with an empty map in either position, and confirming the result length equals the count of distinct keys. Verify originals are not mutated if the existing implementation guarantees that. Do not rely on map key ordering in assertions.

# Lint guidelines

Run `gofmt -w -s .` and `go vet ./...` and resolve any reported issues before finishing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
