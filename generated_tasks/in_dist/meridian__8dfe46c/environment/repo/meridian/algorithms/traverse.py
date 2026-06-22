"""Traversal algorithms: BFS, DFS, topological sort."""

from __future__ import annotations

from collections import deque
from typing import Any, Dict, Generator, Hashable, Iterable, Iterator, List, Optional, Set

from meridian.exceptions import HasACycle, NodeNotFound


# ---------------------------------------------------------------------------
# BFS
# ---------------------------------------------------------------------------

def bfs(G, source, depth_limit: Optional[int] = None) -> List:
    """Return all nodes reachable from *source* in BFS order."""
    return list(bfs_nodes(G, source, depth_limit=depth_limit))


def bfs_nodes(G, source, depth_limit: Optional[int] = None) -> Iterator:
    """Yield nodes in BFS order starting from *source*."""
    if source not in G:
        raise NodeNotFound(source)
    visited: Set = {source}
    queue: deque = deque([(source, 0)])
    while queue:
        node, depth = queue.popleft()
        yield node
        if depth_limit is not None and depth >= depth_limit:
            continue
        for nbr in G.neighbors(node):
            if nbr not in visited:
                visited.add(nbr)
                queue.append((nbr, depth + 1))


def bfs_edges(G, source, depth_limit: Optional[int] = None, reverse: bool = False) -> Iterator:
    """Yield (u, v) tree edges in BFS order."""
    if source not in G:
        raise NodeNotFound(source)
    visited: Set = {source}
    adj = G._pred if (reverse and G.is_directed()) else G._adj
    if G.is_multigraph():
        def _neighbors(n):
            return adj.get(n, {}).keys()
    else:
        def _neighbors(n):
            return adj.get(n, {}).keys()

    queue: deque = deque([(source, 0, iter(_neighbors(source)))])
    while queue:
        parent, depth, children = queue[0]
        try:
            child = next(children)
            if child not in visited:
                visited.add(child)
                yield parent, child
                if depth_limit is None or depth + 1 < depth_limit:
                    queue.append((child, depth + 1, iter(_neighbors(child))))
        except StopIteration:
            queue.popleft()


def bfs_tree(G, source, depth_limit: Optional[int] = None):
    """Return a DiGraph that is the BFS tree rooted at *source*."""
    from meridian.digraph import DiGraph
    T = DiGraph()
    T.add_node(source, **G.nodes[source])
    for u, v in bfs_edges(G, source, depth_limit=depth_limit):
        T.add_node(v, **G.nodes[v])
        T.add_edge(u, v, **G.get_edge_data(u, v, {}))
    return T


def bfs_predecessors(G, source, depth_limit: Optional[int] = None) -> Dict:
    """Return dict mapping node to its BFS predecessor."""
    pred = {}
    for u, v in bfs_edges(G, source, depth_limit=depth_limit):
        pred[v] = u
    return pred


def bfs_successors(G, source, depth_limit: Optional[int] = None) -> Dict:
    """Return dict mapping node to list of its BFS successors."""
    succ: Dict[Any, List] = {}
    for u, v in bfs_edges(G, source, depth_limit=depth_limit):
        succ.setdefault(u, []).append(v)
    return succ


def descendants_at_distance(G, source: Any, distance: int) -> Set:
    """Return the set of nodes exactly *distance* hops from *source*."""
    if source not in G:
        raise NodeNotFound(source)
    visited: Set = {source}
    current_layer = {source}
    for _ in range(distance):
        next_layer: Set = set()
        for n in current_layer:
            for nbr in G.neighbors(n):
                if nbr not in visited:
                    visited.add(nbr)
                    next_layer.add(nbr)
        current_layer = next_layer
    return current_layer


# ---------------------------------------------------------------------------
# DFS
# ---------------------------------------------------------------------------

def dfs(G, source, depth_limit: Optional[int] = None) -> List:
    """Return all nodes reachable from *source* in DFS order (iterative)."""
    return list(dfs_nodes(G, source, depth_limit=depth_limit))


