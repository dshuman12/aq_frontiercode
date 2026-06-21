"""Spanning tree algorithms: Kruskal and Prim."""

from __future__ import annotations

import heapq
from typing import Any, Iterator, Optional

from meridian.exceptions import GraphNotConnected


# ---------------------------------------------------------------------------
# Union-Find (disjoint set) used by Kruskal
# ---------------------------------------------------------------------------

class UnionFind:
    """Disjoint-set data structure with union by rank and path compression."""

    def __init__(self, nodes) -> None:
        self.parent = {n: n for n in nodes}
        self.rank: dict = {n: 0 for n in nodes}

    def find(self, x) -> Any:
        while self.parent[x] != x:
            self.parent[x] = self.parent[self.parent[x]]  # path halving
            x = self.parent[x]
        return x

    def union(self, x, y) -> bool:
        """Merge sets containing x and y.  Returns True if they were disjoint."""
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        return True

    def connected(self, x, y) -> bool:
        return self.find(x) == self.find(y)


# ---------------------------------------------------------------------------
# Kruskal
# ---------------------------------------------------------------------------

def kruskal_mst(G, weight: str = "weight", maximum: bool = False) -> Iterator:
    """Yield (u, v, data) MST edges via Kruskal's algorithm."""
    if G.is_directed():
        raise TypeError("Kruskal's MST requires an undirected graph")
    uf = UnionFind(G.nodes)
    edges = sorted(
        G.edges.data(),
        key=lambda e: e[2].get(weight, 1.0),
        reverse=maximum,
    )
    for u, v, data in edges:
        if uf.union(u, v):
            yield u, v, data


def minimum_spanning_tree(G, weight: str = "weight", algorithm: str = "kruskal"):
    """Return the minimum spanning tree as a new Graph."""
    from meridian.graph import Graph
    if algorithm == "kruskal":
        mst_edges = kruskal_mst(G, weight=weight)
    elif algorithm == "prim":
        mst_edges = prim_mst(G, weight=weight)
    else:
        raise ValueError(f"Unknown algorithm {algorithm!r}; use 'kruskal' or 'prim'")

    T = Graph(name=f"{G.name}_mst")
    for n, d in G.nodes.data():
        T.add_node(n, **d)
    for u, v, d in mst_edges:
        T.add_edge(u, v, **d)
    return T


def maximum_spanning_tree(G, weight: str = "weight", algorithm: str = "kruskal"):
    """Return the maximum spanning tree."""
    from meridian.graph import Graph
    if algorithm == "kruskal":
        mst_edges = kruskal_mst(G, weight=weight, maximum=True)
    elif algorithm == "prim":
        mst_edges = prim_mst(G, weight=weight, maximum=True)
    else:
        raise ValueError(f"Unknown algorithm {algorithm!r}")

    T = Graph(name=f"{G.name}_max_st")
    for n, d in G.nodes.data():
        T.add_node(n, **d)
    for u, v, d in mst_edges:
        T.add_edge(u, v, **d)
    return T


def minimum_spanning_edges(G, weight: str = "weight") -> Iterator:
    """Yield MST edges without constructing a new graph."""
    yield from kruskal_mst(G, weight=weight)


# ---------------------------------------------------------------------------
# Prim
# ---------------------------------------------------------------------------

def prim_mst(G, weight: str = "weight", maximum: bool = False) -> Iterator:
    """Yield (u, v, data) MST edges via Prim's algorithm.

    Starts from an arbitrary node.  For forests (disconnected graphs) each
    component is spanned separately.
    """
    if G.is_directed():
        raise TypeError("Prim's MST requires an undirected graph")
    if G.number_of_nodes() == 0:
        return

    visited: set = set()
    multiplier = -1.0 if maximum else 1.0

    for start in G:
        if start in visited:
            continue
        visited.add(start)
        heap: list = []
        for nbr, data in G._adj[start].items():
            if G.is_multigraph():
                w = min(
                    (kd.get(weight, 1.0) for kd in data.values()),
                    default=1.0,
                )
            else:
                w = data.get(weight, 1.0)
            heapq.heappush(heap, (multiplier * w, start, nbr, data))

        while heap:
            w_raw, u, v, data = heapq.heappop(heap)
            if v in visited:
                continue
            visited.add(v)
            yield u, v, data
            for nbr, ndata in G._adj[v].items():
                if nbr not in visited:
                    if G.is_multigraph():
                        nw = min(
                            (kd.get(weight, 1.0) for kd in ndata.values()),
                            default=1.0,
                        )
                    else:
                        nw = ndata.get(weight, 1.0)
                    heapq.heappush(heap, (multiplier * nw, v, nbr, ndata))


# ---------------------------------------------------------------------------
# MST helpers
# ---------------------------------------------------------------------------

def is_spanning_tree(G, T) -> bool:
    """Return True if T is a spanning tree of G."""
    if T.number_of_nodes() != G.number_of_nodes():
        return False
    if T.number_of_edges() != G.number_of_nodes() - 1:
        return False
    from meridian.algorithms.components import is_connected
    return is_connected(T)


def spanning_tree_weight(T, weight: str = "weight") -> float:
    """Return total weight of spanning tree *T*."""
    return sum(d.get(weight, 1.0) for _, _, d in T.edges.data())


def random_spanning_tree(G, weight: Optional[str] = None, seed: Optional[int] = None):
    """Generate a uniformly random spanning tree using Wilson's algorithm."""
    import random
    if seed is not None:
        random.seed(seed)
    if G.number_of_nodes() == 0:
        from meridian.graph import Graph
        return Graph()

    from meridian.graph import Graph
    nodes = list(G)
    in_tree: set = {nodes[0]}
    next_node: dict = {}

    while len(in_tree) < len(nodes):
        # Random walk from a non-tree node until we hit the tree
        u = random.choice([n for n in nodes if n not in in_tree])
        walk_start = u
        while u not in in_tree:
            nbrs = list(G.neighbors(u))
            if not nbrs:
                break
            v = random.choice(nbrs)
            next_node[u] = v
            u = v
        # Trace back from walk_start and add to tree
        u = walk_start
        while u not in in_tree:
            in_tree.add(u)
            u = next_node[u]

    T = Graph()
    for n, d in G.nodes.data():
        T.add_node(n, **d)
    for u in nodes:
        if u in next_node and u != nodes[0]:
            v = next_node[u]
            T.add_edge(u, v, **G.get_edge_data(u, v, {}))
    return T
