"""Shortest-path algorithms: Dijkstra, Bellman-Ford, Floyd-Warshall, A*."""

from __future__ import annotations

import heapq
import math
from typing import Any, Callable, Dict, Hashable, List, Optional, Tuple

from meridian.exceptions import NegativeCycleError, NodeNotFound


_INF = math.inf


# ---------------------------------------------------------------------------
# Dijkstra
# ---------------------------------------------------------------------------

def dijkstra(
    G,
    source: Any,
    target: Optional[Any] = None,
    weight: str = "weight",
    default_weight: float = 1.0,
) -> Tuple[Dict, Dict]:
    """Single-source Dijkstra.

    Returns
    -------
    (dist, paths) where dist[v] is the shortest distance from *source* to *v*
    and paths[v] is the corresponding path as a list of nodes.

    If *target* is given and reached, returns (dist[target], paths[target]).
    """
    if source not in G:
        raise NodeNotFound(source)

    dist: Dict[Any, float] = {source: 0.0}
    paths: Dict[Any, List] = {source: [source]}
    heap = [(0.0, source)]

    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, _INF):
            continue
        if target is not None and u == target:
            break
        for v, edge_data in G._adj[u].items():
            if G.is_multigraph():
                # Pick minimum weight among parallel edges
                w = min(
                    (kd.get(weight, default_weight) for kd in edge_data.values()),
                    default=default_weight,
                )
            else:
                w = edge_data.get(weight, default_weight)
            nd = d + w
            if nd < dist.get(v, _INF):
                dist[v] = nd
                paths[v] = paths[u] + [v]
                heapq.heappush(heap, (nd, v))

    if target is not None:
        if target not in dist:
            raise ValueError(f"No path from {source!r} to {target!r}")
        return dist[target], paths[target]
    return dist, paths


def dijkstra_path(G, source: Any, target: Any, weight: str = "weight") -> List:
    """Return the shortest path from *source* to *target*."""
    _, path = dijkstra(G, source, target=target, weight=weight)
    return path


def dijkstra_path_length(G, source: Any, target: Any, weight: str = "weight") -> float:
    """Return the length of the shortest path from *source* to *target*."""
    length, _ = dijkstra(G, source, target=target, weight=weight)
    return length


def single_source_dijkstra(G, source: Any, cutoff: Optional[float] = None,
                            weight: str = "weight") -> Tuple[Dict, Dict]:
    """Dijkstra with optional distance cutoff."""
    if source not in G:
        raise NodeNotFound(source)
    dist: Dict = {source: 0.0}
    paths: Dict = {source: [source]}
    heap = [(0.0, source)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, _INF):
            continue
        for v, edge_data in G._adj[u].items():
            if G.is_multigraph():
                w = min((kd.get(weight, 1.0) for kd in edge_data.values()), default=1.0)
            else:
                w = edge_data.get(weight, 1.0)
            nd = d + w
            if cutoff is not None and nd > cutoff:
                continue
            if nd < dist.get(v, _INF):
                dist[v] = nd
                paths[v] = paths[u] + [v]
                heapq.heappush(heap, (nd, v))
    return dist, paths


def all_pairs_dijkstra(G, weight: str = "weight") -> Dict[Any, Tuple[Dict, Dict]]:
    """Run Dijkstra from every node; return nested dict of (dist, paths)."""
    return {n: single_source_dijkstra(G, n, weight=weight) for n in G}


def shortest_path_length(G, source: Any, target: Any, weight: Optional[str] = None) -> float:
    """Return the shortest path length between *source* and *target*."""
    if weight is None:
        # Unweighted BFS
        from meridian.algorithms.traverse import bfs_nodes
        for dist_val, node in enumerate(bfs_nodes(G, source)):
            if node == target:
                return float(dist_val)
        raise ValueError(f"No path from {source!r} to {target!r}")
    length, _ = dijkstra(G, source, target=target, weight=weight)
    return length


# ---------------------------------------------------------------------------
# Bellman-Ford
# ---------------------------------------------------------------------------

