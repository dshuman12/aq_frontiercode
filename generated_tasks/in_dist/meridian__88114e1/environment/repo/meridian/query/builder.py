"""Fluent query builder for meridian graphs."""

from __future__ import annotations

from typing import Any, Callable, Dict, Iterable, Iterator, List, Optional, Tuple


class NodeQuery:
    """Fluent builder for node queries."""

    def __init__(self, nodes_iter, graph) -> None:
        self._iter = nodes_iter
        self._G = graph
        self._filters: List[Callable] = []
        self._limit_val: Optional[int] = None
        self._order_key: Optional[Callable] = None
        self._order_reverse: bool = False

    def where(self, predicate: Callable[[Any, Dict], bool]) -> "NodeQuery":
        """Filter by a predicate receiving (node, attrs)."""
        self._filters.append(predicate)
        return self

    def with_attr(self, key: str, value: Any = None) -> "NodeQuery":
        """Keep only nodes that have attribute *key* (optionally equal to *value*)."""
        def _pred(n, attrs):
            if key not in attrs:
                return False
            if value is not None:
                return attrs[key] == value
            return True
        self._filters.append(_pred)
        return self

    def connected_to(self, node: Any) -> "NodeQuery":
        """Keep only nodes reachable from *node* (BFS)."""
        from meridian.algorithms.traverse import bfs_nodes
        reachable = set(bfs_nodes(self._G, node))
        self._filters.append(lambda n, _: n in reachable)
        return self

    def with_degree(self, min_deg: int = 0, max_deg: Optional[int] = None) -> "NodeQuery":
        """Keep nodes with degree in [min_deg, max_deg]."""
        def _pred(n, _):
            d = self._G.degree(n)
            if d < min_deg:
                return False
            if max_deg is not None and d > max_deg:
                return False
            return True
        self._filters.append(_pred)
        return self

    def in_component(self, node: Any) -> "NodeQuery":
        """Keep only nodes in the same connected component as *node*."""
        from meridian.algorithms.components import node_connected_component
        comp = node_connected_component(self._G, node)
        self._filters.append(lambda n, _: n in comp)
        return self

    def not_in(self, nodes: Iterable) -> "NodeQuery":
        excluded = set(nodes)
        self._filters.append(lambda n, _: n not in excluded)
        return self

    def limit(self, n: int) -> "NodeQuery":
        self._limit_val = n
        return self

    def order_by(self, key: Callable, reverse: bool = False) -> "NodeQuery":
        self._order_key = key
        self._order_reverse = reverse
        return self

    def order_by_degree(self, reverse: bool = True) -> "NodeQuery":
        return self.order_by(lambda n: self._G.degree(n), reverse=reverse)

    def order_by_attr(self, attr: str, default=0, reverse: bool = False) -> "NodeQuery":
        return self.order_by(lambda n: self._G.nodes[n].get(attr, default), reverse=reverse)

    def all(self) -> List:
        return list(self._execute())

    def first(self) -> Optional[Any]:
        return next(self._execute(), None)

    def count(self) -> int:
        return sum(1 for _ in self._execute())

    def exists(self) -> bool:
        return self.first() is not None

    def subgraph(self):
        """Return the induced subgraph of query results."""
        return self._G.subgraph(self.all())

    def _execute(self) -> Iterator:
        results = []
        for n, attrs in self._iter:
            if all(f(n, attrs) for f in self._filters):
                results.append(n)
        if self._order_key is not None:
            results.sort(key=self._order_key, reverse=self._order_reverse)
        if self._limit_val is not None:
            results = results[:self._limit_val]
        return iter(results)

    def __iter__(self) -> Iterator:
        return self._execute()

    def __repr__(self) -> str:
        return f"NodeQuery(filters={len(self._filters)}, limit={self._limit_val})"


