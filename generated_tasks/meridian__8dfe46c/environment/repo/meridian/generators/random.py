"""Random graph generators."""

from __future__ import annotations

import random as _random
from typing import Optional

from meridian.graph import Graph
from meridian.digraph import DiGraph


def erdos_renyi_graph(
    n: int,
    p: float,
    seed: Optional[int] = None,
    directed: bool = False,
) -> Graph:
    """Erdős-Rényi random graph G(n, p).

    Each possible edge is included independently with probability *p*.
    """
    rng = _random.Random(seed)
    g = DiGraph() if directed else Graph()
    g.name = f"G({n},{p:.3f})"
    for i in range(n):
        g.add_node(i)
    for i in range(n):
        start = 0 if directed else i + 1
        for j in range(start, n):
            if i == j:
                continue
            if rng.random() < p:
                g.add_edge(i, j)
    return g


def gnm_random_graph(n: int, m: int, seed: Optional[int] = None) -> Graph:
    """Erdős-Rényi random graph G(n, m) with exactly m edges."""
    rng = _random.Random(seed)
    g = Graph(name=f"G({n},{m})")
    for i in range(n):
        g.add_node(i)
    edges: set = set()
    while len(edges) < m:
        u = rng.randint(0, n - 1)
        v = rng.randint(0, n - 1)
        if u != v and (u, v) not in edges and (v, u) not in edges:
            edges.add((u, v))
            g.add_edge(u, v)
    return g


def barabasi_albert_graph(n: int, m: int, seed: Optional[int] = None) -> Graph:
    """Barabási-Albert scale-free graph.

    Starts with a K_m core, then adds nodes one at a time with *m*
    edges each, attached preferentially to high-degree nodes.
    """
    if m < 1 or m >= n:
        raise ValueError("m must be in [1, n-1]")
    rng = _random.Random(seed)
    g = Graph(name=f"BA({n},{m})")
    for i in range(m):
        for j in range(i + 1, m):
            g.add_edge(i, j)

    # Repeated-endpoint list for preferential attachment
    repeated: list = []
    for u in range(m):
        for v in range(m):
            if u != v and g.has_edge(u, v):
                repeated.append(u)

    for new_node in range(m, n):
        g.add_node(new_node)
        targets: set = set()
        while len(targets) < m:
            if not repeated:
                t = rng.randint(0, new_node - 1)
            else:
                t = rng.choice(repeated)
            if t != new_node:
                targets.add(t)
        for t in targets:
            g.add_edge(new_node, t)
            repeated.extend([new_node, t])
    return g


def watts_strogatz_graph(n: int, k: int, p: float, seed: Optional[int] = None) -> Graph:
    """Watts-Strogatz small-world graph.

    Start with a k-regular ring lattice, then rewire each edge with
    probability *p*.
    """
    if k >= n:
        raise ValueError("k must be < n")
    rng = _random.Random(seed)
    g = Graph(name=f"WS({n},{k},{p:.2f})")
    for i in range(n):
        g.add_node(i)
    # Ring lattice
    half_k = k // 2
    for i in range(n):
        for j in range(1, half_k + 1):
            g.add_edge(i, (i + j) % n)

    # Rewiring
    for u in range(n):
        for j in range(1, half_k + 1):
            v = (u + j) % n
            if rng.random() < p:
                # Rewire to a random node
                w = rng.randint(0, n - 1)
                attempts = 0
                while (w == u or g.has_edge(u, w)) and attempts < n:
                    w = rng.randint(0, n - 1)
                    attempts += 1
                if not g.has_edge(u, w) and w != u:
                    g.remove_edge(u, v)
                    g.add_edge(u, w)
    return g


def newman_watts_strogatz_graph(n: int, k: int, p: float, seed: Optional[int] = None) -> Graph:
    """Newman-Watts-Strogatz: add random shortcuts without removing ring edges."""
    rng = _random.Random(seed)
    g = Graph(name=f"NWS({n},{k},{p:.2f})")
    for i in range(n):
        g.add_node(i)
    half_k = k // 2
    for i in range(n):
        for j in range(1, half_k + 1):
            g.add_edge(i, (i + j) % n)
    # Add shortcuts
    for u in range(n):
        if rng.random() < p:
            v = rng.randint(0, n - 1)
            if v != u and not g.has_edge(u, v):
                g.add_edge(u, v)
    return g


