"""Classic deterministic graph generators."""

from __future__ import annotations

from meridian.graph import Graph
from meridian.digraph import DiGraph


def empty_graph(n: int = 0, name: str = "") -> Graph:
    """Graph with *n* nodes and no edges."""
    g = Graph(name=name or f"empty_{n}")
    for i in range(n):
        g.add_node(i)
    return g


def null_graph() -> Graph:
    """Graph with no nodes."""
    return Graph(name="null")


def trivial_graph() -> Graph:
    """Graph with a single node."""
    g = Graph(name="trivial")
    g.add_node(0)
    return g


def complete_graph(n: int, create_using=None) -> Graph:
    """Complete graph K_n."""
    g = (create_using or Graph)(name=f"K_{n}")
    for i in range(n):
        g.add_node(i)
    for i in range(n):
        for j in range(i + 1, n):
            g.add_edge(i, j)
    return g


def complete_bipartite_graph(m: int, n: int) -> Graph:
    """Complete bipartite graph K_{m,n}."""
    g = Graph(name=f"K_{m},{n}")
    top = list(range(m))
    bottom = list(range(m, m + n))
    for u in top:
        g.add_node(u, bipartite=0)
    for v in bottom:
        g.add_node(v, bipartite=1)
    for u in top:
        for v in bottom:
            g.add_edge(u, v)
    return g


def cycle_graph(n: int, create_using=None) -> Graph:
    """Cycle graph C_n."""
    if n < 1:
        raise ValueError("n must be >= 1")
    g = (create_using or Graph)(name=f"C_{n}")
    for i in range(n):
        g.add_node(i)
    for i in range(n):
        g.add_edge(i, (i + 1) % n)
    return g


def path_graph(n: int, create_using=None) -> Graph:
    """Path graph P_n."""
    if n < 1:
        raise ValueError("n must be >= 1")
    g = (create_using or Graph)(name=f"P_{n}")
    for i in range(n):
        g.add_node(i)
    for i in range(n - 1):
        g.add_edge(i, i + 1)
    return g


def star_graph(n: int) -> Graph:
    """Star graph S_n with n leaves."""
    g = Graph(name=f"S_{n}")
    g.add_node(0)  # centre
    for i in range(1, n + 1):
        g.add_edge(0, i)
    return g


def wheel_graph(n: int) -> Graph:
    """Wheel graph W_n: hub + C_{n-1}."""
    if n < 2:
        raise ValueError("n must be >= 2")
    g = Graph(name=f"W_{n}")
    g.add_node(0)  # hub
    for i in range(1, n):
        g.add_node(i)
        g.add_edge(0, i)
    for i in range(1, n):
        g.add_edge(i, (i % (n - 1)) + 1)
    return g


def grid_2d_graph(m: int, n: int, periodic: bool = False) -> Graph:
    """m × n 2-D grid graph."""
    g = Graph(name=f"grid_{m}x{n}")
    for r in range(m):
        for c in range(n):
            g.add_node((r, c), row=r, col=c)
    for r in range(m):
        for c in range(n):
            if r + 1 < m:
                g.add_edge((r, c), (r + 1, c))
            if c + 1 < n:
                g.add_edge((r, c), (r, c + 1))
    if periodic:
        for c in range(n):
            g.add_edge((0, c), (m - 1, c))
        for r in range(m):
            g.add_edge((r, 0), (r, n - 1))
    return g


def petersen_graph() -> Graph:
    """The Petersen graph."""
    g = Graph(name="petersen")
    # Outer cycle 0-4
    for i in range(5):
        g.add_edge(i, (i + 1) % 5)
    # Inner pentagram 5-9 with spokes
    for i in range(5):
        g.add_edge(i, i + 5)
    for i in range(5):
        g.add_edge(5 + i, 5 + (i + 2) % 5)
    return g


def ladder_graph(n: int) -> Graph:
    """Ladder graph L_n: two parallel P_n paths joined rung-by-rung."""
    if n < 1:
        raise ValueError("n must be >= 1")
    g = Graph(name=f"ladder_{n}")
    for i in range(n):
        g.add_node(i)
        g.add_node(i + n)
        g.add_edge(i, i + n)
    for i in range(n - 1):
        g.add_edge(i, i + 1)
        g.add_edge(i + n, i + n + 1)
    return g