def dfs_nodes(G, source, depth_limit: Optional[int] = None) -> Iterator:
    """Yield nodes in DFS order starting from *source* (iterative)."""
    if source not in G:
        raise NodeNotFound(source)
    visited: Set = set()
    stack = [(source, 0)]
    while stack:
        node, depth = stack.pop()
        if node in visited:
            continue
        visited.add(node)
        yield node
        if depth_limit is None or depth < depth_limit:
            for nbr in reversed(list(G.neighbors(node))):
                if nbr not in visited:
                    stack.append((nbr, depth + 1))


def dfs_edges(G, source, depth_limit: Optional[int] = None) -> Iterator:
    """Yield (u, v) tree edges in DFS order (iterative)."""
    if source not in G:
        raise NodeNotFound(source)
    visited: Set = {source}
    stack = [(source, 0, iter(G.neighbors(source)))]
    while stack:
        parent, depth, children = stack[-1]
        try:
            child = next(children)
            if child not in visited:
                visited.add(child)
                yield parent, child
                if depth_limit is None or depth + 1 < depth_limit:
                    stack.append((child, depth + 1, iter(G.neighbors(child))))
        except StopIteration:
            stack.pop()


def dfs_tree(G, source, depth_limit: Optional[int] = None):
    """Return a DiGraph that is the DFS tree rooted at *source*."""
    from meridian.digraph import DiGraph
    T = DiGraph()
    T.add_node(source, **G.nodes[source])
    for u, v in dfs_edges(G, source, depth_limit=depth_limit):
        T.add_node(v, **G.nodes[v])
        T.add_edge(u, v, **G.get_edge_data(u, v, {}))
    return T


def dfs_predecessors(G, source) -> Dict:
    return {v: u for u, v in dfs_edges(G, source)}


def dfs_successors(G, source) -> Dict:
    succ: Dict = {}
    for u, v in dfs_edges(G, source):
        succ.setdefault(u, []).append(v)
    return succ


def dfs_labeled_edges(G, source, depth_limit: Optional[int] = None) -> Iterator:
    """Yield (u, v, label) where label is 'tree', 'forward', 'back', or 'cross'."""
    if source not in G:
        raise NodeNotFound(source)
    visited: Set = {source}
    stack = [(source, 0, iter(G.neighbors(source)))]
    yield source, source, "forward"
    while stack:
        parent, depth, children = stack[-1]
        try:
            child = next(children)
            if child not in visited:
                visited.add(child)
                yield parent, child, "tree"
                if depth_limit is None or depth + 1 < depth_limit:
                    stack.append((child, depth + 1, iter(G.neighbors(child))))
            else:
                yield parent, child, "back"
        except StopIteration:
            stack.pop()
            if stack:
                yield stack[-1][0], parent, "forward"


# ---------------------------------------------------------------------------
# Topological sort (Kahn's algorithm)
# ---------------------------------------------------------------------------

def topological_sort(G) -> Iterator:
    """Yield nodes in topological order.  Raises HasACycle if *G* contains a cycle."""
    if not G.is_directed():
        raise TypeError("topological_sort requires a directed graph")
    in_deg = {n: G.in_degree(n) for n in G}
    queue: deque = deque(n for n, d in in_deg.items() if d == 0)
    count = 0
    while queue:
        node = queue.popleft()
        yield node
        count += 1
        for succ in G.successors(node):
            in_deg[succ] -= 1
            if in_deg[succ] == 0:
                queue.append(succ)
    if count != G.number_of_nodes():
        raise HasACycle("Graph contains at least one cycle; topological sort is undefined")


