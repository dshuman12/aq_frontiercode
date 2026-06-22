"""Bipartite graph utilities."""

from __future__ import annotations

from collections import deque
from typing import Any, Dict, Optional, Set, Tuple


def is_bipartite(G) -> bool:
    """Return True if *G* is bipartite (2-colorable)."""
    try:
        bipartite_sets(G)
        return True
    except Exception:
        return False


def bipartite_sets(G) -> Tuple[Set, Set]:
    """Return (top, bottom) node sets for a bipartite graph.

    Raises ValueError if the graph is not bipartite.
    """
    color: Dict[Any, int] = {}
    for start in G:
        if start in color:
            continue
        color[start] = 0
        queue: deque = deque([start])
        while queue:
            v = queue.popleft()
            for nbr in G.neighbors(v):
                if nbr not in color:
                    color[nbr] = 1 - color[v]
                    queue.append(nbr)
                elif color[nbr] != color[v]:
                    raise ValueError(f"Graph is not bipartite; odd cycle found near {v!r}")
    top = {v for v, c in color.items() if c == 0}
    bottom = {v for v, c in color.items() if c == 1}
    return top, bottom


def two_color(G) -> Dict[Any, int]:
    """Return a 2-coloring {node: 0|1} for bipartite G.  Raises if not bipartite."""
    color: Dict[Any, int] = {}
    for start in G:
        if start in color:
            continue
        color[start] = 0
        queue: deque = deque([start])
        while queue:
            v = queue.popleft()
            for nbr in G.neighbors(v):
                if nbr not in color:
                    color[nbr] = 1 - color[v]
                    queue.append(nbr)
                elif color[nbr] != color[v]:
                    raise ValueError("Graph is not bipartite")
    return color


def is_complete_bipartite(G) -> bool:
    """Return True if G is a complete bipartite graph K_{m,n}."""
    try:
        top, bottom = bipartite_sets(G)
    except ValueError:
        return False
    # Every top node must be connected to every bottom node
    for u in top:
        if set(G.neighbors(u)) != bottom:
            return False
    return True


def bipartite_density(G, top_nodes: Optional[Set] = None) -> float:
    """Density of a bipartite graph = E / (|top| * |bottom|)."""
    if top_nodes is None:
        top_nodes, _ = bipartite_sets(G)
    bottom_nodes = set(G.nodes) - top_nodes
    max_edges = len(top_nodes) * len(bottom_nodes)
    if max_edges == 0:
        return 0.0
    return G.number_of_edges() / max_edges


def projected_graph(G, nodes: Set, multigraph: bool = False):
    """Project a bipartite graph onto one node set.

    Two nodes in *nodes* are connected in the projection if they share a
    common neighbour in the other set.
    """
    from meridian.graph import Graph
    from meridian.multigraph import MultiGraph

    other = set(G.nodes) - nodes
    proj = MultiGraph() if multigraph else Graph()
    for n in nodes:
        proj.add_node(n, **G.nodes[n])

    for v in other:
        nbrs = list(G.neighbors(v))
        top_nbrs = [n for n in nbrs if n in nodes]
        for i in range(len(top_nbrs)):
            for j in range(i + 1, len(top_nbrs)):
                u, w = top_nbrs[i], top_nbrs[j]
                if multigraph:
                    proj.add_edge(u, w)
                elif not proj.has_edge(u, w):
                    proj.add_edge(u, w)
    return proj


def weighted_projected_graph(G, nodes: Set, ratio: bool = False):
    """Project with edge weights = number of shared neighbours."""
    from meridian.graph import Graph
    other = set(G.nodes) - nodes
    proj = Graph()
    for n in nodes:
        proj.add_node(n, **G.nodes[n])
    shared_count: Dict[Tuple, int] = {}
    for v in other:
        top_nbrs = [n for n in G.neighbors(v) if n in nodes]
        for i in range(len(top_nbrs)):
            for j in range(i + 1, len(top_nbrs)):
                key = (min(top_nbrs[i], top_nbrs[j], key=str),
                       max(top_nbrs[i], top_nbrs[j], key=str))
                shared_count[key] = shared_count.get(key, 0) + 1
    for (u, v), count in shared_count.items():
        w = count
        if ratio:
            shared_nbrs = len(set(G.neighbors(u)) & set(G.neighbors(v)))
            total = len(set(G.neighbors(u)) | set(G.neighbors(v)))
            w = shared_nbrs / total if total else 0.0
        proj.add_edge(u, v, weight=w)
    return proj


def bipartite_clustering(G, nodes=None, mode: str = "dot") -> Dict[Any, float]:
    """Clustering coefficients for bipartite graphs.

    mode : 'dot' (default), 'min', or 'max'
    """
    if nodes is None:
        try:
            top, bottom = bipartite_sets(G)
            nodes = list(top) + list(bottom)
        except ValueError:
            nodes = list(G.nodes)

    clustering: Dict[Any, float] = {}
    for v in nodes:
        nbrs_v = set(G.neighbors(v))
        if len(nbrs_v) < 2:
            clustering[v] = 0.0
            continue
        # For each pair of v's neighbours, check if they share a common neighbour
        numerator = 0
        denominator = 0
        nbrs_list = list(nbrs_v)
        for i in range(len(nbrs_list)):
            for j in range(i + 1, len(nbrs_list)):
                u, w = nbrs_list[i], nbrs_list[j]
                nbrs_u = set(G.neighbors(u))
                nbrs_w = set(G.neighbors(w))
                shared = len(nbrs_u & nbrs_w) - (1 if v in nbrs_u and v in nbrs_w else 0)
                if mode == "dot":
                    numerator += shared
                    denominator += max(len(nbrs_u), len(nbrs_w)) - 1
                elif mode == "min":
                    numerator += shared
                    denominator += min(len(nbrs_u), len(nbrs_w)) - 1
                elif mode == "max":
                    numerator += shared
                    denominator += max(len(nbrs_u), len(nbrs_w)) - 1
        clustering[v] = numerator / denominator if denominator > 0 else 0.0
    return clustering


def degrees(G, top_nodes: Optional[Set] = None) -> Tuple[Dict, Dict]:
    """Return (top_degrees, bottom_degrees) for bipartite G."""
    if top_nodes is None:
        top_nodes, _ = bipartite_sets(G)
    bottom_nodes = set(G.nodes) - top_nodes
    top_degs = {v: G.degree(v) for v in top_nodes}
    bot_degs = {v: G.degree(v) for v in bottom_nodes}
    return top_degs, bot_degs