def bellman_ford(
    G,
    source: Any,
    weight: str = "weight",
    default_weight: float = 1.0,
) -> Tuple[Dict, Dict]:
    """Bellman-Ford single-source shortest paths.

    Handles negative edge weights.  Raises NegativeCycleError if a negative
    cycle reachable from *source* is detected.

    Returns (dist, predecessors) dicts.
    """
    if source not in G:
        raise NodeNotFound(source)

    dist: Dict[Any, float] = {n: _INF for n in G}
    dist[source] = 0.0
    pred: Dict[Any, Optional[Any]] = {source: None}

    n = G.number_of_nodes()
    nodes = list(G)

    for _ in range(n - 1):
        updated = False
        for u in nodes:
            if dist[u] == _INF:
                continue
            for v, edge_data in G._adj[u].items():
                if G.is_multigraph():
                    w = min(
                        (kd.get(weight, default_weight) for kd in edge_data.values()),
                        default=default_weight,
                    )
                else:
                    w = edge_data.get(weight, default_weight)
                if dist[u] + w < dist.get(v, _INF):
                    dist[v] = dist[u] + w
                    pred[v] = u
                    updated = True
        if not updated:
            break

    # Check for negative cycles
    for u in nodes:
        if dist[u] == _INF:
            continue
        for v, edge_data in G._adj[u].items():
            if G.is_multigraph():
                w = min(
                    (kd.get(weight, default_weight) for kd in edge_data.values()),
                    default=default_weight,
                )
            else:
                w = edge_data.get(weight, default_weight)
            if dist[u] + w < dist.get(v, _INF):
                raise NegativeCycleError(
                    f"Negative cycle detected near node {v!r}"
                )

    return dist, pred


def bellman_ford_path(G, source: Any, target: Any, weight: str = "weight") -> List:
    """Reconstruct path from Bellman-Ford predecessor dict."""
    dist, pred = bellman_ford(G, source, weight=weight)
    if dist.get(target, _INF) == _INF:
        raise ValueError(f"No path from {source!r} to {target!r}")
    path = []
    cur: Optional[Any] = target
    while cur is not None:
        path.append(cur)
        cur = pred.get(cur)
    path.reverse()
    return path


# ---------------------------------------------------------------------------
# Floyd-Warshall
# ---------------------------------------------------------------------------

def floyd_warshall(
    G,
    weight: str = "weight",
    default_weight: float = 1.0,
) -> Dict[Any, Dict[Any, float]]:
    """Floyd-Warshall all-pairs shortest paths.

    Returns dist[u][v] = shortest distance from u to v (or inf if unreachable).
    """
    nodes = list(G)
    dist: Dict[Any, Dict[Any, float]] = {
        u: {v: _INF for v in nodes} for u in nodes
    }
    for u in nodes:
        dist[u][u] = 0.0

    for u in nodes:
        for v, edge_data in G._adj[u].items():
            if G.is_multigraph():
                w = min(
                    (kd.get(weight, default_weight) for kd in edge_data.values()),
                    default=default_weight,
                )
            else:
                w = edge_data.get(weight, default_weight)
            dist[u][v] = min(dist[u][v], w)
            if not G.is_directed():
                dist[v][u] = min(dist[v][u], w)

    for k in nodes:
        for u in nodes:
            for v in nodes:
                nd = dist[u][k] + dist[k][v]
                if nd < dist[u][v]:
                    dist[u][v] = nd

    return dist


def floyd_warshall_predecessor_and_distance(
    G, weight: str = "weight"
) -> Tuple[Dict, Dict]:
    """Return (predecessor_matrix, distance_matrix)."""
    nodes = list(G)
    dist: Dict[Any, Dict[Any, float]] = {
        u: {v: _INF for v in nodes} for u in nodes
    }
    pred: Dict[Any, Dict[Any, Optional[Any]]] = {
        u: {v: None for v in nodes} for u in nodes
    }
    for u in nodes:
        dist[u][u] = 0.0
        pred[u][u] = u
    for u in nodes:
        for v, edge_data in G._adj[u].items():
            w = edge_data.get(weight, 1.0) if not G.is_multigraph() else min(
                (kd.get(weight, 1.0) for kd in edge_data.values()), default=1.0
            )
            if w < dist[u][v]:
                dist[u][v] = w
                pred[u][v] = u
                if not G.is_directed():
                    dist[v][u] = w
                    pred[v][u] = v
    for k in nodes:
        for u in nodes:
            for v in nodes:
                nd = dist[u][k] + dist[k][v]
                if nd < dist[u][v]:
                    dist[u][v] = nd
                    pred[u][v] = pred[k][v]
    return pred, dist


def reconstruct_path(source, target, pred_matrix: Dict) -> List:
    """Reconstruct path from Floyd-Warshall predecessor matrix."""
    if pred_matrix[source][target] is None:
        return []
    path = [target]
    cur = target
    while cur != source:
        cur = pred_matrix[source][cur]
        if cur is None:
            return []
        path.append(cur)
    path.reverse()
    return path


