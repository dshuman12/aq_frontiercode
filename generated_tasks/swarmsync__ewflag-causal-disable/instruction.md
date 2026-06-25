# Task description

The enable-wins flag (`EWFlag`) in `pkg/crdt/ewflag.go` loses its core CRDT guarantee during a concurrent enable/disable merge. EWFlag represents enables as dots. A disable is allowed to clear only enable dots it has causally observed; a concurrent enable that the disabling replica has not seen must survive the merge. The current merge path treats an empty dot set from another replica as permission to clear local enable dots, so a concurrent disable can erase an unseen enable.

Fix merge semantics so enable dots are removed only when the other replica has actually observed and disabled them. A concurrent enable on one replica versus a disable on another must converge to enabled in both merge orders. A disable that does observe the enable must still clear it. Repeated merges must remain idempotent, deterministic, and commutative. Keep the exported EWFlag API, constructor behavior, and `Enabled()` value semantics unchanged.

This is a CRDT causality fix, not a package redesign. Avoid changing unrelated CRDT types.

# Test guidelines

Run `go test ./pkg/crdt/...` from the repository root. Add or extend tests in `pkg/crdt` that cover: concurrent enable versus disable with both merge orders, an observed disable that correctly clears an enable, repeated/idempotent merges, and convergence between replicas after applying the same pair of operations. Assert the boolean value and, where the existing tests expose it, the dot-set behavior that proves an unseen enable was preserved.

Keep tests deterministic and table-driven where that matches the surrounding style.

# Lint guidelines

Run `gofmt -l pkg/crdt` and `go vet ./pkg/crdt/...`; both should be clean before finishing.

# Style guidelines

Match the existing CRDT package style. Keep the fix localized to EWFlag merge/removal semantics and its tests. Do not add dependencies, change exported method signatures, or modify unrelated CRDT implementations.

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.

Include only files needed for the EWFlag causality fix. Exclude broad cleanup, generated artifacts, and changes that do not directly support this behavior.
