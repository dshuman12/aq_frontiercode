"""Maximum flow and minimum cut algorithms."""

from __future__ import annotations

import math
from collections import deque
from typing import Any, Dict, Optional, Tuple

from meridian.exceptions import NodeNotFound


_INF = math.inf


# ---------------------------------------------------------------------------
# BFS for finding augmenting paths (Edmonds-Karp)
# ---------------------------------------------------------------------------

def _bfs_augmenting_path(
    residual: Dict[Any, Dict[Any, float]],
    source: Any,
    sink: Any,
) -> Optional[Dict[Any, Any]]:
    """BFS from source to sink in residual graph.  Returns predecessor dict or None."""
    visited = {source}
    queue: deque = deque([source])
    pred: Dict[Any, Any] = {source: None}
    while queue:
        u = queue.popleft()
        if u == sink:
            return pred
        for v, cap in residual[u].items():
            if v not in visited and cap > 0:
                visited.add(v)
                pred[v] = u
                queue.append(v)
    return None


# ---------------------------------------------------------------------------
# DFS for finding augmenting paths (Ford-Fulkerson)
# ---------------------------------------------------------------------------

def _dfs_augmenting_path(
    residual: Dict[Any, Dict[Any, float]],
    source: Any,
    sink: Any,
) -> Optional[Dict[Any, Any]]:
    """DFS from source to sink in residual graph.  Returns predecessor dict or None."""
    visited = {source}
    stack = [source]
    pred: Dict[Any, Any] = {source: None}
    while stack:
        u = stack.pop()
        if u == sink:
            return pred
        for v, cap in residual[u].items():
            if v not in visited and cap > 0:
                visited.add(v)
                pred[v] = u
                stack.append(v)
    return None


# ---------------------------------------------------------------------------
# Build residual graph
# ---------------------------------------------------------------------------

def _build_residual(G, capacity: str) -> Dict[Any, Dict[Any, float]]:
    """Construct a residual capacity graph from *G*."""
    res: Dict[Any, Dict[Any, float]] = {v: {} for v in G}
    for u in G:
        for v, data in G._adj[u].items():
            if G.is_multigraph():
                cap = max(
                    (kd.get(capacity, 0.0) for kd in data.values()),
                    default=0.0,
                )
            else:
                cap = data.get(capacity, 0.0)
            res[u][v] = res[u].get(v, 0.0) + cap
            if v not in res:
                res[v] = {}
            if u not in res[v]:
                res[v][u] = 0.0

    if not G.is_directed():
        # For undirected graphs, treat each edge as bidirectional
        pass  # already symmetric by graph structure

    return res


def _augment_path(
    residual: Dict[Any, Dict[Any, float]],
    pred: Dict[Any, Any],
    sink: Any,
) -> float:
    """Compute bottleneck capacity and update residual graph."""
    # Find minimum capacity along path
    path_flow = _INF
    v = sink
    while pred[v] is not None:
        u = pred[v]
        path_flow = min(path_flow, residual[u][v])
        v = u

    # Update residual capacities
    v = sink
    while pred[v] is not None:
        u = pred[v]
        residual[u][v] -= path_flow
        residual[v][u] = residual[v].get(u, 0.0) + path_flow
        v = u

    return path_flow if path_flow != _INF else 0.0


# ---------------------------------------------------------------------------
# Edmonds-Karp (BFS-based max flow)
# ---------------------------------------------------------------------------

def edmonds_karp(
    G,
    source: Any,
    sink: Any,
    capacity: str = "capacity",
) -> Tuple[float, Dict[Any, Dict[Any, float]]]:
    """Edmonds-Karp maximum flow (BFS augmenting paths).

    Returns (max_flow_value, flow_dict) where flow_dict[u][v] is the flow on
    edge (u, v).
    """
    if source not in G:
        raise NodeNotFound(source)
    if sink not in G:
        raise NodeNotFound(sink)

    residual = _build_residual(G, capacity)
    max_flow = 0.0

    while True:
        pred = _bfs_augmenting_path(residual, source, sink)
        if pred is None:
            break
        path_flow = _augment_path(residual, pred, sink)
        max_flow += path_flow

    # Recover actual flow values from original graph
    original_cap = _build_residual(G, capacity)
    flow_dict: Dict[Any, Dict[Any, float]] = {v: {} for v in G}
    for u in G:
        for v in G._adj[u]:
            orig = original_cap[u].get(v, 0.0)
            remaining = residual[u].get(v, 0.0)
            f = orig - remaining
            if f > 0:
                flow_dict[u][v] = f

    return max_flow, flow_dict


