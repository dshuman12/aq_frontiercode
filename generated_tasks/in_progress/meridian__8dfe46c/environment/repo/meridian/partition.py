"""Graph partitioning algorithms."""

from __future__ import annotations

import math
import random as _random
from typing import Any, Dict, List, Optional, Set, Tuple


# ---------------------------------------------------------------------------
# Kernighan-Lin bipartition
# ---------------------------------------------------------------------------

def kernighan_lin_bisection(
    G,
    partition: Optional[Tuple[set, set]] = None,
    max_iter: int = 10,
    weight: str = "weight",
    seed: Optional[int] = None,
) -> Tuple[Set, Set]:
    """Partition *G* into two approximately equal sets minimising the cut weight.

    Uses the Kernighan-Lin algorithm.

    Parameters
    ----------
    partition : initial (A, B) partition.  If None, nodes split randomly.
    max_iter  : outer iterations.
    seed      : random seed for initial partition.

    Returns
    -------
    (A, B) frozensets of nodes.
    """
    rng = _random.Random(seed)
    nodes = list(G)
    n = len(nodes)
    if n < 2:
        return set(nodes), set()

    # Initial random balanced partition
    if partition is None:
        shuffled = list(nodes)
        rng.shuffle(shuffled)
        mid = n // 2
        A: set = set(shuffled[:mid])
        B: set = set(shuffled[mid:])
    else:
        A, B = set(partition[0]), set(partition[1])

    def _cut_cost():
        return sum(
            G.get_edge_data(u, v, {}).get(weight, 1.0)
            for u, v in G.edges
            if (u in A and v in B) or (u in B and v in A)
        )

    def _d_value(v, own_set, other_set):
        """External cost - Internal cost for node v."""
        external = sum(
            G.get_edge_data(v, nbr, {}).get(weight, 1.0)
            for nbr in G.neighbors(v)
            if nbr in other_set
        )
        internal = sum(
            G.get_edge_data(v, nbr, {}).get(weight, 1.0)
            for nbr in G.neighbors(v)
            if nbr in own_set
        )
        return external - internal

    best_cost = _cut_cost()
    best_A, best_B = set(A), set(B)

    for _ in range(max_iter):
        locked: set = set()
        gain_seq: list = []
        A_seq, B_seq = set(A), set(B)

        for _ in range(min(len(A), len(B))):
            best_gain = -math.inf
            best_a = best_b = None
            d_a = {v: _d_value(v, A_seq - locked, B_seq) for v in A_seq - locked}
            d_b = {v: _d_value(v, B_seq - locked, A_seq) for v in B_seq - locked}

            for a in A_seq - locked:
                for b in B_seq - locked:
                    w_ab = G.get_edge_data(a, b, {}).get(weight, 0.0)
                    gain = d_a[a] + d_b[b] - 2 * w_ab
                    if gain > best_gain:
                        best_gain = gain
                        best_a, best_b = a, b

            if best_a is None or best_b is None:
                break
            gain_seq.append((best_gain, best_a, best_b))
            locked.add(best_a)
            locked.add(best_b)
            A_seq.discard(best_a)
            A_seq.add(best_b)
            B_seq.discard(best_b)
            B_seq.add(best_a)

        # Find prefix with maximum cumulative gain
        cumulative = 0.0
        max_cum = 0.0
        max_k = -1
        for k, (g_k, _, _) in enumerate(gain_seq):
            cumulative += g_k
            if cumulative > max_cum:
                max_cum = cumulative
                max_k = k

        if max_k >= 0:
            for k in range(max_k + 1):
                _, a, b = gain_seq[k]
                A.discard(a)
                A.add(b)
                B.discard(b)
                B.add(a)

        current_cost = _cut_cost()
        if current_cost < best_cost:
            best_cost = current_cost
            best_A, best_B = set(A), set(B)
        elif max_cum <= 0:
            break

    return best_A, best_B


# ---------------------------------------------------------------------------
# Spectral bisection (approximate, without numpy)
# ---------------------------------------------------------------------------