class EdgeQuery:
    """Fluent builder for edge queries."""

    def __init__(self, edges_iter, graph) -> None:
        self._iter = edges_iter
        self._G = graph
        self._filters: List[Callable] = []
        self._limit_val: Optional[int] = None
        self._order_key: Optional[Callable] = None
        self._order_reverse: bool = False

    def where(self, predicate: Callable[[Any, Any, Dict], bool]) -> "EdgeQuery":
        """Filter by predicate (u, v, attrs) -> bool."""
        self._filters.append(predicate)
        return self

    def with_attr(self, key: str, value: Any = None) -> "EdgeQuery":
        def _pred(u, v, attrs):
            if key not in attrs:
                return False
            return attrs[key] == value if value is not None else True
        self._filters.append(_pred)
        return self

    def min_weight(self, threshold: float, weight: str = "weight") -> "EdgeQuery":
        self._filters.append(lambda u, v, d: d.get(weight, 1.0) >= threshold)
        return self

    def max_weight(self, threshold: float, weight: str = "weight") -> "EdgeQuery":
        self._filters.append(lambda u, v, d: d.get(weight, 1.0) <= threshold)
        return self

    def incident_to(self, node: Any) -> "EdgeQuery":
        self._filters.append(lambda u, v, _: u == node or v == node)
        return self

    def between(self, u: Any, v: Any) -> "EdgeQuery":
        self._filters.append(
            lambda a, b, _: (a == u and b == v) or (a == v and b == u)
        )
        return self

    def self_loops_only(self) -> "EdgeQuery":
        self._filters.append(lambda u, v, _: u == v)
        return self

    def limit(self, n: int) -> "EdgeQuery":
        self._limit_val = n
        return self

    def order_by(self, key: Callable, reverse: bool = False) -> "EdgeQuery":
        self._order_key = key
        self._order_reverse = reverse
        return self

    def order_by_weight(self, weight: str = "weight", reverse: bool = False) -> "EdgeQuery":
        return self.order_by(lambda e: e[2].get(weight, 1.0), reverse=reverse)

    def all(self) -> List[Tuple]:
        return list(self._execute())

    def first(self) -> Optional[Tuple]:
        return next(self._execute(), None)

    def count(self) -> int:
        return sum(1 for _ in self._execute())

    def _execute(self) -> Iterator:
        results = []
        for u, v, attrs in self._iter:
            if all(f(u, v, attrs) for f in self._filters):
                results.append((u, v, attrs))
        if self._order_key is not None:
            results.sort(key=self._order_key, reverse=self._order_reverse)
        if self._limit_val is not None:
            results = results[:self._limit_val]
        return iter(results)

    def __iter__(self) -> Iterator:
        return self._execute()


class PathQuery:
    """Fluent builder for path queries."""

    def __init__(self, G, source: Any, target: Any) -> None:
        self._G = G
        self._source = source
        self._target = target
        self._cutoff: Optional[int] = None
        self._weight: Optional[str] = None

    def cutoff(self, n: int) -> "PathQuery":
        self._cutoff = n
        return self

    def weighted(self, attr: str = "weight") -> "PathQuery":
        self._weight = attr
        return self

    def all(self) -> List[List]:
        from meridian.analysis.paths import all_simple_paths
        return list(all_simple_paths(self._G, self._source, self._target, cutoff=self._cutoff))

    def shortest(self) -> List:
        if self._weight is None:
            from meridian.algorithms.shortest_path import dijkstra_path
            return dijkstra_path(self._G, self._source, self._target, weight="weight")
        return dijkstra_path(self._G, self._source, self._target, weight=self._weight)  # noqa: F821

    def shortest_length(self) -> float:
        from meridian.algorithms.shortest_path import dijkstra_path_length
        return dijkstra_path_length(
            self._G, self._source, self._target,
            weight=self._weight or "weight"
        )

    def count(self) -> int:
        return len(self.all())


class NeighbourhoodQuery:
    """Query the k-hop neighbourhood of a node."""

    def __init__(self, G, source: Any) -> None:
        self._G = G
        self._source = source
        self._radius: int = 1
        self._include_source: bool = False

    def within_hops(self, k: int) -> "NeighbourhoodQuery":
        self._radius = k
        return self

    def include_source(self, flag: bool = True) -> "NeighbourhoodQuery":
        self._include_source = flag
        return self

    def all(self) -> List:
        from meridian.algorithms.traverse import bfs_nodes
        nodes = list(bfs_nodes(self._G, self._source, depth_limit=self._radius))
        if not self._include_source:
            nodes = [n for n in nodes if n != self._source]
        return nodes

    def subgraph(self):
        return self._G.subgraph(self.all() + ([self._source] if not self._include_source else []))

    def count(self) -> int:
        return len(self.all())


class GraphQuery:
    """Entry point for fluent graph queries.

    Usage::

        gq = GraphQuery(G)
        important = gq.nodes().with_degree(min_deg=3).order_by_degree().limit(10).all()
        heavy = gq.edges().min_weight(5.0).order_by_weight(reverse=True).all()
        paths = gq.paths("a", "z").cutoff(6).all()
    """

    def __init__(self, G) -> None:
        self._G = G

    def nodes(self) -> NodeQuery:
        return NodeQuery(self._G.nodes.data(), self._G)

    def edges(self) -> EdgeQuery:
        return EdgeQuery(self._G.edges.data(), self._G)

    def paths(self, source: Any, target: Any) -> PathQuery:
        return PathQuery(self._G, source, target)

    def neighbourhood(self, source: Any) -> NeighbourhoodQuery:
        return NeighbourhoodQuery(self._G, source)

    def filter_nodes(self, predicate: Callable) -> List:
        """Shorthand: return nodes satisfying *predicate(node, attrs)*."""
        return [n for n, d in self._G.nodes.data() if predicate(n, d)]

    def filter_edges(self, predicate: Callable) -> List[Tuple]:
        """Shorthand: return edges satisfying *predicate(u, v, attrs)*."""
        return [(u, v, d) for u, v, d in self._G.edges.data() if predicate(u, v, d)]

    def top_nodes_by(self, key: Callable, n: int = 10) -> List:
        """Return top-n nodes ranked by *key(node)*."""
        return sorted(self._G.nodes, key=key, reverse=True)[:n]

    def __repr__(self) -> str:
        return f"GraphQuery(G={self._G!r})"