# ---------------------------------------------------------------------------
# Ford-Fulkerson (DFS-based max flow)
# ---------------------------------------------------------------------------

def ford_fulkerson(
    G,
    source: Any,
    sink: Any,
    capacity: str = "capacity",
    cutoff: Optional[float] = None,
) -> Tuple[float, Dict[Any, Dict[Any, float]]]:
    """Ford-Fulkerson maximum flow with DFS augmenting paths.

    Parameters
    ----------
    cutoff : stop once flow exceeds this value.
    """
    if source not in G:
        raise NodeNotFound(source)
    if sink not in G:
        raise NodeNotFound(sink)

    residual = _build_residual(G, capacity)
    max_flow = 0.0
    max_iterations = G.number_of_nodes() * G.number_of_edges() + 10

    for _ in range(max_iterations):
        pred = _dfs_augmenting_path(residual, source, sink)
        if pred is None:
            break
        path_flow = _augment_path(residual, pred, sink)
        max_flow += path_flow
        if cutoff is not None and max_flow >= cutoff:
            break

    original_cap = _build_residual(G, capacity)
    flow_dict: Dict[Any, Dict[Any, float]] = {v: {} for v in G}
    for u in G:
        for v in G._adj[u]:
            orig = original_cap[u].get(v, 0.0)
            remaining = residual[u].get(v, 0.0)
            f = orig - remaining
            if f > 0:
                flow_dict[u][v] = f

    return max_flow, flow_dict


# ---------------------------------------------------------------------------
# Convenience wrapper
# ---------------------------------------------------------------------------

def max_flow(
    G,
    source: Any,
    sink: Any,
    capacity: str = "capacity",
    method: str = "edmonds_karp",
) -> float:
    """Return the maximum flow value from *source* to *sink*.

    Parameters
    ----------
    method : 'edmonds_karp' (default) or 'ford_fulkerson'
    """
    if method == "edmonds_karp":
        value, _ = edmonds_karp(G, source, sink, capacity=capacity)
    elif method == "ford_fulkerson":
        value, _ = ford_fulkerson(G, source, sink, capacity=capacity)
    else:
        raise ValueError(f"Unknown method {method!r}")
    return value


def minimum_cut(
    G,
    source: Any,
    sink: Any,
    capacity: str = "capacity",
) -> Tuple[float, Tuple[set, set]]:
    """Return (cut_value, (reachable, non_reachable)) after max-flow."""
    value, _ = edmonds_karp(G, source, sink, capacity=capacity)

    # Rebuild residual and find reachable nodes from source
    residual = _build_residual(G, capacity)
    # Re-run to get final residual state
    while True:
        pred = _bfs_augmenting_path(residual, source, sink)
        if pred is None:
            break
        _augment_path(residual, pred, sink)

    # BFS on residual to find reachable nodes
    visited: set = {source}
    queue: deque = deque([source])
    while queue:
        u = queue.popleft()
        for v, cap in residual[u].items():
            if v not in visited and cap > 0:
                visited.add(v)
                queue.append(v)

    non_reachable = set(G.nodes) - visited
    return value, (visited, non_reachable)


def minimum_cut_value(G, source: Any, sink: Any, capacity: str = "capacity") -> float:
    """Return just the minimum cut value."""
    val, _ = minimum_cut(G, source, sink, capacity=capacity)
    return val


# ---------------------------------------------------------------------------
# Flow helper: node-capacitated max flow via edge splitting
# ---------------------------------------------------------------------------

def max_flow_node_capacity(
    G,
    source: Any,
    sink: Any,
    capacity: str = "capacity",
    node_capacity: str = "node_capacity",
) -> float:
    """Max flow where nodes also have capacity constraints.

    Implements node splitting: each node u becomes u_in and u_out with an
    edge of the node's capacity between them.
    """
    from meridian.digraph import DiGraph
    split = DiGraph()
    for n in G:
        nc = G.nodes[n].get(node_capacity, _INF)
        split.add_node(f"{n}_in")
        split.add_node(f"{n}_out")
        split.add_edge(f"{n}_in", f"{n}_out", capacity=nc)

    for u, v, data in G.edges.data():
        cap = data.get(capacity, _INF)
        split.add_edge(f"{u}_out", f"{v}_in", capacity=cap)
        if not G.is_directed():
            split.add_edge(f"{v}_out", f"{u}_in", capacity=cap)

    return max_flow(split, f"{source}_in", f"{sink}_out")
