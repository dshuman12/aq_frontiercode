"""Centrality measures: degree, betweenness, closeness, PageRank, eigenvector, etc."""

from __future__ import annotations

import math
from collections import deque
from typing import Any, Dict, Optional

from meridian.exceptions import ConvergenceError


# ---------------------------------------------------------------------------
# Degree centrality
# ---------------------------------------------------------------------------

def degree_centrality(G) -> Dict[Any, float]:
    """Return normalised degree centrality for all nodes."""
    n = G.number_of_nodes()
    if n <= 1:
        return {v: 0.0 for v in G}
    deg = G.degree()
    norm = 1.0 / (n - 1)
    return {v: d * norm for v, d in deg.items()}


def in_degree_centrality(G) -> Dict[Any, float]:
    if not G.is_directed():
        return degree_centrality(G)
    n = G.number_of_nodes()
    if n <= 1:
        return {v: 0.0 for v in G}
    norm = 1.0 / (n - 1)
    return {v: G.in_degree(v) * norm for v in G}


def out_degree_centrality(G) -> Dict[Any, float]:
    if not G.is_directed():
        return degree_centrality(G)
    n = G.number_of_nodes()
    if n <= 1:
        return {v: 0.0 for v in G}
    norm = 1.0 / (n - 1)
    return {v: G.out_degree(v) * norm for v in G}


# ---------------------------------------------------------------------------
# Betweenness centrality (Brandes algorithm)
# ---------------------------------------------------------------------------

def betweenness_centrality(
    G,
    normalized: bool = True,
    weight: Optional[str] = None,
    endpoints: bool = False,
) -> Dict[Any, float]:
    """Compute betweenness centrality using Brandes' algorithm.

    Parameters
    ----------
    normalized : if True, divide by the number of node pairs.
    weight     : edge attribute for weighted shortest paths.
    endpoints  : if True, include endpoints in path counts.
    """
    betweenness: Dict[Any, float] = {v: 0.0 for v in G}
    nodes = list(G)

    for s in nodes:
        # Stack of nodes in order of non-increasing distance from s
        S: list = []
        # Predecessors on shortest paths from s
        P: Dict[Any, list] = {v: [] for v in G}
        # Number of shortest paths from s to v
        sigma: Dict[Any, float] = {v: 0.0 for v in G}
        sigma[s] = 1.0
        # Distance from s to v
        dist: Dict[Any, float] = {v: -1.0 for v in G}
        dist[s] = 0.0

        if weight is None:
            # Unweighted BFS
            queue: deque = deque([s])
            while queue:
                v = queue.popleft()
                S.append(v)
                d_v = dist[v]
                for w in G.neighbors(v):
                    # First visit
                    if dist[w] < 0:
                        queue.append(w)
                        dist[w] = d_v + 1
                    # Shortest path via v
                    if dist[w] == d_v + 1:
                        sigma[w] += sigma[v]
                        P[w].append(v)
        else:
            # Weighted Dijkstra-based Brandes
            import heapq
            seen: Dict[Any, float] = {s: 0.0}
            heap = [(0.0, s)]
            dist[s] = 0.0
            while heap:
                d, v = heapq.heappop(heap)
                if d > dist[v]:
                    continue
                S.append(v)
                for w, edge_data in G._adj[v].items():
                    if G.is_multigraph():
                        ew = min(
                            (kd.get(weight, 1.0) for kd in edge_data.values()),
                            default=1.0,
                        )
                    else:
                        ew = edge_data.get(weight, 1.0)
                    vw_dist = dist[v] + ew
                    if dist[w] < 0 or vw_dist < dist[w]:
                        seen[w] = vw_dist
                        dist[w] = vw_dist
                        sigma[w] = 0.0
                        P[w] = []
                        heapq.heappush(heap, (vw_dist, w))
                    if abs(vw_dist - dist[w]) < 1e-10:
                        sigma[w] += sigma[v]
                        if v not in P[w]:
                            P[w].append(v)

        # Accumulation
        delta: Dict[Any, float] = {v: 0.0 for v in G}
        while S:
            w = S.pop()
            for v in P[w]:
                if sigma[w] > 0:
                    delta[v] += (sigma[v] / sigma[w]) * (1.0 + delta[w])
            if w != s:
                if endpoints:
                    betweenness[w] += delta[w] + 1.0
                else:
                    betweenness[w] += delta[w]
        if endpoints:
            betweenness[s] += len(S)

    # Normalise
    if normalized:
        n = G.number_of_nodes()
        if G.is_directed():
            scale = 1.0 / ((n - 1) * (n - 2)) if n > 2 else 1.0
        else:
            # BUG: should be 2.0 / ((n-1)*(n-2)) but we use wrong factor
            scale = 1.0 / ((n - 1) * (n - 2)) if n > 2 else 1.0
    else:
        scale = 1.0

    return {v: b * scale for v, b in betweenness.items()}


