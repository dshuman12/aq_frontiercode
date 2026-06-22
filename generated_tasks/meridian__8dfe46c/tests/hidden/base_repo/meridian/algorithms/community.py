"""Community detection algorithms."""

from __future__ import annotations

import random
from typing import Any, Dict, Iterator, List, Optional, Set, Tuple


# ---------------------------------------------------------------------------
# Modularity
# ---------------------------------------------------------------------------

def modularity(G, partition: List[Set], weight: Optional[str] = "weight") -> float:
    """Compute Newman-Girvan modularity Q for a given partition.

    Parameters
    ----------
    partition : list of sets of nodes

    Returns Q in [-1, 1].
    """
    m = G.size(weight=weight) if weight else G.number_of_edges()
    if m == 0:
        return 0.0

    q = 0.0
    for community in partition:
        for u in community:
            for v in community:
                if G.is_directed():
                    aij = float(G.has_edge(u, v))
                    if weight and G.has_edge(u, v):
                        aij = G.get_edge_data(u, v, {}).get(weight, 1.0)
                    ki_out = G.out_degree(u, weight=weight) if weight else G.out_degree(u)
                    kj_in = G.in_degree(v, weight=weight) if weight else G.in_degree(v)
                    q += aij - ki_out * kj_in / m
                else:
                    aij = float(G.has_edge(u, v))
                    if weight and G.has_edge(u, v):
                        aij = G.get_edge_data(u, v, {}).get(weight, 1.0)
                    ki = G.degree(u, weight=weight) if weight else G.degree(u)
                    kj = G.degree(v, weight=weight) if weight else G.degree(v)
                    q += aij - ki * kj / (2 * m)

    return q / (2 * m) if not G.is_directed() else q / m


# ---------------------------------------------------------------------------
# Label propagation
# ---------------------------------------------------------------------------

def label_propagation_communities(
    G,
    weight: Optional[str] = None,
    max_iter: int = 100,
    seed: Optional[int] = None,
) -> List[Set]:
    """Detect communities via label propagation.

    Each node is assigned the most common label among its neighbours,
    iterated until stable or *max_iter* is reached.
    """
    if seed is not None:
        random.seed(seed)

    labels: Dict[Any, Any] = {n: n for n in G}
    nodes = list(G)

    for _ in range(max_iter):
        changed = False
        random.shuffle(nodes)
        for v in nodes:
            if G.degree(v) == 0:
                continue
            # Count neighbour labels (weighted)
            label_weights: Dict[Any, float] = {}
            for nbr in G.neighbors(v):
                lbl = labels[nbr]
                w = 1.0
                if weight and G.has_edge(v, nbr):
                    w = G.get_edge_data(v, nbr, {}).get(weight, 1.0)
                label_weights[lbl] = label_weights.get(lbl, 0.0) + w

            # Find max weight label(s) and pick one randomly
            max_w = max(label_weights.values())
            best_labels = [lbl for lbl, ww in label_weights.items() if ww == max_w]
            new_lbl = random.choice(best_labels)
            if new_lbl != labels[v]:
                labels[v] = new_lbl
                changed = True

        if not changed:
            break

    # Group nodes by final label
    groups: Dict[Any, Set] = {}
    for node, lbl in labels.items():
        groups.setdefault(lbl, set()).add(node)
    return list(groups.values())


# ---------------------------------------------------------------------------
# Girvan-Newman (edge betweenness removal)
# ---------------------------------------------------------------------------

def girvan_newman(G, most_valuable_edge=None) -> Iterator:
    """Generate community partitions by iteratively removing the edge with
    highest betweenness centrality.

    Yields a tuple of frozensets at each removal step.
    """
    from meridian.algorithms.centrality import edge_betweenness_centrality
    from meridian.algorithms.components import connected_components

    if most_valuable_edge is None:
        def most_valuable_edge(g):
            eb = edge_betweenness_centrality(g, normalized=False)
            return max(eb, key=eb.get)

    g = G.copy()
    n_components = len(connected_components(g))

    while g.number_of_edges() > 0:
        edge = most_valuable_edge(g)
        g.remove_edge(*edge[:2])
        new_comps = connected_components(g)
        if len(new_comps) > n_components:
            n_components = len(new_comps)
            yield tuple(frozenset(c) for c in new_comps)


# ---------------------------------------------------------------------------
# Louvain-like (greedy modularity optimisation)
# ---------------------------------------------------------------------------

