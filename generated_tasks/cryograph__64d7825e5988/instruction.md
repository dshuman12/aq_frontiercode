# Task description

Improve the graph-level analytics in `src/metrics/metrics.cpp` and `src/metrics/metrics.hpp` so that eccentricity-based metrics, density, and clustering are correct and efficient on undirected graphs.

Unify all eccentricity-derived computations (`graph_diameter`, `graph_radius`, `graph_center`, `graph_periphery`) so they share a single consistent eccentricity routine driven by unweighted shortest-path distances. The diameter must equal the maximum eccentricity (e.g. a 5-node path returns `4`), the radius the minimum eccentricity (e.g. a 6-node cycle returns `3`), the center the set of nodes whose eccentricity equals the radius (a 5-node path includes node `2`), and the periphery the nodes whose eccentricity equals the diameter (a 5-node path includes endpoints `0` and `4`).

Fix `graph_density` so a complete graph yields `1.0` and an edgeless graph yields `0.0`, and keep `average_degree` consistent (a 6-cycle averages `2.0`).

Optimize clustering so `local_clustering_coefficient`, `global_clustering_coefficient`, and `average_clustering_coefficient` agree with triangle counting: a triangle gives `1.0` locally and globally, a star center gives `0.0`, and averages stay within `(0, 1]`. Keep `degree_assortativity` and `summarize` (with `nodes`, `edges`, `components`, and a `to_string()` containing `Nodes: N`) behaving as before. Do not change public signatures or other modules.

# Test guidelines

Run `pytest`, which drives the C++ build and `cryograph_tests`. Cover correctness on paths, cycles, complete graphs, stars, triangles, and edgeless graphs in `tests/test_metrics.cpp`, and ensure cross-module integration (generators, MST subgraphs, serialization round-trips) still produces consistent metric values.

# Lint guidelines

Build via the standard CMake workflow (`cmake .. -DCMAKE_BUILD_TYPE=Release && make`) and resolve all compiler warnings before submitting.

# Style guidelines

You are already on the correct starting snapshot. Create your branch from this state. Do not rebase or start from master, main, or any other branch.
