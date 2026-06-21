"""Graph-level and node-level metric functions."""

from __future__ import annotations

import math
from collections import deque
from typing import Any, Dict, List, Optional, Set


def density(G) -> float:
    """Return the density of the graph: E / (n*(n-1)/2) for undirected."""
    n = G.number_of_nodes()
    m = G.number_of_edges()
    if n < 2:
        return 0.0
    if G.is_directed():
        return m / (n * (n - 1))
    return m / (n * (n - 1) / 2)


def transitivity(G) -> float:
    """Global clustering coefficient (transitivity).

    3 * triangles / triads (connected triples).
    """
    triangles_total = 0
    triads_total = 0
    for v in G:
        nbrs = set(G.neighbors(v))
        nbrs.discard(v)
        triads_total += len(nbrs) * (len(nbrs) - 1)
        for u in nbrs:
            for w in nbrs:
                if u != w and G.has_edge(u, w):
                    triangles_total += 1
    if triads_total == 0:
        return 0.0
    return triangles_total / triads_total


def clustering(G, nodes=None, weight: Optional[str] = None) -> Dict[Any, float]:
    """Local clustering coefficient for each node."""
    if nodes is None:
        nodes = list(G)
    result: Dict[Any, float] = {}
    for v in nodes:
        nbrs = set(G.neighbors(v))
        nbrs.discard(v)
        k = len(nbrs)
        if k < 2:
            result[v] = 0.0
            continue
        if weight is None:
            triangles = sum(
                1 for u in nbrs for w in nbrs if u < w and G.has_edge(u, w)  # type: ignore
            )
            result[v] = 2.0 * triangles / (k * (k - 1))
        else:
            w_sum = 0.0
            for u in nbrs:
                for w in nbrs:
                    if u != w and G.has_edge(u, w):
                        wu = G.get_edge_data(v, u, {}).get(weight, 1.0)
                        ww = G.get_edge_data(v, w, {}).get(weight, 1.0)
                        w_sum += (wu * ww) ** (1 / 3)
            s = sum(
                G.get_edge_data(v, u, {}).get(weight, 1.0) for u in nbrs
            )
            denom = (s ** 2 - sum(
                G.get_edge_data(v, u, {}).get(weight, 1.0) ** 2 for u in nbrs
            ))
            result[v] = w_sum / denom if denom > 0 else 0.0
    return result


def average_clustering(G, nodes=None, weight: Optional[str] = None) -> float:
    """Mean local clustering coefficient."""
    c = clustering(G, nodes=nodes, weight=weight)
    return sum(c.values()) / len(c) if c else 0.0


def number_of_triangles(G, nodes=None) -> Dict[Any, int]:
    """Return the number of triangles for each node."""
    if nodes is None:
        nodes = list(G)
    result: Dict[Any, int] = {}
    for v in nodes:
        nbrs = set(G.neighbors(v))
        nbrs.discard(v)
        count = sum(
            1 for u in nbrs for w in nbrs
            if u < w and G.has_edge(u, w)  # type: ignore
        )
        result[v] = count
    return result


def generalized_degree(G, nodes=None) -> Dict[Any, Dict[int, int]]:
    """Return {node: {k-triangle_count: occurrence}} for each node."""
    if nodes is None:
        nodes = list(G)
    result: Dict[Any, Dict[int, int]] = {}
    for v in nodes:
        nbrs = set(G.neighbors(v))
        nbrs.discard(v)
        k_counts: Dict[int, int] = {}
        for u in nbrs:
            u_nbrs = set(G.neighbors(u)) - {v}
            k = len(u_nbrs & nbrs)
            k_counts[k] = k_counts.get(k, 0) + 1
        result[v] = k_counts
    return result


def eccentricity(G, v=None, weight: Optional[str] = None) -> Any:
    """Return the eccentricity of node *v* (or dict for all nodes)."""
    from meridian.algorithms.components import is_connected
    if not is_connected(G):
        from meridian.exceptions import GraphNotConnected
        raise GraphNotConnected("eccentricity requires a connected graph")

    def _ecc(node):
        if weight is None:
            dist = _bfs_distances(G, node)
        else:
            from meridian.algorithms.shortest_path import single_source_dijkstra
            dist, _ = single_source_dijkstra(G, node, weight=weight)
        return max(dist.values(), default=0.0)

    if v is not None:
        return _ecc(v)
    return {n: _ecc(n) for n in G}


def diameter(G, weight: Optional[str] = None) -> float:
    """Return the graph diameter (longest shortest path)."""
    ecc = eccentricity(G, weight=weight)
    return max(ecc.values(), default=0.0)


def radius(G, weight: Optional[str] = None) -> float:
    """Return the graph radius (smallest eccentricity)."""
    ecc = eccentricity(G, weight=weight)
    return min(ecc.values(), default=0.0)


def center(G, weight: Optional[str] = None) -> List:
    """Return nodes achieving the radius (centre of the graph)."""
    ecc = eccentricity(G, weight=weight)
    r = min(ecc.values(), default=0.0)
    return [v for v, e in ecc.items() if e == r]


