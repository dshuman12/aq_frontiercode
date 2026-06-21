"""Core undirected Graph class."""

from __future__ import annotations

import copy
from typing import Any, Dict, Hashable, Iterable, Iterator, Optional, Tuple, Union

from meridian.exceptions import EdgeNotFound, NodeNotFound


NodeID = Hashable
AttrDict = Dict[str, Any]


class NodeView:
    """Read-only view over the nodes of a graph."""

    __slots__ = ("_nodes",)

    def __init__(self, nodes: Dict[NodeID, AttrDict]) -> None:
        self._nodes = nodes

    def __len__(self) -> int:
        return len(self._nodes)

    def __iter__(self) -> Iterator[NodeID]:
        return iter(self._nodes)

    def __contains__(self, node: NodeID) -> bool:
        return node in self._nodes

    def __getitem__(self, node: NodeID) -> AttrDict:
        if node not in self._nodes:
            raise NodeNotFound(node)
        return self._nodes[node]

    def data(self, attr: Optional[str] = None, default: Any = None):
        """Iterate (node, attr_dict) or (node, attr_value) pairs."""
        if attr is None:
            return iter(self._nodes.items())
        return ((n, d.get(attr, default)) for n, d in self._nodes.items())

    def __repr__(self) -> str:
        return f"NodeView({list(self._nodes)!r})"


class EdgeView:
    """Read-only view over the edges of an undirected graph."""

    __slots__ = ("_adj",)

    def __init__(self, adj: Dict[NodeID, Dict[NodeID, AttrDict]]) -> None:
        self._adj = adj

    def __len__(self) -> int:
        total = sum(len(nbrs) for nbrs in self._adj.values())
        return total // 2

    def __iter__(self) -> Iterator[Tuple[NodeID, NodeID]]:
        seen: set = set()
        for u, nbrs in self._adj.items():
            for v in nbrs:
                if v not in seen:
                    yield u, v
            seen.add(u)

    def __contains__(self, edge) -> bool:
        u, v = edge
        return u in self._adj and v in self._adj[u]

    def data(self, attr: Optional[str] = None, default: Any = None):
        """Iterate (u, v, attr_dict) or (u, v, attr_value) triples."""
        seen: set = set()
        for u, nbrs in self._adj.items():
            for v, d in nbrs.items():
                if v not in seen:
                    if attr is None:
                        yield u, v, d
                    else:
                        yield u, v, d.get(attr, default)
            seen.add(u)

    def __repr__(self) -> str:
        return f"EdgeView({list(self)!r})"