def random_tree(n: int, seed: Optional[int] = None) -> Graph:
    """Uniformly random labelled tree on n nodes (Prüfer sequence)."""
    if n < 2:
        g = Graph(name="tree_1")
        g.add_node(0)
        return g
    rng = _random.Random(seed)
    # Generate Prüfer sequence
    prufer = [rng.randint(0, n - 1) for _ in range(n - 2)]
    degree = [1] * n
    for v in prufer:
        degree[v] += 1
    g = Graph(name=f"random_tree_{n}")
    for i in range(n):
        g.add_node(i)
    for v in prufer:
        # Find smallest leaf
        leaf = next(i for i in range(n) if degree[i] == 1)
        g.add_edge(leaf, v)
        degree[leaf] -= 1
        degree[v] -= 1
    # Connect the last two nodes
    last = [i for i in range(n) if degree[i] == 1]
    g.add_edge(last[0], last[1])
    return g


def random_regular_graph(d: int, n: int, seed: Optional[int] = None) -> Graph:
    """Random d-regular graph on n nodes.

    Requires d * n to be even.  Uses the configuration model.
    """
    if (d * n) % 2 != 0:
        raise ValueError("d * n must be even for a d-regular graph")
    if d >= n:
        raise ValueError("d must be < n")
    rng = _random.Random(seed)
    g = Graph(name=f"regular_{d}_{n}")
    for i in range(n):
        g.add_node(i)

    # Configuration model
    for _attempt in range(100):
        stubs = []
        for v in range(n):
            stubs.extend([v] * d)
        rng.shuffle(stubs)
        edges: set = set()
        ok = True
        for i in range(0, len(stubs), 2):
            u, v = stubs[i], stubs[i + 1]
            if u == v or (min(u, v), max(u, v)) in edges:
                ok = False
                break
            edges.add((min(u, v), max(u, v)))
        if ok:
            for u, v in edges:
                g.add_edge(u, v)
            return g

    # Fallback: greedy
    g.clear_edges()
    degrees = [0] * n
    nodes = list(range(n))
    for i in range(n):
        for j in range(i + 1, n):
            if degrees[i] < d and degrees[j] < d and not g.has_edge(i, j):
                g.add_edge(i, j)
                degrees[i] += 1
                degrees[j] += 1
    return g


def random_lobster(
    n: int,
    p1: float,
    p2: float,
    seed: Optional[int] = None,
) -> Graph:
    """Random lobster graph.

    Spine is a path, caterpillar edges added with probability p1,
    lobster edges from those with probability p2.
    """
    rng = _random.Random(seed)
    g = Graph(name=f"lobster_{n}")
    # Spine
    for i in range(n):
        g.add_node(i)
    for i in range(n - 1):
        g.add_edge(i, i + 1)
    next_id = n
    # Caterpillar hairs
    for spine_node in range(n):
        if rng.random() < p1:
            g.add_node(next_id)
            g.add_edge(spine_node, next_id)
            caterpillar_node = next_id
            next_id += 1
            # Lobster hairs
            if rng.random() < p2:
                g.add_node(next_id)
                g.add_edge(caterpillar_node, next_id)
                next_id += 1
    return g


def stochastic_block_model(
    sizes: list,
    p: list,
    seed: Optional[int] = None,
) -> Graph:
    """Stochastic block model.

    Parameters
    ----------
    sizes : list of community sizes
    p     : matrix of edge probabilities, p[i][j] is probability between blocks i and j
    """
    rng = _random.Random(seed)
    g = Graph(name="sbm")
    # Assign nodes to communities
    community_of = []
    node = 0
    for ci, size in enumerate(sizes):
        for _ in range(size):
            g.add_node(node, community=ci)
            community_of.append(ci)
            node += 1
    n = node
    for i in range(n):
        for j in range(i + 1, n):
            ci = community_of[i]
            cj = community_of[j]
            prob = p[ci][cj] if ci < len(p) and cj < len(p[ci]) else 0.0
            if rng.random() < prob:
                g.add_edge(i, j)
    return g