def circular_ladder_graph(n: int) -> Graph:
    """Circular ladder (prism) graph."""
    if n < 3:
        raise ValueError("n must be >= 3")
    g = ladder_graph(n)
    g.add_edge(0, n - 1)
    g.add_edge(n, 2 * n - 1)
    return g


def hypercube_graph(n: int) -> Graph:
    """n-dimensional hypercube graph Q_n."""
    g = Graph(name=f"Q_{n}")
    for i in range(2 ** n):
        g.add_node(i)
    for i in range(2 ** n):
        for bit in range(n):
            j = i ^ (1 << bit)
            if j > i:
                g.add_edge(i, j)
    return g


def barbell_graph(m1: int, m2: int) -> Graph:
    """Barbell graph: two K_m1 cliques joined by a P_{m2} path."""
    if m1 < 2:
        raise ValueError("m1 must be >= 2")
    g = Graph(name=f"barbell_{m1}_{m2}")
    # Left clique: nodes 0 .. m1-1
    for i in range(m1):
        for j in range(i + 1, m1):
            g.add_edge(i, j)
    # Bridge path: m1 .. m1+m2-1
    prev = m1 - 1
    for k in range(m2):
        nid = m1 + k
        g.add_node(nid)
        g.add_edge(prev, nid)
        prev = nid
    # Right clique: m1+m2 .. m1+m2+m1-1
    offset = m1 + m2
    g.add_edge(prev, offset)
    for i in range(m1):
        for j in range(i + 1, m1):
            g.add_edge(offset + i, offset + j)
    return g


def lollipop_graph(m: int, n: int) -> Graph:
    """Lollipop graph: K_m joined to P_n."""
    if m < 2:
        raise ValueError("m must be >= 2")
    g = Graph(name=f"lollipop_{m}_{n}")
    for i in range(m):
        for j in range(i + 1, m):
            g.add_edge(i, j)
    prev = m - 1
    for k in range(n):
        nid = m + k
        g.add_node(nid)
        g.add_edge(prev, nid)
        prev = nid
    return g


def turan_graph(n: int, r: int) -> Graph:
    """Turán graph T(n, r): complete r-partite graph with part sizes as equal as possible."""
    if r < 1 or r > n:
        raise ValueError("r must be in [1, n]")
    g = Graph(name=f"turan_{n}_{r}")
    # Assign nodes to parts
    part = [i % r for i in range(n)]
    for i in range(n):
        g.add_node(i, part=part[i])
    for i in range(n):
        for j in range(i + 1, n):
            if part[i] != part[j]:
                g.add_edge(i, j)
    return g


def directed_cycle(n: int) -> DiGraph:
    """Directed cycle of length n."""
    g = DiGraph(name=f"directed_cycle_{n}")
    for i in range(n):
        g.add_edge(i, (i + 1) % n)
    return g


def directed_path(n: int) -> DiGraph:
    """Directed path of length n."""
    g = DiGraph(name=f"directed_path_{n}")
    for i in range(n - 1):
        g.add_edge(i, i + 1)
    return g


def tournament_graph(n: int, seed: int = 0) -> DiGraph:
    """Random tournament on n nodes (every pair connected by exactly one directed edge)."""
    import random
    random.seed(seed)
    g = DiGraph(name=f"tournament_{n}")
    for i in range(n):
        g.add_node(i)
    for i in range(n):
        for j in range(i + 1, n):
            if random.random() < 0.5:
                g.add_edge(i, j)
            else:
                g.add_edge(j, i)
    return g


def dag_graph(n: int, edge_prob: float = 0.5, seed: int = 0) -> DiGraph:
    """Random DAG on n nodes (edges go from lower to higher index only)."""
    import random
    random.seed(seed)
    g = DiGraph(name=f"dag_{n}")
    for i in range(n):
        g.add_node(i)
    for i in range(n):
        for j in range(i + 1, n):
            if random.random() < edge_prob:
                g.add_edge(i, j)
    return g