def all_topological_sorts(G) -> Generator:
    """Generate all topological orderings of DAG *G*.

    Uses Kahn's algorithm with backtracking.  Warning: exponential in the
    worst case; only practical for small graphs.
    """
    if not G.is_directed():
        raise TypeError("all_topological_sorts requires a directed graph")

    in_deg = {n: G.in_degree(n) for n in G}
    zero_queue = sorted((n for n, d in in_deg.items() if d == 0), key=str)

    def _backtrack(path, in_d, available):
        if len(path) == G.number_of_nodes():
            yield list(path)
            return
        for node in list(available):
            new_available = list(available)
            new_available.remove(node)
            path.append(node)
            new_in_d = dict(in_d)
            added = []
            for succ in G.successors(node):
                new_in_d[succ] -= 1
                if new_in_d[succ] == 0:
                    new_available.append(succ)
                    added.append(succ)
            yield from _backtrack(path, new_in_d, new_available)
            path.pop()

    yield from _backtrack([], in_deg, zero_queue)


def is_dag(G) -> bool:
    """Return True iff directed graph *G* is a DAG."""
    if not G.is_directed():
        return False
    try:
        list(topological_sort(G))
        return True
    except HasACycle:
        return False


def topological_generations(G) -> Iterator:
    """Yield successive sets of nodes with no dependencies on each other."""
    if not G.is_directed():
        raise TypeError("topological_generations requires a directed graph")
    in_deg = {n: G.in_degree(n) for n in G}
    current_gen = {n for n, d in in_deg.items() if d == 0}
    while current_gen:
        yield set(current_gen)
        next_gen = set()
        for node in current_gen:
            for succ in G.successors(node):
                in_deg[succ] -= 1
                if in_deg[succ] == 0:
                    next_gen.add(succ)
        current_gen = next_gen
        if not current_gen and sum(in_deg.values()) > 0:
            raise HasACycle("Graph contains a cycle")


# ---------------------------------------------------------------------------
# Cycle detection
# ---------------------------------------------------------------------------

def has_cycle(G) -> bool:
    """Return True if *G* contains at least one cycle."""
    if G.is_directed():
        try:
            list(topological_sort(G))
            return False
        except HasACycle:
            return True
    else:
        visited: Set = set()
        for start in G:
            if start in visited:
                continue
            stack = [(start, None)]
            local_visited: Set = set()
            while stack:
                node, parent = stack.pop()
                if node in local_visited:
                    return True
                local_visited.add(node)
                visited.add(node)
                for nbr in G.neighbors(node):
                    if nbr != parent and nbr not in local_visited:
                        stack.append((nbr, node))
        return False


def find_cycle(G, source=None, orientation=None):
    """Return a list of edges forming a cycle, or raise an exception if none."""
    if G.is_directed():
        explored: Set = set()
        cycle = []
        start_nodes = [source] if source is not None else list(G)
        for start in start_nodes:
            if start in explored:
                continue
            path = [start]
            path_set = {start}
            stack = [iter(G.successors(start))]
            while stack:
                try:
                    child = next(stack[-1])
                    if child in path_set:
                        idx = path.index(child)
                        cycle = path[idx:] + [child]
                        return [(cycle[i], cycle[i + 1]) for i in range(len(cycle) - 1)]
                    if child not in explored:
                        path.append(child)
                        path_set.add(child)
                        stack.append(iter(G.successors(child)))
                except StopIteration:
                    explored.add(path[-1])
                    path_set.discard(path[-1])
                    path.pop()
                    stack.pop()
    else:
        visited: Set = set()
        for start in ([source] if source else G):
            if start in visited:
                continue
            parent_map = {start: None}
            stack = [start]
            while stack:
                node = stack.pop()
                if node in visited:
                    continue
                visited.add(node)
                for nbr in G.neighbors(node):
                    if nbr not in visited:
                        parent_map[nbr] = node
                        stack.append(nbr)
                    elif parent_map.get(node) != nbr:
                        # back edge found: reconstruct cycle
                        cycle_nodes = [nbr, node]
                        cur = node
                        while cur != nbr and cur is not None:
                            cur = parent_map.get(cur)
                            if cur is not None:
                                cycle_nodes.append(cur)
                        return [(cycle_nodes[i], cycle_nodes[i + 1])
                                for i in range(len(cycle_nodes) - 1)]
    raise Exception("No cycle found")