def periphery(G, weight: Optional[str] = None) -> List:
    """Return nodes achieving the diameter (periphery)."""
    ecc = eccentricity(G, weight=weight)
    d = max(ecc.values(), default=0.0)
    return [v for v, e in ecc.items() if e == d]


def barycenter(G, weight: Optional[str] = None) -> List:
    """Return nodes minimising the sum of distances (barycenter)."""
    if weight is None:
        sums = {v: sum(_bfs_distances(G, v).values()) for v in G}
    else:
        from meridian.algorithms.shortest_path import single_source_dijkstra
        sums = {}
        for v in G:
            dist, _ = single_source_dijkstra(G, v, weight=weight)
            sums[v] = sum(dist.values())
    min_sum = min(sums.values(), default=0.0)
    return [v for v, s in sums.items() if s == min_sum]


def is_tree(G) -> bool:
    """Return True if G is a tree (connected graph with n-1 edges)."""
    from meridian.algorithms.components import is_connected
    n = G.number_of_nodes()
    return n > 0 and G.number_of_edges() == n - 1 and is_connected(G)


def is_forest(G) -> bool:
    """Return True if G is a forest (acyclic graph)."""
    from meridian.algorithms.components import connected_components, is_connected
    from meridian.algorithms.traverse import has_cycle
    if G.is_directed():
        return not has_cycle(G)
    comps = connected_components(G)
    return all(
        sum(1 for _ in G.subgraph(c).edges) == len(c) - 1
        for c in comps
    )


def is_bipartite(G) -> bool:
    """Return True if G is bipartite."""
    from meridian.analysis.bipartite import is_bipartite as _ib
    return _ib(G)


def node_connectivity(G, s=None, t=None) -> int:
    """Return the node connectivity κ(G) (minimum node cuts)."""
    from meridian.algorithms.flow import edmonds_karp
    if s is not None and t is not None:
        # Build auxiliary graph with node splitting
        from meridian.digraph import DiGraph
        split = DiGraph()
        for n in G:
            split.add_node(f"{n}_in")
            split.add_node(f"{n}_out")
            split.add_edge(f"{n}_in", f"{n}_out", capacity=1.0)
        for u, v in G.edges:
            split.add_edge(f"{u}_out", f"{v}_in", capacity=float("inf"))
            if not G.is_directed():
                split.add_edge(f"{v}_out", f"{u}_in", capacity=float("inf"))
        val, _ = edmonds_karp(split, f"{s}_in", f"{t}_out")
        return int(val)
    # Global connectivity: min over all pairs
    nodes = list(G)
    if len(nodes) < 2:
        return 0
    min_conn = float("inf")
    for i, u in enumerate(nodes):
        for v in nodes[i + 1:]:
            c = node_connectivity(G, u, v)
            min_conn = min(min_conn, c)
    return int(min_conn) if min_conn != float("inf") else 0


def edge_connectivity(G, s=None, t=None) -> float:
    """Return the edge connectivity λ(G)."""
    from meridian.algorithms.flow import max_flow as mf
    if s is not None and t is not None:
        # Build a directed version with unit capacities
        from meridian.digraph import DiGraph
        d = DiGraph()
        for n in G:
            d.add_node(n)
        for u, v in G.edges:
            d.add_edge(u, v, capacity=1.0)
            if not G.is_directed():
                d.add_edge(v, u, capacity=1.0)
        return mf(d, s, t, capacity="capacity")
    nodes = list(G)
    if len(nodes) < 2:
        return 0.0
    min_ec = float("inf")
    for i, u in enumerate(nodes):
        for v in nodes[i + 1:]:
            ec = edge_connectivity(G, u, v)
            min_ec = min(min_ec, ec)
    return min_ec


def wiener_index(G, weight: Optional[str] = None) -> float:
    """Sum of all pairwise shortest path lengths (Wiener index)."""
    from meridian.algorithms.shortest_path import floyd_warshall
    dist = floyd_warshall(G, weight=weight or "weight")
    total = 0.0
    nodes = list(G)
    for i, u in enumerate(nodes):
        for v in nodes[i + 1:]:
            d = dist[u][v]
            if d < math.inf:
                total += d
    return total


def average_degree(G) -> float:
    """Return average degree across all nodes."""
    n = G.number_of_nodes()
    if n == 0:
        return 0.0
    return sum(G.degree().values()) / n


def degree_histogram(G) -> List[int]:
    """Return list where index i = number of nodes with degree i."""
    if G.number_of_nodes() == 0:
        return []
    max_deg = max(G.degree().values())
    hist = [0] * (max_deg + 1)
    for d in G.degree().values():
        hist[d] += 1
    return hist


def _bfs_distances(G, source) -> Dict:
    dist: Dict = {source: 0}
    q: deque = deque([source])
    while q:
        u = q.popleft()
        for v in G.neighbors(u):
            if v not in dist:
                dist[v] = dist[u] + 1
                q.append(v)
    return dist
