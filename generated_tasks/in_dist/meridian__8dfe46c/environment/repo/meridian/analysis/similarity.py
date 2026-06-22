"""Node similarity and link prediction measures."""

from __future__ import annotations

import math
from typing import Any, Dict, Iterator, List, Optional, Tuple


# ---------------------------------------------------------------------------
# Common neighbours
# ---------------------------------------------------------------------------

def common_neighbors(G, u: Any, v: Any) -> List:
    """Return the list of common neighbours of u and v."""
    return list(set(G.neighbors(u)) & set(G.neighbors(v)))


def common_neighbor_centrality(G, ebunch=None, alpha: float = 0.8) -> Iterator[Tuple]:
    """Common Neighbor and Centrality based Predictor (CCPA).

    Yields (u, v, score) triples.
    """
    from meridian.algorithms.centrality import degree_centrality
    dc = degree_centrality(G)
    if ebunch is None:
        ebunch = _non_edges(G)
    for u, v in ebunch:
        cn = len(common_neighbors(G, u, v))
        score = alpha * cn + (1 - alpha) * (dc.get(u, 0) + dc.get(v, 0))
        yield u, v, score


# ---------------------------------------------------------------------------
# Jaccard coefficient
# ---------------------------------------------------------------------------

def jaccard_coefficient(G, ebunch=None) -> Iterator[Tuple]:
    """Yield (u, v, jaccard_score) for node pairs."""
    if ebunch is None:
        ebunch = _non_edges(G)
    for u, v in ebunch:
        nbrs_u = set(G.neighbors(u))
        nbrs_v = set(G.neighbors(v))
        union = len(nbrs_u | nbrs_v)
        if union == 0:
            yield u, v, 0.0
        else:
            yield u, v, len(nbrs_u & nbrs_v) / union


# ---------------------------------------------------------------------------
# Adamic-Adar index
# ---------------------------------------------------------------------------

def adamic_adar_index(G, ebunch=None) -> Iterator[Tuple]:
    """Yield (u, v, adamic_adar_score) for node pairs."""
    if ebunch is None:
        ebunch = _non_edges(G)
    for u, v in ebunch:
        cnbrs = common_neighbors(G, u, v)
        score = sum(
            1.0 / math.log(G.degree(w))
            for w in cnbrs
            if G.degree(w) > 1
        )
        yield u, v, score


# ---------------------------------------------------------------------------
# Preferential attachment
# ---------------------------------------------------------------------------

def preferential_attachment(G, ebunch=None) -> Iterator[Tuple]:
    """Yield (u, v, pa_score) where pa = deg(u) * deg(v)."""
    if ebunch is None:
        ebunch = _non_edges(G)
    for u, v in ebunch:
        yield u, v, G.degree(u) * G.degree(v)


# ---------------------------------------------------------------------------
# Resource allocation
# ---------------------------------------------------------------------------

def resource_allocation_index(G, ebunch=None) -> Iterator[Tuple]:
    """Yield (u, v, ra_score)."""
    if ebunch is None:
        ebunch = _non_edges(G)
    for u, v in ebunch:
        cnbrs = common_neighbors(G, u, v)
        score = sum(1.0 / G.degree(w) for w in cnbrs if G.degree(w) > 0)
        yield u, v, score


# ---------------------------------------------------------------------------
# Cosine similarity (structural)
# ---------------------------------------------------------------------------

def cosine_similarity(G, u: Any, v: Any) -> float:
    """Structural cosine similarity based on neighbourhood overlap."""
    nbrs_u = set(G.neighbors(u))
    nbrs_v = set(G.neighbors(v))
    nu = len(nbrs_u)
    nv = len(nbrs_v)
    if nu == 0 or nv == 0:
        return 0.0
    overlap = len(nbrs_u & nbrs_v)
    return overlap / math.sqrt(nu * nv)


# ---------------------------------------------------------------------------
# Simrank (structural equivalence)
# ---------------------------------------------------------------------------

def simrank_similarity(
    G,
    source=None,
    target=None,
    importance_factor: float = 0.9,
    max_iter: int = 100,
    tol: float = 1e-4,
) -> Dict:
    """Compute SimRank similarity.

    Returns a nested dict of {node: {node: score}}.
    """
    nodes = list(G)
    n = len(nodes)
    # Initialise similarity matrix
    sim: Dict[Any, Dict[Any, float]] = {
        u: {v: (1.0 if u == v else 0.0) for v in nodes} for u in nodes
    }
    for _ in range(max_iter):
        prev_sim = {u: dict(vals) for u, vals in sim.items()}
        max_diff = 0.0
        for a in nodes:
            for b in nodes:
                if a == b:
                    continue
                nbrs_a = list(G.predecessors(a) if G.is_directed() else G.neighbors(a))
                nbrs_b = list(G.predecessors(b) if G.is_directed() else G.neighbors(b))
                if not nbrs_a or not nbrs_b:
                    sim[a][b] = 0.0
                    continue
                s = sum(
                    prev_sim[na][nb]
                    for na in nbrs_a
                    for nb in nbrs_b
                )
                new_val = importance_factor * s / (len(nbrs_a) * len(nbrs_b))
                max_diff = max(max_diff, abs(new_val - sim[a][b]))
                sim[a][b] = new_val
        if max_diff < tol:
            break
    if source is not None and target is not None:
        return sim[source][target]
    if source is not None:
        return sim[source]
    return sim


# ---------------------------------------------------------------------------
# Graph edit distance (approximate)
# ---------------------------------------------------------------------------

def graph_edit_distance(G1, G2, node_match=None, edge_match=None) -> float:
    """Approximate graph edit distance using greedy matching.

    For exact computation use optimization-based methods (not implemented).
    """
    n1 = G1.number_of_nodes()
    n2 = G2.number_of_nodes()
    e1 = G1.number_of_edges()
    e2 = G2.number_of_edges()
    node_cost = abs(n1 - n2)
    edge_cost = abs(e1 - e2)
    # Structural dissimilarity
    deg1 = sorted(G1.degree().values(), reverse=True)
    deg2 = sorted(G2.degree().values(), reverse=True)
    max_len = max(len(deg1), len(deg2))
    deg1 += [0] * (max_len - len(deg1))
    deg2 += [0] * (max_len - len(deg2))
    deg_diff = sum(abs(a - b) for a, b in zip(deg1, deg2))
    return float(node_cost + edge_cost + deg_diff * 0.5)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _non_edges(G):
    """Yield all pairs (u, v) that are *not* edges in G."""
    nodes = list(G.nodes)
    for i, u in enumerate(nodes):
        for v in nodes[i + 1:]:
            if not G.has_edge(u, v):
                yield u, v
