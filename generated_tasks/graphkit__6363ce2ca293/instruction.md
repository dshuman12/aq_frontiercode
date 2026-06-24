# Task description

Add a serialization module at `src/serializer.ts` that converts graphs to and from common interchange formats: JSON, DOT, adjacency list, and edge list. Provide both export (graph → string) and import (string → graph) directions for each format where it makes sense.

The module must operate on the existing `Graph` and `DiGraph` classes and round-trip their observable state. Serialized output should capture node ids, edge endpoints, and edge weights; node `data`/`label` and edge `label` should survive a JSON round-trip. Importers must rebuild graphs using the public `addNode`/`addEdge` API so directedness, self-loop, and multi-edge options stay consistent with how each class enforces them.

Pay particular attention to edge handling: directed graphs must preserve edge orientation (`source`→`target`) on both export and import, while undirected graphs must emit each edge once rather than duplicating it from the symmetric adjacency representation. Weighted and unweighted edges, string and numeric node ids, and empty graphs should all be handled without throwing. DOT output should use the correct `graph`/`digraph` keyword and `--`/`->` edge connector for the graph type.

# Test guidelines

Run `npm test`. Add or extend specs under `tests/` (e.g. `tests/serializer.test.ts`) that exercise each format in both directions and assert round-trip equality of node ids, edge endpoints, weights, and preserved metadata. Cover directed vs. undirected graphs, weighted vs. unweighted edges, non-numeric node ids, and the empty-graph case, and confirm undirected edges are not emitted twice.

# Lint guidelines

Run `npm run lint` (`tsc --noEmit`) and ensure it passes with no type errors. Keep `npm run build` working as well.

# Style guidelines

Match the existing TypeScript conventions and import edge/node types from `src/types.ts`. Do not modify other modules' public behavior; confine source changes to the new `src/serializer.ts`. You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
