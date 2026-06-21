"""Connected-components algorithms."""

from __future__ import annotations

from collections import deque
from typing import Any, Dict, Generator, Iterator, List, Optional, Set

from meridian.exceptions import GraphNotConnected, NodeNotFound


# ---------------------------------------------------------------------------
# Undirected components
# ---------------------------------------------------------------------------

def connected_components(G) -> List[Set]:
    """Return a list of sets, each containing one connected component."""
    if G.is_directed():
        return list(weakly_connected_components(G))
    visited: Set = set()
    components = []
    for start in G:
        if start not in visited:
            comp: Set = set()
            queue = deque([start])
            visited.add(start)
            while queue:
                node = queue.popleft()
                comp.add(node)
                for nbr in G.neighbors(node):
                    if nbr not in visited:
                        visited.add(nbr)
                        queue.append(nbr)
            components.append(comp)
    return components


def number_connected_components(G) -> int:
    return len(connected_components(G))


def is_connected(G) -> bool:
    if G.number_of_nodes() == 0:
        return True
    comps = connected_components(G)
    return len(comps) == 1


def node_connected_component(G, node: Any) -> Set:
    if node not in G:
        raise NodeNotFound(node)
    visited: Set = {node}
    queue = deque([node])
    while queue:
        u = queue.popleft()
        for nbr in G.neighbors(u):
            if nbr not in visited:
                visited.add(nbr)
                queue.append(nbr)
    return visited


# ---------------------------------------------------------------------------
# Directed: strongly connected (Tarjan's algorithm)
# ---------------------------------------------------------------------------

def strongly_connected_components(G) -> List[Set]:
    """Return list of sets of strongly connected components (Tarjan's)."""
    if not G.is_directed():
        return connected_components(G)

    index_counter = [0]
    stack = []
    lowlinks: Dict[Any, int] = {}
    index: Dict[Any, int] = {}
    on_stack: Set = set()
    sccs: List[Set] = []

    def strongconnect(v):
        index[v] = lowlinks[v] = index_counter[0]
        index_counter[0] += 1
        stack.append(v)
        on_stack.add(v)

        for w in G.successors(v):
            if w not in index:
                strongconnect(w)
                lowlinks[v] = min(lowlinks[v], lowlinks[w])
            elif w in on_stack:
                lowlinks[v] = min(lowlinks[v], index[w])

        if lowlinks[v] == index[v]:
            scc: Set = set()
            while True:
                w = stack.pop()
                on_stack.discard(w)
                scc.add(w)
                if w == v:
                    break
            sccs.append(scc)

    import sys
    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(max(old_limit, G.number_of_nodes() + 1000))
    try:
        for v in G:
            if v not in index:
                strongconnect(v)
    finally:
        sys.setrecursionlimit(old_limit)
    return sccs


def number_strongly_connected_components(G) -> int:
    return len(strongly_connected_components(G))


def is_strongly_connected(G) -> bool:
    if not G.is_directed():
        return is_connected(G)
    if G.number_of_nodes() == 0:
        return True
    sccs = strongly_connected_components(G)
    return len(sccs) == 1


def condensation(G):
    """Return the condensation DAG of directed graph *G*."""
    from meridian.digraph import DiGraph
    sccs = strongly_connected_components(G)
    node_to_scc: Dict[Any, int] = {}
    for i, scc in enumerate(sccs):
        for n in scc:
            node_to_scc[n] = i
    dag = DiGraph()
    for i, scc in enumerate(sccs):
        dag.add_node(i, members=frozenset(scc))
    for u, v in G.edges:
        su = node_to_scc[u]
        sv = node_to_scc[v]
        if su != sv and not dag.has_edge(su, sv):
            dag.add_edge(su, sv)
    return dag


# ---------------------------------------------------------------------------
# Directed: weakly connected
# ---------------------------------------------------------------------------

def weakly_connected_components(G) -> List[Set]:
    """Components ignoring edge direction."""
    visited: Set = set()
    components = []
    for start in G:
        if start in visited:
            continue
        comp: Set = set()
        queue = deque([start])
        visited.add(start)
        while queue:
            node = queue.popleft()
            comp.add(node)
            neighbors = set(G.successors(node))
            if hasattr(G, "predecessors"):
                neighbors |= set(G.predecessors(node))
            for nbr in neighbors:
                if nbr not in visited:
                    visited.add(nbr)
                    queue.append(nbr)
        components.append(comp)
    return components


def is_weakly_connected(G) -> bool:
    return len(weakly_connected_components(G)) <= 1


# ---------------------------------------------------------------------------
# Biconnected components (undirected)
# ---------------------------------------------------------------------------

