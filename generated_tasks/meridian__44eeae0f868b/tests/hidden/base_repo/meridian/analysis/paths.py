"""Path enumeration, Eulerian paths, and related utilities."""

from __future__ import annotations

from collections import deque
from typing import Any, Iterator, List, Optional, Set


def all_simple_paths(G, source: Any, target: Any, cutoff: Optional[int] = None) -> Iterator[List]:
    """Yield all simple paths from *source* to *target*.

    Parameters
    ----------
    cutoff : maximum path length (number of edges).  None = unlimited.
    """
    if source not in G:
        from meridian.exceptions import NodeNotFound
        raise NodeNotFound(source)
    if target not in G:
        from meridian.exceptions import NodeNotFound
        raise NodeNotFound(target)
    if source == target:
        yield [source]
        return
    if cutoff is None:
        cutoff = G.number_of_nodes() - 1

    visited: dict = {source: True}
    stack: List = [(source, iter(G.neighbors(source)))]
    path: List = [source]

    while stack:
        _, children = stack[-1]
        try:
            child = next(children)
            if child == target:
                yield path + [child]
            elif child not in visited and len(path) < cutoff:
                visited[child] = True
                stack.append((child, iter(G.neighbors(child))))
                path.append(child)
        except StopIteration:
            stack.pop()
            if path:
                visited.pop(path.pop(), None)


def all_shortest_paths(G, source: Any, target: Any, weight: Optional[str] = None) -> Iterator[List]:
    """Yield all shortest paths from *source* to *target*."""
    from meridian.algorithms.shortest_path import dijkstra_path_length
    from meridian.algorithms.traverse import bfs_nodes

    if weight is None:
        # Unweighted: BFS to find distance, then DFS to enumerate
        dist = _bfs_distance_dict(G, source)
        if target not in dist:
            return

        def _paths(cur, remaining):
            if cur == target:
                yield [cur]
                return
            for nbr in G.neighbors(cur):
                if dist.get(nbr, -1) == dist[cur] + 1 and nbr not in visited:
                    visited.add(nbr)
                    for rest in _paths(nbr, remaining - 1):
                        yield [cur] + rest
                    visited.discard(nbr)

        visited: Set = {source}
        yield from _paths(source, dist[target])
    else:
        target_len = dijkstra_path_length(G, source, target, weight=weight)
        for path in all_simple_paths(G, source, target):
            length = sum(
                G.get_edge_data(path[i], path[i + 1], {}).get(weight, 1.0)
                for i in range(len(path) - 1)
            )
            if abs(length - target_len) < 1e-10:
                yield path


def _bfs_distance_dict(G, source) -> dict:
    dist = {source: 0}
    queue: deque = deque([source])
    while queue:
        u = queue.popleft()
        for v in G.neighbors(u):
            if v not in dist:
                dist[v] = dist[u] + 1
                queue.append(v)
    return dist


def cycle_basis(G, root=None) -> List[List]:
    """Return a minimal cycle basis for an undirected graph.

    Uses a BFS spanning tree; each non-tree edge creates one fundamental cycle.
    """
    if G.is_directed():
        raise TypeError("cycle_basis requires an undirected graph")
    gnodes = set(G.nodes)
    cycles: List[List] = []
    root_nodes = [root] if root is not None else list(gnodes)

    while gnodes:
        start = root_nodes.pop(0) if root_nodes and root_nodes[0] in gnodes else next(iter(gnodes))
        # BFS spanning tree
        tree_parent: dict = {start: None}
        tree_depth: dict = {start: 0}
        queue: deque = deque([start])
        gnodes.discard(start)
        visited = {start}
        while queue:
            v = queue.popleft()
            for nbr in G.neighbors(v):
                if nbr not in visited:
                    visited.add(nbr)
                    gnodes.discard(nbr)
                    tree_parent[nbr] = v
                    tree_depth[nbr] = tree_depth[v] + 1
                    queue.append(nbr)
                elif tree_parent.get(v) != nbr:
                    # Non-tree edge → fundamental cycle
                    cycle = _fundamental_cycle(tree_parent, tree_depth, v, nbr)
                    if cycle:
                        cycles.append(cycle)
    return cycles


def _fundamental_cycle(parent: dict, depth: dict, u: Any, v: Any) -> List:
    """Reconstruct the cycle formed by non-tree edge (u, v)."""
    path_u: List = [u]
    path_v: List = [v]
    pu, pv = u, v
    while pu != pv:
        if depth.get(pu, 0) > depth.get(pv, 0):
            pu = parent.get(pu)
            if pu is None:
                return []
            path_u.append(pu)
        else:
            pv = parent.get(pv)
            if pv is None:
                return []
            path_v.append(pv)
    return path_u + list(reversed(path_v[:-1]))


def simple_cycles(G) -> Iterator[List]:
    """Yield all simple directed cycles in a directed graph (Johnson's algorithm)."""
    if not G.is_directed():
        raise TypeError("simple_cycles requires a directed graph")

    def _unblock(node, blocked_set, blocked_map):
        stack = [node]
        while stack:
            v = stack.pop()
            if v in blocked_set:
                blocked_set.discard(v)
                for w in list(blocked_map.get(v, set())):
                    stack.append(w)
                blocked_map.pop(v, None)

    nodes = list(G)
    for i, start in enumerate(nodes):
        subgraph_nodes = nodes[i:]
        stack = [start]
        blocked: Set = {start}
        blocked_map: dict = {}
        path: List = [start]

        while stack:
            v = stack[-1]
            extended = False
            for w in G.successors(v):
                if w not in subgraph_nodes:
                    continue
                if w == start:
                    yield list(path)
                    extended = True
                elif w not in blocked:
                    blocked.add(w)
                    stack.append(w)
                    path.append(w)
                    extended = True
                    break
                else:
                    blocked_map.setdefault(w, set()).add(v)
            if not extended:
                _unblock(v, blocked, blocked_map)
                stack.pop()
                path.pop()


# ---------------------------------------------------------------------------
# Eulerian path
# ---------------------------------------------------------------------------

def has_eulerian_circuit(G) -> bool:
    """Return True if G has an Eulerian circuit."""
    from meridian.algorithms.components import is_connected
    if G.is_directed():
        return (is_connected(G.to_undirected()) and
                all(G.in_degree(v) == G.out_degree(v) for v in G))
    return (is_connected(G) and
            all(G.degree(v) % 2 == 0 for v in G))


def has_eulerian_path(G) -> bool:
    """Return True if G has an Eulerian path (not necessarily a circuit)."""
    from meridian.algorithms.components import is_connected
    if G.is_directed():
        odd_in = sum(1 for v in G if G.in_degree(v) != G.out_degree(v))
        return is_connected(G.to_undirected()) and odd_in <= 2
    odd_degree = sum(1 for v in G if G.degree(v) % 2 != 0)
    return odd_degree in (0, 2) and is_connected(G)


def eulerian_circuit(G) -> List:
    """Find an Eulerian circuit using Hierholzer's algorithm."""
    if not has_eulerian_circuit(G):
        raise ValueError("Graph does not have an Eulerian circuit")

    # Work on a copy of adjacency
    adj_copy = {v: list(G.neighbors(v)) for v in G}
    start = next(iter(G))
    path: List = []
    stack = [start]

    while stack:
        v = stack[-1]
        if adj_copy[v]:
            u = adj_copy[v].pop()
            # Remove reverse for undirected
            if not G.is_directed() and v in adj_copy[u]:
                adj_copy[u].remove(v)
            stack.append(u)
        else:
            path.append(stack.pop())

    return list(reversed(path))