# ---------------------------------------------------------------------------
# A*
# ---------------------------------------------------------------------------

def astar(
    G,
    source: Any,
    target: Any,
    heuristic: Optional[Callable[[Any, Any], float]] = None,
    weight: str = "weight",
    default_weight: float = 1.0,
) -> Tuple[float, List]:
    """A* shortest-path search.

    Parameters
    ----------
    heuristic : callable(u, v) -> float, optional
        Admissible heuristic function.  Defaults to 0 (degrades to Dijkstra).

    Returns (distance, path).
    """
    if source not in G:
        raise NodeNotFound(source)
    if target not in G:
        raise NodeNotFound(target)
    if heuristic is None:
        heuristic = lambda u, v: 0.0

    g_score: Dict[Any, float] = {source: 0.0}
    f_score: Dict[Any, float] = {source: heuristic(source, target)}
    came_from: Dict[Any, Optional[Any]] = {source: None}
    counter = 0
    heap = [(f_score[source], counter, source)]

    while heap:
        _, _, u = heapq.heappop(heap)
        if u == target:
            path = []
            cur: Optional[Any] = target
            while cur is not None:
                path.append(cur)
                cur = came_from[cur]
            path.reverse()
            return g_score[target], path

        for v, edge_data in G._adj[u].items():
            if G.is_multigraph():
                w = min(
                    (kd.get(weight, default_weight) for kd in edge_data.values()),
                    default=default_weight,
                )
            else:
                w = edge_data.get(weight, default_weight)
            tentative = g_score[u] + w
            if tentative < g_score.get(v, _INF):
                g_score[v] = tentative
                f = tentative + heuristic(v, target)
                f_score[v] = f
                came_from[v] = u
                counter += 1
                heapq.heappush(heap, (f, counter, v))

    raise ValueError(f"No path from {source!r} to {target!r}")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def has_path(G, source: Any, target: Any) -> bool:
    """Return True if there is a path from *source* to *target*."""
    if source not in G:
        raise NodeNotFound(source)
    if target not in G:
        raise NodeNotFound(target)
    from meridian.algorithms.traverse import bfs_nodes
    for node in bfs_nodes(G, source):
        if node == target:
            return True
    return False


def average_shortest_path_length(G, weight: Optional[str] = None) -> float:
    """Return the average shortest path length over all pairs.

    Raises GraphNotConnected if the graph is not connected.
    """
    from meridian.exceptions import GraphNotConnected
    n = G.number_of_nodes()
    if n < 2:
        return 0.0
    total = 0.0
    pairs = 0
    nodes = list(G)
    if weight is None:
        from meridian.algorithms.components import is_connected
        if not is_connected(G):
            raise GraphNotConnected()
        for src in nodes:
            dist, _ = single_source_dijkstra(G, src, weight="weight")
            # BFS unweighted is simpler; reuse dijkstra with unit weights
            from meridian.algorithms.traverse import bfs_nodes
            seen = {}
            d = 0
            current = [src]
            visited = {src}
            while current:
                for node in current:
                    seen[node] = d
                next_layer = []
                for node in current:
                    for nbr in G.neighbors(node):
                        if nbr not in visited:
                            visited.add(nbr)
                            next_layer.append(nbr)
                d += 1
                current = next_layer
            for v in nodes:
                if v != src:
                    total += seen.get(v, 0)
                    pairs += 1
        return total / pairs
    else:
        for src in nodes:
            dist, _ = single_source_dijkstra(G, src, weight=weight)
            for v in nodes:
                if v != src:
                    total += dist.get(v, 0.0)
                    pairs += 1
        return total / pairs


def diameter(G, weight: Optional[str] = None) -> float:
    """Return the diameter (longest shortest path) of a connected graph."""
    from meridian.exceptions import GraphNotConnected
    from meridian.algorithms.components import is_connected
    if not is_connected(G):
        raise GraphNotConnected()
    max_dist = 0.0
    for src in G:
        if weight is None:
            dist_vals = _bfs_distances(G, src)
        else:
            dist_vals, _ = single_source_dijkstra(G, src, weight=weight)
        max_dist = max(max_dist, max(dist_vals.values(), default=0.0))
    return max_dist


def _bfs_distances(G, source) -> Dict:
    """BFS hop-count distances from *source*."""
    dist = {source: 0}
    queue = deque([source])
    while queue:
        u = queue.popleft()
        for v in G.neighbors(u):
            if v not in dist:
                dist[v] = dist[u] + 1
                queue.append(v)
    return dist


from collections import deque  # noqa: E402 – needed after def above