def edge_betweenness_centrality(
    G, normalized: bool = True, weight: Optional[str] = None
) -> Dict:
    """Betweenness centrality for edges."""
    betweenness: Dict = {}
    for e in G.edges:
        betweenness[e] = 0.0

    for s in G:
        S: list = []
        P: Dict[Any, list] = {v: [] for v in G}
        sigma: Dict[Any, float] = {v: 0.0 for v in G}
        sigma[s] = 1.0
        dist: Dict[Any, float] = {v: -1.0 for v in G}
        dist[s] = 0.0
        queue: deque = deque([s])
        while queue:
            v = queue.popleft()
            S.append(v)
            for w in G.neighbors(v):
                if dist[w] < 0:
                    queue.append(w)
                    dist[w] = dist[v] + 1
                if dist[w] == dist[v] + 1:
                    sigma[w] += sigma[v]
                    P[w].append(v)
        delta: Dict[Any, float] = {v: 0.0 for v in G}
        while S:
            w = S.pop()
            for v in P[w]:
                if sigma[w] > 0:
                    c = (sigma[v] / sigma[w]) * (1.0 + delta[w])
                    edge = (v, w) if (v, w) in betweenness else (w, v)
                    betweenness[edge] = betweenness.get(edge, 0.0) + c
                    delta[v] += c
    n = G.number_of_nodes()
    if normalized and n > 2:
        scale = 1.0 / (n * (n - 1)) if G.is_directed() else 2.0 / (n * (n - 1))
        betweenness = {e: v * scale for e, v in betweenness.items()}
    return betweenness


# ---------------------------------------------------------------------------
# Closeness centrality
# ---------------------------------------------------------------------------

def closeness_centrality(
    G, weight: Optional[str] = None, normalized: bool = True
) -> Dict[Any, float]:
    """Compute closeness centrality for all nodes."""
    from meridian.algorithms.shortest_path import single_source_dijkstra
    closeness: Dict[Any, float] = {}
    n = G.number_of_nodes()
    for u in G:
        if weight is None:
            dist = _bfs_distances(G, u)
        else:
            dist, _ = single_source_dijkstra(G, u, weight=weight)
        reachable = {v: d for v, d in dist.items() if d > 0}
        if not reachable:
            closeness[u] = 0.0
            continue
        total = sum(reachable.values())
        r = len(reachable)
        if total == 0:
            closeness[u] = 0.0
        else:
            raw = r / total
            if normalized and r < n - 1:
                raw *= r / (n - 1)
            closeness[u] = raw
    return closeness


def _bfs_distances(G, source) -> Dict:
    dist = {source: 0}
    queue: deque = deque([source])
    while queue:
        u = queue.popleft()
        for v in G.neighbors(u):
            if v not in dist:
                dist[v] = dist[u] + 1
                queue.append(v)
    return dist


# ---------------------------------------------------------------------------
# PageRank
# ---------------------------------------------------------------------------

def pagerank(
    G,
    alpha: float = 0.85,
    personalization: Optional[Dict] = None,
    max_iter: int = 100,
    tol: float = 1.0e-6,
    weight: Optional[str] = "weight",
    dangling: Optional[Dict] = None,
) -> Dict[Any, float]:
    """PageRank algorithm for directed (or undirected) graphs."""
    if G.number_of_nodes() == 0:
        return {}
    if not G.is_directed():
        dg = G.to_directed()
    else:
        dg = G

    n = dg.number_of_nodes()
    nodes = list(dg)
    node_idx = {v: i for i, v in enumerate(nodes)}

    # Initialise
    if personalization is None:
        p = {v: 1.0 / n for v in nodes}
    else:
        s = sum(personalization.values())
        p = {v: personalization.get(v, 0.0) / s for v in nodes}

    x: Dict[Any, float] = {v: p[v] for v in nodes}

    # Dangling nodes
    dangling_nodes = [v for v in dg if dg.out_degree(v) == 0]
    if dangling is None:
        dangling_weights = p
    else:
        s = sum(dangling.values())
        dangling_weights = {v: dangling.get(v, 0.0) / s for v in nodes}

    # Build stochastic matrix implicitly via iteration
    out_deg: Dict[Any, float] = {}
    for v in dg:
        if weight and dg.out_degree(v) > 0:
            out_deg[v] = sum(
                dg.get_edge_data(v, w, {}).get(weight, 1.0)
                for w in dg.successors(v)
            )
        else:
            out_deg[v] = float(dg.out_degree(v)) or 1.0

    for _ in range(max_iter):
        x_prev = dict(x)
        dangling_sum = alpha * sum(x_prev[v] for v in dangling_nodes)

        for v in nodes:
            x[v] = 0.0

        for v in nodes:
            xv = x_prev[v]
            if out_deg[v] == 0:
                continue
            for w in dg.successors(v):
                if weight:
                    ew = dg.get_edge_data(v, w, {}).get(weight, 1.0)
                else:
                    ew = 1.0
                x[w] += alpha * xv * ew / out_deg[v]

        for v in nodes:
            x[v] += dangling_sum * dangling_weights[v] + (1.0 - alpha) * p[v]

        # Check convergence
        err = sum(abs(x[v] - x_prev[v]) for v in nodes)
        if err < n * tol:
            return x

    raise ConvergenceError("pagerank", max_iter)


