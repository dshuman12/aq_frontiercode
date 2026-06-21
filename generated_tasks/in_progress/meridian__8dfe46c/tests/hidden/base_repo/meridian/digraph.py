"""Directed graph (DiGraph) implementation."""

from __future__ import annotations

import copy
from typing import Any, Dict, Hashable, Iterable, Iterator, Optional, Tuple, Union

from meridian.exceptions import EdgeNotFound, NodeNotFound
from meridian.graph import AttrDict, Graph, NodeID, NodeView


class DiEdgeView:
    """Read-only view over directed edges."""

    __slots__ = ("_succ",)

    def __init__(self, succ: Dict[NodeID, Dict[NodeID, AttrDict]]) -> None:
        self._succ = succ

    def __len__(self) -> int:
        return sum(len(nbrs) for nbrs in self._succ.values())

    def __iter__(self) -> Iterator[Tuple[NodeID, NodeID]]:
        for u, nbrs in self._succ.items():
            for v in nbrs:
                yield u, v

    def __contains__(self, edge) -> bool:
        u, v = edge
        return u in self._succ and v in self._succ[u]

    def data(self, attr: Optional[str] = None, default: Any = None):
        for u, nbrs in self._succ.items():
            for v, d in nbrs.items():
                if attr is None:
                    yield u, v, d
                else:
                    yield u, v, d.get(attr, default)

    def __repr__(self) -> str:
        return f"DiEdgeView({list(self)!r})"