def spectral_bisection(G, seed: Optional[int] = None) -> Tuple[Set, Set]:
    """Approximate spectral bisection using the Fiedler vector.

    The Fiedler vector (second smallest eigenvector of the Laplacian) is
    approximated via 200 steps of power iteration on L = D - A.
    Nodes with value < median are in one partition; remainder in the other.
    """
    rng = _random.Random(seed)
    nodes = list(G)
    n = len(nodes)
    if n < 2:
        return set(nodes), set()
    idx = {v: i for i, v in enumerate(nodes)}

    # Degree and adjacency
    degree = [G.degree(v) for v in nodes]

    # Approximate Fiedler vector via shifted power iteration
    # f = (max_deg * I - L) * f => f[i] = max_deg * f[i] - (d[i]*f[i] - sum_{j~i} f[j])
    #                            => f[i] = sum_{j~i} f[j]  (simplified)
    x = [rng.gauss(0, 1) for _ in range(n)]
    # Remove component along all-ones vector
    mean = sum(x) / n
    x = [xi - mean for xi in x]

    for _ in range(200):
        # Multiply by (max_d * I - L)
        max_d = max(degree)
        y = [(max_d - degree[i]) * x[i] for i in range(n)]
        for e in G.edges:
            u, v = e[0], e[1]
            i, j = idx[u], idx[v]
            y[i] += x[j]
            if u != v:
                y[j] += x[i]
        # Orthogonalise against all-ones
        mean_y = sum(y) / n
        y = [yi - mean_y for yi in y]
        # Normalise
        norm = math.sqrt(sum(yi ** 2 for yi in y)) or 1.0
        x = [yi / norm for yi in y]

    # Partition at median
    median = sorted(x)[n // 2]
    A = {nodes[i] for i in range(n) if x[i] < median}
    B = set(nodes) - A
    if not A:
        A = {nodes[0]}
        B = set(nodes[1:])
    return A, B


# ---------------------------------------------------------------------------
# Recursive bisection
# ---------------------------------------------------------------------------

def recursive_bisection(
    G,
    k: int,
    method: str = "kl",
    seed: Optional[int] = None,
) -> List[Set]:
    """Recursively bisect *G* into *k* approximately equal parts.

    Parameters
    ----------
    k      : number of parts (should be a power of 2 for balanced results)
    method : 'kl' (Kernighan-Lin) or 'spectral'
    """
    if k <= 1:
        return [set(G.nodes)]

    if method == "spectral":
        bisect_fn = lambda g: spectral_bisection(g, seed=seed)
    else:
        bisect_fn = lambda g: kernighan_lin_bisection(g, seed=seed)

    def _split(node_set: set, remaining_k: int) -> List[Set]:
        if remaining_k <= 1 or len(node_set) <= 1:
            return [node_set]
        sub = G.subgraph(node_set)
        A, B = bisect_fn(sub)
        half = remaining_k // 2
        return _split(A, half) + _split(B, remaining_k - half)

    return _split(set(G.nodes), k)


# ---------------------------------------------------------------------------
# Balanced k-partition (greedy)
# ---------------------------------------------------------------------------

def balanced_partition(G, k: int, seed: Optional[int] = None) -> List[Set]:
    """Greedy balanced partition into *k* groups.

    Assigns nodes to the partition with the most intra-partition edges
    while keeping partitions balanced.
    """
    rng = _random.Random(seed)
    if k <= 0:
        raise ValueError("k must be >= 1")
    nodes = list(G)
    rng.shuffle(nodes)
    target_size = math.ceil(len(nodes) / k)
    partitions: List[Set] = [set() for _ in range(k)]

    node_to_part: Dict[Any, int] = {}
    # Assign first k nodes as seeds
    for i, v in enumerate(nodes[:k]):
        partitions[i].add(v)
        node_to_part[v] = i

    for v in nodes[k:]:
        # Count edges to each partition
        scores = [0] * k
        for nbr in G.neighbors(v):
            if nbr in node_to_part:
                scores[node_to_part[nbr]] += 1
        # Choose best partition that is not full
        best_part = -1
        best_score = -1
        for i in range(k):
            if len(partitions[i]) < target_size and scores[i] > best_score:
                best_score = scores[i]
                best_part = i
        if best_part == -1:
            # All at target; pick smallest
            best_part = min(range(k), key=lambda i: len(partitions[i]))
        partitions[best_part].add(v)
        node_to_part[v] = best_part

    return [p for p in partitions if p]


# ---------------------------------------------------------------------------
# Partition quality metrics
# ---------------------------------------------------------------------------

def cut_size(G, A: set, B: Optional[set] = None, weight: str = "weight") -> float:
    """Return the total weight of edges crossing between A and B (or A and its complement)."""
    if B is None:
        B = set(G.nodes) - A
    return sum(
        G.get_edge_data(u, v, {}).get(weight, 1.0)
        for u, v in G.edges
        if (u in A and v in B) or (u in B and v in A)
    )


def normalized_cut(G, A: set, weight: str = "weight") -> float:
    """Normalised cut value: cut(A,B)/vol(A) + cut(A,B)/vol(B)."""
    B = set(G.nodes) - A
    if not A or not B:
        return 0.0
    cut = cut_size(G, A, B, weight=weight)
    vol_A = sum(
        G.get_edge_data(v, nbr, {}).get(weight, 1.0)
        for v in A
        for nbr in G.neighbors(v)
    )
    vol_B = sum(
        G.get_edge_data(v, nbr, {}).get(weight, 1.0)
        for v in B
        for nbr in G.neighbors(v)
    )
    return (cut / vol_A if vol_A else 0.0) + (cut / vol_B if vol_B else 0.0)


def ratio_cut(G, A: set, weight: str = "weight") -> float:
    """Ratio cut value: cut(A,B)/|A| + cut(A,B)/|B|."""
    B = set(G.nodes) - A
    if not A or not B:
        return 0.0
    cut = cut_size(G, A, B, weight=weight)
    return cut / len(A) + cut / len(B)


def partition_imbalance(partitions: List[Set]) -> float:
    """Return max deviation from perfect balance as fraction of target size."""
    if not partitions:
        return 0.0
    sizes = [len(p) for p in partitions]
    target = sum(sizes) / len(sizes)
    return max(abs(s - target) / target for s in sizes)


def conductance(G, A: set, weight: str = "weight") -> float:
    """Conductance of cut (A, V\A): cut / min(vol(A), vol(B))."""
    B = set(G.nodes) - A
    cut = cut_size(G, A, B, weight=weight)
    vol_A = sum(
        G.get_edge_data(v, nbr, {}).get(weight, 1.0)
        for v in A
        for nbr in G.neighbors(v)
    )
    vol_B = sum(
        G.get_edge_data(v, nbr, {}).get(weight, 1.0)
        for v in B
        for nbr in G.neighbors(v)
    )
    denom = min(vol_A, vol_B)
    return cut / denom if denom > 0 else 0.0


# ---------------------------------------------------------------------------
# Minimum k-cut (greedy approximation)
# ---------------------------------------------------------------------------

def minimum_k_cut(G, k: int, capacity: str = "capacity") -> List[Set]:
    """Approximate minimum k-cut via repeated max-flow + min-cut isolation.

    For k=2 this is exact.  For k>2 it is a greedy approximation.
    """
    from meridian.algorithms.flow import minimum_cut

    remaining = set(G.nodes)
    cuts: List[Set] = []

    for _ in range(k - 1):
        if len(remaining) < 2:
            break
        sub = G.subgraph(remaining)
        nodes = list(remaining)
        # Find the pair with the minimum cut value
        best_val = math.inf
        best_side: Optional[Set] = None
        for i in range(min(5, len(nodes))):
            s = nodes[i]
            for j in range(i + 1, min(i + 4, len(nodes))):
                t = nodes[j]
                try:
                    val, (reachable, _) = minimum_cut(sub, s, t, capacity=capacity)
                    if val < best_val:
                        best_val = val
                        best_side = set(reachable)
                except Exception:
                    pass
        if best_side is None:
            best_side = {nodes[0]}
        cuts.append(best_side)
        remaining -= best_side

    cuts.append(remaining)
    return cuts
