"""Matching algorithms for bipartite and general graphs."""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Set, Tuple


# ---------------------------------------------------------------------------
# Bipartite maximum matching (Hopcroft-Karp)
# ---------------------------------------------------------------------------

def hopcroft_karp(G, top_nodes: Optional[Set] = None) -> Dict[Any, Any]:
    """Maximum bipartite matching via Hopcroft-Karp.

    Parameters
    ----------
    top_nodes : one side of the bipartite graph.  If None, computed via BFS.

    Returns a dict of matched pairs {u: v, v: u} for all matched nodes.
    """
    from meridian.analysis.bipartite import bipartite_sets
    if top_nodes is None:
        try:
            top_nodes, _ = bipartite_sets(G)
        except Exception:
            top_nodes = set(list(G)[:len(G) // 2])

    bottom_nodes = set(G.nodes) - top_nodes
    INF = float("inf")

    match_top: Dict[Any, Optional[Any]] = {u: None for u in top_nodes}
    match_bottom: Dict[Any, Optional[Any]] = {v: None for v in bottom_nodes}
    dist: Dict[Any, float] = {}

    def bfs():
        queue = []
        for u in top_nodes:
            if match_top[u] is None:
                dist[u] = 0
                queue.append(u)
            else:
                dist[u] = INF
        found = False
        while queue:
            next_q = []
            for u in queue:
                for v in G.neighbors(u):
                    if v not in bottom_nodes:
                        continue
                    mu = match_bottom.get(v)
                    if mu is None:
                        found = True
                    elif dist.get(mu, INF) == INF:
                        dist[mu] = dist[u] + 1
                        next_q.append(mu)
            queue = next_q
        return found

    def dfs(u):
        for v in G.neighbors(u):
            if v not in bottom_nodes:
                continue
            mu = match_bottom.get(v)
            if mu is None or (dist.get(mu, INF) == dist[u] + 1 and dfs(mu)):
                match_top[u] = v
                match_bottom[v] = u
                return True
        dist[u] = float("inf")
        return False

    while bfs():
        for u in top_nodes:
            if match_top[u] is None:
                dfs(u)

    matching: Dict[Any, Any] = {}
    for u, v in match_top.items():
        if v is not None:
            matching[u] = v
            matching[v] = u
    return matching


def maximum_matching(G) -> Dict[Any, Any]:
    """Maximum cardinality matching for general graphs (greedy approximation).

    For exact results on bipartite graphs use ``hopcroft_karp``.
    Uses Edmond's blossom algorithm simplified to a greedy approach for
    non-bipartite graphs.
    """
    matching: Dict[Any, Any] = {}
    # Greedy augmenting path approach
    nodes = sorted(G.nodes, key=lambda v: G.degree(v), reverse=True)
    matched: Set = set()
    for u in nodes:
        if u in matched:
            continue
        for v in G.neighbors(u):
            if v not in matched and u != v:
                matching[u] = v
                matching[v] = u
                matched.add(u)
                matched.add(v)
                break
    return matching


def is_perfect_matching(G, matching: Dict[Any, Any]) -> bool:
    """Return True if *matching* covers all nodes."""
    return len(matching) == G.number_of_nodes()


def matching_weight(G, matching: Dict[Any, Any], weight: str = "weight") -> float:
    """Return total weight of edges in *matching*."""
    total = 0.0
    seen: Set = set()
    for u, v in matching.items():
        if u not in seen:
            total += G.get_edge_data(u, v, {}).get(weight, 1.0)
            seen.add(u)
            seen.add(v)
    return total


# ---------------------------------------------------------------------------
# Minimum weight matching (Hungarian algorithm for bipartite)
# ---------------------------------------------------------------------------

def minimum_weight_bipartite_matching(
    G,
    top_nodes: Optional[Set] = None,
    weight: str = "weight",
) -> Dict[Any, Any]:
    """Minimum weight perfect matching via Hungarian algorithm.

    Requires a complete bipartite graph with equal-size parts.
    """
    from meridian.analysis.bipartite import bipartite_sets
    if top_nodes is None:
        try:
            top_nodes, bottom_nodes = bipartite_sets(G)
        except Exception:
            n2 = len(G) // 2
            nodes = list(G)
            top_nodes = set(nodes[:n2])
            bottom_nodes = set(nodes[n2:])
    else:
        bottom_nodes = set(G.nodes) - top_nodes

    top = list(top_nodes)
    bot = list(bottom_nodes)
    n = max(len(top), len(bot))
    INF = float("inf")

    # Build cost matrix
    cost = [[0.0] * n for _ in range(n)]
    for i, u in enumerate(top):
        for j, v in enumerate(bot):
            data = G.get_edge_data(u, v)
            if data is None:
                cost[i][j] = INF
            else:
                cost[i][j] = data.get(weight, 1.0)

    # Hungarian algorithm
    n2 = n
    u_pot = [0.0] * (n2 + 1)
    v_pot = [0.0] * (n2 + 1)
    p = [0] * (n2 + 1)  # p[j] = row matched to column j
    way = [0] * (n2 + 1)

    for i in range(1, n2 + 1):
        p[0] = i
        j0 = 0
        minval = [INF] * (n2 + 1)
        used = [False] * (n2 + 1)

        while True:
            used[j0] = True
            i0 = p[j0]
            delta = INF
            j1 = -1
            for j in range(1, n2 + 1):
                if not used[j]:
                    r_idx = i0 - 1
                    c_idx = j - 1
                    cur = (cost[r_idx][c_idx] if r_idx < len(top) and c_idx < len(bot)
                           else INF)
                    cur -= u_pot[i0] + v_pot[j]
                    if cur < minval[j]:
                        minval[j] = cur
                        way[j] = j0
                    if minval[j] < delta:
                        delta = minval[j]
                        j1 = j
            if j1 == -1:
                break
            for j in range(n2 + 1):
                if used[j]:
                    u_pot[p[j]] += delta
                    v_pot[j] -= delta
                else:
                    minval[j] -= delta
            j0 = j1
            if p[j0] == 0:
                break

        while j0:
            p[j0] = p[way[j0]]
            j0 = way[j0]

    matching: Dict[Any, Any] = {}
    for j in range(1, n2 + 1):
        if p[j] and p[j] <= len(top) and j <= len(bot):
            u = top[p[j] - 1]
            v = bot[j - 1]
            if G.has_edge(u, v):
                matching[u] = v
                matching[v] = u
    return matching


# ---------------------------------------------------------------------------
# Independent sets
# ---------------------------------------------------------------------------

def maximal_independent_set(G, nodes=None, seed: Optional[int] = None) -> List:
    """Return a maximal independent set (greedy).

    Not necessarily maximum.  Pass *nodes* to restrict to a subset.
    """
    import random
    if seed is not None:
        random.seed(seed)
    candidates = list(nodes) if nodes is not None else list(G.nodes)
    random.shuffle(candidates)
    ind_set: List = []
    excluded: Set = set()
    for v in candidates:
        if v not in excluded:
            ind_set.append(v)
            excluded.add(v)
            excluded.update(G.neighbors(v))
    return ind_set


def is_independent_set(G, nodes) -> bool:
    """Return True if no two nodes in *nodes* are adjacent."""
    node_set = set(nodes)
    for u in node_set:
        for v in G.neighbors(u):
            if v in node_set and v != u:
                return False
    return True