def biconnected_components(G) -> List[Set]:
    """Return list of edge sets for each biconnected component."""
    if G.is_directed():
        raise TypeError("biconnected_components requires an undirected graph")
    return [set(edges) for edges, _ in _biconnected_components_and_APs(G)]


def articulation_points(G) -> List:
    """Return list of articulation points (cut vertices)."""
    if G.is_directed():
        raise TypeError("articulation_points requires an undirected graph")
    _, aps = _biconnected_components_and_APs(G)
    return list(aps)


def bridges(G) -> List:
    """Return list of bridge edges (removing them disconnects the graph)."""
    if G.is_directed():
        raise TypeError("bridges requires an undirected graph")
    bridge_list = []
    visited: Set = set()
    disc: Dict[Any, int] = {}
    low: Dict[Any, int] = {}
    timer = [0]

    def dfs(u, parent):
        visited.add(u)
        disc[u] = low[u] = timer[0]
        timer[0] += 1
        for v in G.neighbors(u):
            if v == parent:
                continue
            if v not in visited:
                dfs(v, u)
                low[u] = min(low[u], low[v])
                if low[v] > disc[u]:
                    bridge_list.append((u, v))
            else:
                low[u] = min(low[u], disc[v])

    import sys
    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(max(old_limit, G.number_of_nodes() + 1000))
    try:
        for start in G:
            if start not in visited:
                dfs(start, None)
    finally:
        sys.setrecursionlimit(old_limit)
    return bridge_list


def _biconnected_components_and_APs(G):
    """Internal DFS-based biconnected components and articulation points."""
    visited: Set = set()
    disc: Dict[Any, int] = {}
    low: Dict[Any, int] = {}
    parent: Dict[Any, Optional[Any]] = {}
    ap_set: Set = set()
    timer = [0]
    components = []
    edge_stack: List = []

    def dfs(u):
        children = 0
        visited.add(u)
        disc[u] = low[u] = timer[0]
        timer[0] += 1
        for v in G.neighbors(u):
            if v not in visited:
                children += 1
                parent[v] = u
                edge_stack.append((u, v))
                dfs(v)
                low[u] = min(low[u], low[v])
                if (parent.get(u) is None and children > 1) or (
                    parent.get(u) is not None and low[v] >= disc[u]
                ):
                    ap_set.add(u)
                    comp_edges = set()
                    while edge_stack and edge_stack[-1] != (u, v):
                        comp_edges.add(edge_stack.pop())
                    comp_edges.add(edge_stack.pop())
                    components.append((comp_edges, set()))
            elif v != parent.get(u) and disc[v] < disc[u]:
                edge_stack.append((u, v))
                low[u] = min(low[u], disc[v])

    import sys
    old_limit = sys.getrecursionlimit()
    sys.setrecursionlimit(max(old_limit, G.number_of_nodes() + 1000))
    try:
        for start in G:
            if start not in visited:
                parent[start] = None
                dfs(start)
                if edge_stack:
                    components.append((set(edge_stack[:]), set()))
                    edge_stack.clear()
    finally:
        sys.setrecursionlimit(old_limit)
    return components, ap_set


# ---------------------------------------------------------------------------
# Condensation helpers
# ---------------------------------------------------------------------------

def kosaraju_strongly_connected_components(G) -> List[Set]:
    """Kosaraju's two-pass SCC algorithm."""
    if not G.is_directed():
        return connected_components(G)
    # Pass 1: DFS on original graph, record finish order
    visited: Set = set()
    finish_order: List = []

    def dfs1(v):
        stack = [(v, iter(G.successors(v)))]
        visited.add(v)
        while stack:
            node, children = stack[-1]
            try:
                child = next(children)
                if child not in visited:
                    visited.add(child)
                    stack.append((child, iter(G.successors(child))))
            except StopIteration:
                finish_order.append(node)
                stack.pop()

    for node in G:
        if node not in visited:
            dfs1(node)

    # Pass 2: DFS on transposed graph in reverse finish order
    rev = G.reverse()
    visited2: Set = set()
    sccs: List[Set] = []

    def dfs2(v):
        stack = [(v, iter(rev.successors(v)))]
        visited2.add(v)
        scc: Set = set()
        while stack:
            node, children = stack[-1]
            scc.add(node)
            try:
                child = next(children)
                if child not in visited2:
                    visited2.add(child)
                    stack.append((child, iter(rev.successors(child))))
            except StopIteration:
                stack.pop()
        return scc

    for node in reversed(finish_order):
        if node not in visited2:
            sccs.append(dfs2(node))
    return sccs