def louvain_communities(
    G,
    weight: Optional[str] = "weight",
    resolution: float = 1.0,
    seed: Optional[int] = None,
    max_iter: int = 100,
) -> List[Set]:
    """Greedy modularity optimisation (simplified Louvain).

    For small graphs produces near-optimal communities; for large graphs
    results are approximate.
    """
    if seed is not None:
        random.seed(seed)

    # Phase 1: initialise each node in its own community
    community: Dict[Any, int] = {n: i for i, n in enumerate(G)}
    nodes = list(G)
    m = G.size(weight=weight) if weight else G.number_of_edges()
    if m == 0:
        return [{n} for n in G]

    def _total_degree(comm_id):
        return sum(
            (G.degree(n, weight=weight) if weight else G.degree(n))
            for n, c in community.items()
            if c == comm_id
        )

    improved = True
    iterations = 0
    while improved and iterations < max_iter:
        improved = False
        iterations += 1
        random.shuffle(nodes)
        for v in nodes:
            best_gain = 0.0
            best_comm = community[v]
            kv = G.degree(v, weight=weight) if weight else G.degree(v)

            # Neighbour communities
            nbr_comms: Dict[int, float] = {}
            for nbr in G.neighbors(v):
                c = community[nbr]
                w = 1.0
                if weight and G.has_edge(v, nbr):
                    w = G.get_edge_data(v, nbr, {}).get(weight, 1.0)
                nbr_comms[c] = nbr_comms.get(c, 0.0) + w

            current_comm = community[v]
            current_k_in = nbr_comms.get(current_comm, 0.0)

            for target_comm, k_in in nbr_comms.items():
                if target_comm == current_comm:
                    continue
                sigma_total = _total_degree(target_comm)
                gain = (
                    resolution * k_in / m
                    - sigma_total * kv / (2 * m * m)
                )
                removal_cost = (
                    resolution * current_k_in / m
                    - _total_degree(current_comm) * kv / (2 * m * m)
                )
                net = gain - removal_cost
                if net > best_gain:
                    best_gain = net
                    best_comm = target_comm

            if best_comm != current_comm:
                community[v] = best_comm
                improved = True

    # Build community sets
    groups: Dict[int, Set] = {}
    for node, cid in community.items():
        groups.setdefault(cid, set()).add(node)
    return list(groups.values())


# ---------------------------------------------------------------------------
# K-clique communities
# ---------------------------------------------------------------------------

def k_clique_communities(G, k: int) -> List[Set]:
    """Find k-clique communities by percolation.

    Two k-cliques are in the same community if they share k-1 nodes.
    """
    if k < 2:
        raise ValueError("k must be >= 2")
    from meridian.analysis.clique import find_cliques
    cliques = [frozenset(c) for c in find_cliques(G) if len(c) >= k]

    # Build clique adjacency graph
    clique_graph: Dict[int, Set[int]] = {i: set() for i in range(len(cliques))}
    for i in range(len(cliques)):
        for j in range(i + 1, len(cliques)):
            if len(cliques[i] & cliques[j]) >= k - 1:
                clique_graph[i].add(j)
                clique_graph[j].add(i)

    # Connected components of clique graph
    visited: Set[int] = set()
    node_communities: List[Set] = []
    for start in range(len(cliques)):
        if start in visited:
            continue
        stack = [start]
        component_nodes: Set[Any] = set()
        while stack:
            ci = stack.pop()
            if ci in visited:
                continue
            visited.add(ci)
            component_nodes |= cliques[ci]
            for nbr in clique_graph[ci]:
                if nbr not in visited:
                    stack.append(nbr)
        if component_nodes:
            node_communities.append(component_nodes)
    return node_communities


# ---------------------------------------------------------------------------
# Partition quality metrics
# ---------------------------------------------------------------------------

def coverage(G, partition: List[Set]) -> float:
    """Fraction of intra-community edges."""
    total_edges = G.number_of_edges()
    if total_edges == 0:
        return 1.0
    node_to_comm = {}
    for i, comm in enumerate(partition):
        for v in comm:
            node_to_comm[v] = i
    intra = sum(
        1 for u, v in G.edges
        if node_to_comm.get(u) == node_to_comm.get(v)
    )
    return intra / total_edges


def performance(G, partition: List[Set]) -> float:
    """Ratio of correctly classified node pairs (intra-comm edges + inter-comm non-edges)."""
    n = G.number_of_nodes()
    if n < 2:
        return 1.0
    node_to_comm = {}
    for i, comm in enumerate(partition):
        for v in comm:
            node_to_comm[v] = i
    total_pairs = n * (n - 1) // 2
    correct = 0
    nodes = list(G)
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            u, v = nodes[i], nodes[j]
            same_comm = node_to_comm.get(u) == node_to_comm.get(v)
            has_edge = G.has_edge(u, v)
            if same_comm == has_edge:
                correct += 1
    return correct / total_pairs