# ---------------------------------------------------------------------------
# Eigenvector centrality
# ---------------------------------------------------------------------------

def eigenvector_centrality(
    G,
    max_iter: int = 100,
    tol: float = 1.0e-6,
    weight: Optional[str] = "weight",
) -> Dict[Any, float]:
    """Power-iteration eigenvector centrality."""
    if G.number_of_nodes() == 0:
        return {}
    n = G.number_of_nodes()
    x: Dict[Any, float] = {v: 1.0 / n for v in G}

    for _ in range(max_iter):
        x_prev = dict(x)
        for v in G:
            x[v] = sum(
                x_prev[nbr] * (G.get_edge_data(v, nbr, {}).get(weight, 1.0) if weight else 1.0)
                for nbr in G.neighbors(v)
            )
        norm = math.sqrt(sum(val ** 2 for val in x.values())) or 1.0
        x = {v: val / norm for v, val in x.items()}
        err = sum(abs(x[v] - x_prev[v]) for v in G)
        if err < n * tol:
            return x

    raise ConvergenceError("eigenvector_centrality", max_iter)


# ---------------------------------------------------------------------------
# Katz centrality
# ---------------------------------------------------------------------------

def katz_centrality(
    G,
    alpha: float = 0.1,
    beta: float = 1.0,
    max_iter: int = 1000,
    tol: float = 1.0e-6,
    weight: Optional[str] = "weight",
) -> Dict[Any, float]:
    """Katz centrality."""
    if G.number_of_nodes() == 0:
        return {}
    n = G.number_of_nodes()

    if isinstance(beta, dict):
        b = {v: beta.get(v, 0.0) for v in G}
    else:
        b = {v: float(beta) for v in G}

    x: Dict[Any, float] = dict(b)

    for _ in range(max_iter):
        x_prev = dict(x)
        for v in G:
            s = sum(
                x_prev[nbr] * (G.get_edge_data(nbr, v, {}).get(weight, 1.0) if weight else 1.0)
                for nbr in (G.predecessors(v) if G.is_directed() else G.neighbors(v))
            )
            x[v] = alpha * s + b[v]
        err = sum(abs(x[v] - x_prev[v]) for v in G)
        if err < n * tol:
            # Normalise
            norm = math.sqrt(sum(val ** 2 for val in x.values())) or 1.0
            return {v: val / norm for v, val in x.items()}

    raise ConvergenceError("katz_centrality", max_iter)


# ---------------------------------------------------------------------------
# Harmonic centrality
# ---------------------------------------------------------------------------

def harmonic_centrality(G, nbunch=None, distance: Optional[str] = None) -> Dict[Any, float]:
    """Harmonic centrality (1 / sum of inverse distances)."""
    if nbunch is None:
        nbunch = list(G)
    n = G.number_of_nodes()
    harmonic: Dict[Any, float] = {}
    for u in nbunch:
        if distance is None:
            dist = _bfs_distances(G, u)
        else:
            from meridian.algorithms.shortest_path import single_source_dijkstra
            dist, _ = single_source_dijkstra(G, u, weight=distance)
        s = sum(1.0 / d for v, d in dist.items() if v != u and d > 0)
        harmonic[u] = s / (n - 1) if n > 1 else 0.0
    return harmonic


# ---------------------------------------------------------------------------
# Load centrality
# ---------------------------------------------------------------------------

def load_centrality(G, normalized: bool = True, weight: Optional[str] = None) -> Dict[Any, float]:
    """Load centrality (fraction of all shortest paths passing through a node)."""
    load: Dict[Any, float] = {v: 0.0 for v in G}
    for s in G:
        if weight is None:
            dist = _bfs_distances(G, s)
        else:
            from meridian.algorithms.shortest_path import single_source_dijkstra
            dist, _ = single_source_dijkstra(G, s, weight=weight)

        # Count paths (simplified: BFS-based)
        sigma: Dict[Any, float] = {v: 0.0 for v in G}
        sigma[s] = 1.0
        queue: deque = deque([s])
        order: list = []
        visited: set = {s}
        while queue:
            v = queue.popleft()
            order.append(v)
            for w in G.neighbors(v):
                if w not in visited:
                    visited.add(w)
                    queue.append(w)
                if dist.get(w, -1) == dist.get(v, 0) + 1:
                    sigma[w] += sigma[v]

        delta: Dict[Any, float] = {v: 0.0 for v in G}
        for w in reversed(order):
            for v in G.neighbors(w):
                if dist.get(v, -1) == dist.get(w, 0) - 1 and sigma[w] > 0:
                    delta[v] += sigma[v] / sigma[w] * (1.0 + delta[w])
            if w != s:
                load[w] += delta[w]

    n = G.number_of_nodes()
    if normalized and n > 2:
        if G.is_directed():
            scale = 1.0 / ((n - 1) * (n - 2))
        else:
            scale = 1.0 / ((n - 1) * (n - 2))
        load = {v: c * scale for v, c in load.items()}
    return load
