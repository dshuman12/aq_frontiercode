# Task description

Implement shortest-path algorithms in `src/shortest_path.ts` so the module exports working single-source and all-pairs routines that integrate with the existing `Graph`/`DiGraph` classes and the result contracts in `src/types.ts`.

Provide named exports for `dijkstra`, `bellmanFord`, `floydWarshall`, and `aStar`. Single-source functions (`dijkstra`, `bellmanFord`, `aStar`) take a graph and a source node id and return a `ShortestPathResult`, whose `path(target)` reconstructs the node sequence from `predecessors` (returning `[]` when unreachable). `floydWarshall` returns an `AllPairsResult` with `distances`, `next`, a working `path(source, target)`, and `hasNegativeCycle`. `aStar` accepts a `HeuristicFn` and a target.

Honor edge weights via the `weight` field (use `DEFAULT_WEIGHT`/`WeightFn` semantics), treat directed graphs through `successors` and undirected through `neighbors`, and use `INFINITY` for unreached nodes. Reject negative edges in `dijkstra` with `NegativeWeightError`; detect negative cycles in `bellmanFord` (set `hasNegativeCycle`) and `floydWarshall`. Throw `NodeNotFoundError` for missing source/target. Do not modify other source files or change existing exported behavior.

# Test guidelines

Run `npm test`. Add or extend specs under `tests/` (e.g. `tests/shortest_path.test.ts`) covering: correct distances and reconstructed paths on weighted directed and undirected graphs, unreachable targets yielding `INFINITY` and empty paths, `aStar` agreeing with `dijkstra` under an admissible heuristic, negative-edge rejection in `dijkstra`, and negative-cycle detection in `bellmanFord` and `floydWarshall`.

# Lint guidelines

Run `npm run lint` (`tsc --noEmit`) and ensure the project type-checks with no errors. Keep full type safety; avoid `any` and non-null assertions on possibly-missing lookups.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch. Match the existing concise TypeScript style and import from `./types`, `./errors`, `./graph`, and `./digraph` as the other modules do.
