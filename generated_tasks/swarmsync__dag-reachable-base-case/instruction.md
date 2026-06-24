# Task description

The DAG in `pkg/dag/dag.go` must preserve its acyclic invariant when edges are added. Currently, adding an edge only rejects a direct self-loop (e.g. `a -> a`), but fails to reject edges that would close a longer cycle. For example, given an existing path `c -> ... -> a`, adding `a -> c` should be rejected because `c` can already reach `a`, making the new edge a back-edge.

The root cause is in the internal reachability search used for cycle detection: it never reports success once it descends past the starting node, so a target reachable through one or more intermediate hops is not detected. Fix the reachability check so that adding an edge is rejected whenever the proposed target can already reach the proposed source (or they are the same node).

Keep the existing public API and signatures intact. `AddEdge` should continue to return an error when an edge would create a cycle and otherwise add it; valid edges and the topological sort behavior on acyclic graphs must remain unchanged. Do not weaken existing rejection of direct self-loops.

# Test guidelines

Run `go test ./pkg/dag/...` to validate behavior. Add or extend tests in `pkg/dag` to cover multi-hop cycle rejection (paths spanning two or more intermediate nodes), the existing direct self-loop case, and acceptance of edges that do not close a cycle. Confirm that already-acyclic graphs still produce a valid topological ordering.

# Lint guidelines

Run `gofmt -l ./pkg/dag` and `go vet ./pkg/dag/...` and ensure both report no issues before completing.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Limit changes to the `pkg/dag` package; do not modify unrelated packages or public interfaces elsewhere in the repository.