class Graph:
    """An undirected graph with optional node and edge attributes.

    Nodes can be any hashable Python object.  Self-loops are supported.
    Parallel edges are *not* supported (use MultiGraph for that).

    Storage layout
    --------------
    ``_nodes``   : dict  node_id  -> attr_dict
    ``_adj``     : dict  node_id  -> {neighbour_id: edge_attr_dict}

    For undirected graphs ``_adj[u][v]`` and ``_adj[v][u]`` point to the
    *same* dict object, so attribute mutations are reflected on both sides.
    """

    # Subclasses override these to get the right view types
    _node_view_cls = NodeView
    _edge_view_cls = EdgeView

    def __init__(self, incoming=None, *, name: str = "", **graph_attrs) -> None:
        self._nodes: Dict[NodeID, AttrDict] = {}
        self._adj: Dict[NodeID, Dict[NodeID, AttrDict]] = {}
        self.name = name
        self.graph: AttrDict = dict(graph_attrs)
        if incoming is not None:
            self.update(incoming)

    # ------------------------------------------------------------------
    # Node operations
    # ------------------------------------------------------------------

    def add_node(self, node: NodeID, **attrs) -> None:
        """Add a single node with optional attributes."""
        if node not in self._nodes:
            self._nodes[node] = {}
            self._adj[node] = {}
        self._nodes[node].update(attrs)

    def add_nodes_from(self, nodes: Iterable, **attrs) -> None:
        """Add multiple nodes.  *nodes* may be an iterable of node IDs or
        (node, attr_dict) pairs."""
        for item in nodes:
            if isinstance(item, tuple) and len(item) == 2:
                n, d = item
                self.add_node(n, **attrs)
                self._nodes[n].update(d)
            else:
                self.add_node(item, **attrs)

    def remove_node(self, node: NodeID) -> None:
        """Remove a node and all incident edges."""
        if node not in self._nodes:
            raise NodeNotFound(node)
        for neighbour in list(self._adj[node]):
            del self._adj[neighbour][node]
        del self._adj[node]
        del self._nodes[node]

    def remove_nodes_from(self, nodes: Iterable) -> None:
        for n in list(nodes):
            if n in self._nodes:
                self.remove_node(n)

    def has_node(self, node: NodeID) -> bool:
        return node in self._nodes

    def __contains__(self, node: NodeID) -> bool:
        return node in self._nodes

    def __len__(self) -> int:
        return len(self._nodes)

    def __iter__(self) -> Iterator[NodeID]:
        return iter(self._nodes)

    # ------------------------------------------------------------------
    # Edge operations
    # ------------------------------------------------------------------

    def add_edge(self, u: NodeID, v: NodeID, **attrs) -> None:
        """Add edge (u, v).  Nodes are created if they do not exist."""
        if u not in self._nodes:
            self.add_node(u)
        if v not in self._nodes:
            self.add_node(v)
        if v in self._adj[u]:
            self._adj[u][v].update(attrs)
        else:
            edge_dict: AttrDict = dict(attrs)
            self._adj[u][v] = edge_dict
            if u != v:  # avoid double-ref for self-loops
                self._adj[v][u] = edge_dict

    def add_edges_from(self, edges: Iterable, **attrs) -> None:
        """Add multiple edges from an iterable of (u, v) or (u, v, attr) tuples."""
        for e in edges:
            if len(e) == 2:
                self.add_edge(e[0], e[1], **attrs)
            elif len(e) == 3:
                u, v, d = e
                self.add_edge(u, v, **attrs)
                self._adj[u][v].update(d)
            else:
                raise ValueError(f"Edge tuple must have 2 or 3 elements, got {len(e)}")

    def add_weighted_edges_from(self, edges: Iterable, weight: str = "weight") -> None:
        """Add (u, v, w) edges storing *w* under *weight* key."""
        for u, v, w in edges:
            self.add_edge(u, v, **{weight: w})

    def remove_edge(self, u: NodeID, v: NodeID) -> None:
        """Remove edge (u, v)."""
        if u not in self._adj or v not in self._adj[u]:
            raise EdgeNotFound(u, v)
        del self._adj[u][v]
        if u != v:
            del self._adj[v][u]

    def remove_edges_from(self, edges: Iterable) -> None:
        for u, v in edges:
            if u in self._adj and v in self._adj[u]:
                self.remove_edge(u, v)

    def has_edge(self, u: NodeID, v: NodeID) -> bool:
        return u in self._adj and v in self._adj.get(u, {})

    def get_edge_data(self, u: NodeID, v: NodeID, default: Any = None) -> Any:
        try:
            return self._adj[u][v]
        except KeyError:
            return default

    # ------------------------------------------------------------------
    # Views
    # ------------------------------------------------------------------

    @property
    def nodes(self) -> NodeView:
        return self._node_view_cls(self._nodes)

    @property
    def edges(self) -> EdgeView:
        return self._edge_view_cls(self._adj)

    def neighbors(self, node: NodeID) -> Iterator[NodeID]:
        if node not in self._adj:
            raise NodeNotFound(node)
        return iter(self._adj[node])

    def adjacency(self):
        """Iterate (node, adjacency_dict) pairs."""
        return iter(self._adj.items())

    # ------------------------------------------------------------------
    # Degree
    # ------------------------------------------------------------------

    def degree(self, node: Optional[NodeID] = None, weight: Optional[str] = None):
        """Return the degree of *node*, or a {node: degree} dict for all nodes.

        When *weight* is given the weighted degree (sum of edge weights) is
        returned instead of the count of edges.
        """
        if node is not None:
            if node not in self._adj:
                raise NodeNotFound(node)
            if weight is None:
                return len(self._adj[node])
            return sum(d.get(weight, 1) for d in self._adj[node].values())

        if weight is None:
            return {n: len(nbrs) for n, nbrs in self._adj.items()}
        return {
            n: sum(d.get(weight, 1) for d in nbrs.values())
            for n, nbrs in self._adj.items()
        }

    # ------------------------------------------------------------------
    # Counts
    # ------------------------------------------------------------------

    def number_of_nodes(self) -> int:
        return len(self._nodes)

    def order(self) -> int:
        return len(self._nodes)

    def number_of_edges(self, u: Optional[NodeID] = None, v: Optional[NodeID] = None) -> int:
        if u is None:
            return sum(len(nbrs) for nbrs in self._adj.values()) // 2
        if u not in self._adj or v not in self._adj.get(u, {}):
            return 0
        return 1

    def size(self, weight: Optional[str] = None) -> Union[int, float]:
        if weight is None:
            return self.number_of_edges()
        return sum(
            d.get(weight, 1)
            for u, nbrs in self._adj.items()
            for v, d in nbrs.items()
            if u <= v or u == v
        )

    # ------------------------------------------------------------------
    # Graph properties
    # ------------------------------------------------------------------

    def is_directed(self) -> bool:
        return False

    def is_multigraph(self) -> bool:
        return False

    # ------------------------------------------------------------------
    # Copy and subgraph
    # ------------------------------------------------------------------

    def copy(self) -> "Graph":
        return copy.deepcopy(self)

    def to_directed(self) -> "Any":
        from meridian.digraph import DiGraph
        dg = DiGraph(name=self.name)
        dg.graph.update(self.graph)
        for n, d in self._nodes.items():
            dg.add_node(n, **d)
        for u, v, d in self.edges.data():
            dg.add_edge(u, v, **d)
            dg.add_edge(v, u, **d)
        return dg

    def subgraph(self, nodes: Iterable) -> "Graph":
        """Return an induced subgraph over *nodes* (read-only view semantics here
        implemented as a fresh graph copy for simplicity)."""
        nodes_set = set(nodes)
        missing = nodes_set - set(self._nodes)
        if missing:
            raise NodeNotFound(next(iter(missing)))
        sub = self.__class__(name=self.name)
        sub.graph.update(self.graph)
        for n in nodes_set:
            sub.add_node(n, **self._nodes[n])
        for u, v, d in self.edges.data():
            if u in nodes_set and v in nodes_set:
                sub.add_edge(u, v, **d)
        return sub

    def edge_subgraph(self, edges: Iterable) -> "Graph":
        """Return a subgraph containing the given edges and their endpoints."""
        edges_list = list(edges)
        nodes = {n for e in edges_list for n in e[:2]}
        sub = self.__class__(name=self.name)
        for n in nodes:
            if n in self._nodes:
                sub.add_node(n, **self._nodes[n])
        for e in edges_list:
            u, v = e[0], e[1]
            if self.has_edge(u, v):
                sub.add_edge(u, v, **self._adj[u][v])
        return sub

    def complement(self) -> "Graph":
        """Return the complement graph."""
        comp = self.__class__(name=f"{self.name}_complement")
        for n, d in self._nodes.items():
            comp.add_node(n, **d)
        node_list = list(self._nodes)
        for i, u in enumerate(node_list):
            for v in node_list[i + 1:]:
                if not self.has_edge(u, v):
                    comp.add_edge(u, v)
        return comp

    # ------------------------------------------------------------------
    # Update / merge
    # ------------------------------------------------------------------

    def update(self, other: "Graph") -> None:
        """Merge all nodes and edges from *other* into this graph."""
        if hasattr(other, "_nodes"):
            for n, d in other._nodes.items():
                self.add_node(n, **d)
            for u, v, d in other.edges.data():
                self.add_edge(u, v, **d)
        else:
            # Assume iterable of edges
            self.add_edges_from(other)

    def clear(self) -> None:
        self._nodes.clear()
        self._adj.clear()

    def clear_edges(self) -> None:
        for nbrs in self._adj.values():
            nbrs.clear()

    # ------------------------------------------------------------------
    # Self-loops
    # ------------------------------------------------------------------

    def number_of_selfloops(self) -> int:
        return sum(1 for n in self._adj if n in self._adj[n])

    def nodes_with_selfloops(self) -> Iterator[NodeID]:
        return (n for n in self._adj if n in self._adj[n])

    def selfloop_edges(self):
        return ((n, n, self._adj[n][n]) for n in self._adj if n in self._adj[n])

    # ------------------------------------------------------------------
    # Serialisation helpers
    # ------------------------------------------------------------------

    def to_dict(self) -> dict:
        """Return a plain-dict representation of the graph."""
        return {
            "directed": self.is_directed(),
            "multigraph": self.is_multigraph(),
            "name": self.name,
            "graph": self.graph,
            "nodes": [{"id": n, **d} for n, d in self._nodes.items()],
            "edges": [
                {"source": u, "target": v, **d}
                for u, v, d in self.edges.data()
            ],
        }

    # ------------------------------------------------------------------
    # Dunder helpers
    # ------------------------------------------------------------------

    def __repr__(self) -> str:
        return (
            f"{self.__class__.__name__}(name={self.name!r}, "
            f"nodes={self.number_of_nodes()}, edges={self.number_of_edges()})"
        )

    def __eq__(self, other) -> bool:
        if not isinstance(other, Graph):
            return NotImplemented
        if self.is_directed() != other.is_directed():
            return False
        if self._nodes != other._nodes:
            return False
        edge_set_self = {(u, v): d for u, v, d in self.edges.data()}
        edge_set_other = {(u, v): d for u, v, d in other.edges.data()}
        return edge_set_self == edge_set_other