class DiGraph(Graph):
    """A directed graph.

    Internally maintains two adjacency structures:
    ``_succ``  (alias ``_adj``) : outgoing edges  u -> {v: edge_attrs}
    ``_pred``                   : incoming edges  v -> {u: edge_attrs}

    ``_adj`` is an alias for ``_succ`` so generic Graph algorithms that use
    ``_adj`` operate on the successor view.
    """

    _edge_view_cls = DiEdgeView  # type: ignore[assignment]

    def __init__(self, incoming=None, *, name: str = "", **graph_attrs) -> None:
        self._nodes: Dict[NodeID, AttrDict] = {}
        self._succ: Dict[NodeID, Dict[NodeID, AttrDict]] = {}
        self._pred: Dict[NodeID, Dict[NodeID, AttrDict]] = {}
        self._adj = self._succ  # alias used by base Graph helpers
        self.name = name
        self.graph: AttrDict = dict(graph_attrs)
        if incoming is not None:
            self.update(incoming)

    # ------------------------------------------------------------------
    # Node ops (override to maintain _pred)
    # ------------------------------------------------------------------

    def add_node(self, node: NodeID, **attrs) -> None:
        if node not in self._nodes:
            self._nodes[node] = {}
            self._succ[node] = {}
            self._pred[node] = {}
        self._nodes[node].update(attrs)

    def remove_node(self, node: NodeID) -> None:
        if node not in self._nodes:
            raise NodeNotFound(node)
        for succ in list(self._succ[node]):
            del self._pred[succ][node]
        for pred in list(self._pred[node]):
            del self._succ[pred][node]
        del self._succ[node]
        del self._pred[node]
        del self._nodes[node]

    # ------------------------------------------------------------------
    # Edge ops (override for directed semantics)
    # ------------------------------------------------------------------

    def add_edge(self, u: NodeID, v: NodeID, **attrs) -> None:
        if u not in self._nodes:
            self.add_node(u)
        if v not in self._nodes:
            self.add_node(v)
        if v in self._succ[u]:
            self._succ[u][v].update(attrs)
        else:
            edge_dict: AttrDict = dict(attrs)
            self._succ[u][v] = edge_dict
            self._pred[v][u] = edge_dict

    def remove_edge(self, u: NodeID, v: NodeID) -> None:
        if u not in self._succ or v not in self._succ[u]:
            raise EdgeNotFound(u, v)
        del self._succ[u][v]
        del self._pred[v][u]

    def has_edge(self, u: NodeID, v: NodeID) -> bool:
        return u in self._succ and v in self._succ[u]

    def get_edge_data(self, u: NodeID, v: NodeID, default: Any = None) -> Any:
        try:
            return self._succ[u][v]
        except KeyError:
            return default

    # ------------------------------------------------------------------
    # Directed views
    # ------------------------------------------------------------------

    @property
    def edges(self) -> DiEdgeView:  # type: ignore[override]
        return DiEdgeView(self._succ)

    @property
    def out_edges(self) -> DiEdgeView:
        return DiEdgeView(self._succ)

    @property
    def in_edges(self) -> DiEdgeView:
        return DiEdgeView(
            {v: {u: d for u, d in preds.items()} for v, preds in self._pred.items()}
        )

    def predecessors(self, node: NodeID) -> Iterator[NodeID]:
        if node not in self._pred:
            raise NodeNotFound(node)
        return iter(self._pred[node])

    def successors(self, node: NodeID) -> Iterator[NodeID]:
        if node not in self._succ:
            raise NodeNotFound(node)
        return iter(self._succ[node])

    def neighbors(self, node: NodeID) -> Iterator[NodeID]:
        return self.successors(node)

    # ------------------------------------------------------------------
    # Degree (directed)
    # ------------------------------------------------------------------

    def in_degree(self, node: Optional[NodeID] = None, weight: Optional[str] = None):
        if node is not None:
            if node not in self._pred:
                raise NodeNotFound(node)
            if weight is None:
                return len(self._pred[node])
            return sum(d.get(weight, 1) for d in self._pred[node].values())
        if weight is None:
            return {n: len(self._pred[n]) for n in self._nodes}
        return {
            n: sum(d.get(weight, 1) for d in self._pred[n].values())
            for n in self._nodes
        }

    def out_degree(self, node: Optional[NodeID] = None, weight: Optional[str] = None):
        if node is not None:
            if node not in self._succ:
                raise NodeNotFound(node)
            if weight is None:
                return len(self._succ[node])
            return sum(d.get(weight, 1) for d in self._succ[node].values())
        if weight is None:
            return {n: len(self._succ[n]) for n in self._nodes}
        return {
            n: sum(d.get(weight, 1) for d in self._succ[n].values())
            for n in self._nodes
        }

    def degree(self, node: Optional[NodeID] = None, weight: Optional[str] = None):
        if node is not None:
            return self.in_degree(node, weight) + self.out_degree(node, weight)
        ind = self.in_degree(weight=weight)
        outd = self.out_degree(weight=weight)
        return {n: ind[n] + outd[n] for n in self._nodes}

    # ------------------------------------------------------------------
    # Counts
    # ------------------------------------------------------------------

    def number_of_edges(self, u=None, v=None) -> int:  # type: ignore[override]
        if u is None:
            return sum(len(nbrs) for nbrs in self._succ.values())
        if u not in self._succ or v not in self._succ.get(u, {}):
            return 0
        return 1

    def size(self, weight=None):
        if weight is None:
            return self.number_of_edges()
        return sum(
            d.get(weight, 1)
            for nbrs in self._succ.values()
            for d in nbrs.values()
        )

    # ------------------------------------------------------------------
    # Graph properties
    # ------------------------------------------------------------------

    def is_directed(self) -> bool:
        return True

    def is_dag(self) -> bool:
        """Return True if this directed graph has no cycles."""
        from meridian.algorithms.traverse import topological_sort
        try:
            list(topological_sort(self))
            return True
        except Exception:
            return False

    # ------------------------------------------------------------------
    # Reverse
    # ------------------------------------------------------------------

    def reverse(self, copy: bool = True) -> "DiGraph":
        """Return the reverse (transpose) of the graph."""
        rev = DiGraph(name=f"{self.name}_reversed")
        rev.graph.update(self.graph)
        for n, d in self._nodes.items():
            rev.add_node(n, **d)
        for u, v, d in self.edges.data():
            rev.add_edge(v, u, **d)
        return rev

    # ------------------------------------------------------------------
    # Conversions
    # ------------------------------------------------------------------

    def to_undirected(self) -> Graph:
        g = Graph(name=self.name)
        g.graph.update(self.graph)
        for n, d in self._nodes.items():
            g.add_node(n, **d)
        for u, v, d in self.edges.data():
            g.add_edge(u, v, **d)
        return g

    def to_directed(self) -> "DiGraph":
        return copy.deepcopy(self)

    # ------------------------------------------------------------------
    # Copy and subgraph
    # ------------------------------------------------------------------

    def copy(self) -> "DiGraph":
        return copy.deepcopy(self)

    def subgraph(self, nodes: Iterable) -> "DiGraph":
        nodes_set = set(nodes)
        missing = nodes_set - set(self._nodes)
        if missing:
            raise NodeNotFound(next(iter(missing)))
        sub = DiGraph(name=self.name)
        sub.graph.update(self.graph)
        for n in nodes_set:
            sub.add_node(n, **self._nodes[n])
        for u, v, d in self.edges.data():
            if u in nodes_set and v in nodes_set:
                sub.add_edge(u, v, **d)
        return sub

    # ------------------------------------------------------------------
    # Serialisation
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        return {
            "directed": True,
            "multigraph": False,
            "name": self.name,
            "graph": self.graph,
            "nodes": [{"id": n, **d} for n, d in self._nodes.items()],
            "edges": [
                {"source": u, "target": v, **d}
                for u, v, d in self.edges.data()
            ],
        }

    def __repr__(self) -> str:
        return (
            f"DiGraph(name={self.name!r}, "
            f"nodes={self.number_of_nodes()}, edges={self.number_of_edges()})"
        )
