"""MultiGraph and MultiDiGraph: graphs allowing parallel edges."""

from __future__ import annotations

import copy
from typing import Any, Dict, Hashable, Iterable, Iterator, Optional, Tuple

from meridian.exceptions import AmbiguousKeyError, EdgeNotFound, NodeNotFound
from meridian.graph import AttrDict, Graph, NodeID


class MultiEdgeView:
    """Read-only view over multi-graph edges."""

    __slots__ = ("_adj",)

    def __init__(self, adj: Dict) -> None:
        self._adj = adj

    def __len__(self) -> int:
        total = 0
        seen: set = set()
        for u, nbrs in self._adj.items():
            for v, keydict in nbrs.items():
                if v not in seen:
                    total += len(keydict)
            seen.add(u)
        return total

    def __iter__(self) -> Iterator[Tuple]:
        seen: set = set()
        for u, nbrs in self._adj.items():
            for v, keydict in nbrs.items():
                if v not in seen:
                    for k in keydict:
                        yield u, v, k
            seen.add(u)

    def __contains__(self, edge) -> bool:
        if len(edge) == 2:
            u, v = edge
            return u in self._adj and v in self._adj[u]
        u, v, k = edge
        return u in self._adj and v in self._adj[u] and k in self._adj[u][v]

    def data(self, attr: Optional[str] = None, default: Any = None):
        seen: set = set()
        for u, nbrs in self._adj.items():
            for v, keydict in nbrs.items():
                if v not in seen:
                    for k, d in keydict.items():
                        if attr is None:
                            yield u, v, k, d
                        else:
                            yield u, v, k, d.get(attr, default)
            seen.add(u)

    def __repr__(self) -> str:
        return f"MultiEdgeView({list(self)!r})"


class MultiGraph(Graph):
    """Undirected multigraph: multiple edges allowed between the same pair of nodes.

    Edge keys (integers by default) distinguish parallel edges.
    Storage: _adj[u][v][key] = attr_dict
    """

    _edge_view_cls = MultiEdgeView  # type: ignore[assignment]

    def __init__(self, incoming=None, *, name: str = "", **graph_attrs) -> None:
        self._nodes: Dict[NodeID, AttrDict] = {}
        # adj[u][v] = {key: attr_dict, ...}
        self._adj: Dict[NodeID, Dict[NodeID, Dict[int, AttrDict]]] = {}  # type: ignore[assignment]
        self._edge_key_dict: Dict[Tuple[NodeID, NodeID], int] = {}
        self.name = name
        self.graph: AttrDict = dict(graph_attrs)
        if incoming is not None:
            self.update(incoming)

    # ------------------------------------------------------------------
    # Node ops
    # ------------------------------------------------------------------

    def add_node(self, node: NodeID, **attrs) -> None:
        if node not in self._nodes:
            self._nodes[node] = {}
            self._adj[node] = {}
        self._nodes[node].update(attrs)

    def remove_node(self, node: NodeID) -> None:
        if node not in self._nodes:
            raise NodeNotFound(node)
        for nbr in list(self._adj[node]):
            del self._adj[nbr][node]
        del self._adj[node]
        del self._nodes[node]

    # ------------------------------------------------------------------
    # Edge ops
    # ------------------------------------------------------------------

    def _next_key(self, u: NodeID, v: NodeID) -> int:
        """Return the next available integer key for edge (u, v)."""
        if u not in self._adj or v not in self._adj[u] or not self._adj[u][v]:
            return 0
        return max(self._adj[u][v]) + 1

    def add_edge(self, u: NodeID, v: NodeID, key: Optional[int] = None, **attrs) -> int:  # type: ignore[override]
        if u not in self._nodes:
            self.add_node(u)
        if v not in self._nodes:
            self.add_node(v)
        if v not in self._adj[u]:
            self._adj[u][v] = {}
            if u != v:
                self._adj[v][u] = {}
        if key is None:
            key = self._next_key(u, v)
        edge_dict: AttrDict = dict(attrs)
        self._adj[u][v][key] = edge_dict
        if u != v:
            self._adj[v][u][key] = edge_dict
        return key

    def add_edges_from(self, edges: Iterable, **attrs) -> None:
        for e in edges:
            if len(e) == 2:
                self.add_edge(e[0], e[1], **attrs)
            elif len(e) == 3:
                u, v, d = e
                k = self.add_edge(u, v, **attrs)
                self._adj[u][v][k].update(d)
            else:
                raise ValueError(f"Expected 2 or 3 elements, got {len(e)}")

    def remove_edge(self, u: NodeID, v: NodeID, key: Optional[int] = None) -> None:  # type: ignore[override]
        if u not in self._adj or v not in self._adj[u]:
            raise EdgeNotFound(u, v)
        keydict = self._adj[u][v]
        if key is None:
            if len(keydict) > 1:
                raise AmbiguousKeyError(u, v)
            key = next(iter(keydict))
        if key not in keydict:
            raise EdgeNotFound(u, v)
        del keydict[key]
        if u != v:
            del self._adj[v][u][key]
        if not keydict:
            del self._adj[u][v]
            if u != v:
                del self._adj[v][u]

    def has_edge(self, u: NodeID, v: NodeID, key: Optional[int] = None) -> bool:  # type: ignore[override]
        if u not in self._adj or v not in self._adj[u]:
            return False
        if key is None:
            return True
        return key in self._adj[u][v]

    def get_edge_data(self, u: NodeID, v: NodeID, key: Optional[int] = None, default: Any = None) -> Any:
        try:
            if key is None:
                return self._adj[u][v]
            return self._adj[u][v][key]
        except KeyError:
            return default

    def edges_between(self, u: NodeID, v: NodeID) -> Dict[int, AttrDict]:
        """Return all edges between u and v as {key: attr_dict}."""
        if u not in self._adj or v not in self._adj[u]:
            return {}
        return dict(self._adj[u][v])

    # ------------------------------------------------------------------
    # Views
    # ------------------------------------------------------------------

    @property
    def edges(self) -> MultiEdgeView:  # type: ignore[override]
        return MultiEdgeView(self._adj)

    def neighbors(self, node: NodeID) -> Iterator[NodeID]:
        if node not in self._adj:
            raise NodeNotFound(node)
        return iter(self._adj[node])

    # ------------------------------------------------------------------
    # Counts
    # ------------------------------------------------------------------

    def number_of_edges(self, u=None, v=None) -> int:  # type: ignore[override]
        if u is None:
            total = 0
            seen: set = set()
            for n, nbrs in self._adj.items():
                for m, keys in nbrs.items():
                    if m not in seen:
                        total += len(keys)
                seen.add(n)
            return total
        if u not in self._adj or v not in self._adj.get(u, {}):
            return 0
        return len(self._adj[u][v])

    def degree(self, node=None, weight=None):
        if node is not None:
            if node not in self._adj:
                raise NodeNotFound(node)
            if weight is None:
                return sum(len(keys) for keys in self._adj[node].values())
            return sum(
                d.get(weight, 1)
                for keys in self._adj[node].values()
                for d in keys.values()
            )
        if weight is None:
            return {
                n: sum(len(keys) for keys in nbrs.values())
                for n, nbrs in self._adj.items()
            }
        return {
            n: sum(
                d.get(weight, 1)
                for keys in nbrs.values()
                for d in keys.values()
            )
            for n, nbrs in self._adj.items()
        }

    # ------------------------------------------------------------------
    # Graph properties
    # ------------------------------------------------------------------

    def is_multigraph(self) -> bool:
        return True

    def is_directed(self) -> bool:
        return False

    # ------------------------------------------------------------------
    # Copy and subgraph
    # ------------------------------------------------------------------

    def copy(self) -> "MultiGraph":
        return copy.deepcopy(self)

    def subgraph(self, nodes: Iterable) -> "MultiGraph":
        nodes_set = set(nodes)
        sub = MultiGraph(name=self.name)
        for n in nodes_set:
            if n in self._nodes:
                sub.add_node(n, **self._nodes[n])
        for u, v, k, d in self.edges.data():
            if u in nodes_set and v in nodes_set:
                sub.add_edge(u, v, key=k, **d)
        return sub

    def to_simple_graph(self) -> Graph:
        """Collapse parallel edges to a single edge (keeping first attributes)."""
        g = Graph(name=self.name)
        for n, d in self._nodes.items():
            g.add_node(n, **d)
        seen: set = set()
        for u, nbrs in self._adj.items():
            for v, keydict in nbrs.items():
                if v not in seen and keydict:
                    first_key = next(iter(keydict))
                    g.add_edge(u, v, **keydict[first_key])
            seen.add(u)
        return g

    def __repr__(self) -> str:
        return (
            f"MultiGraph(name={self.name!r}, "
            f"nodes={self.number_of_nodes()}, edges={self.number_of_edges()})"
        )


# ---------------------------------------------------------------------------
# MultiDiGraph
# ---------------------------------------------------------------------------

class MultiDiEdgeView:
    __slots__ = ("_succ",)

    def __init__(self, succ: Dict) -> None:
        self._succ = succ

    def __len__(self) -> int:
        return sum(len(k) for nbrs in self._succ.values() for k in nbrs.values())

    def __iter__(self):
        for u, nbrs in self._succ.items():
            for v, keydict in nbrs.items():
                for k in keydict:
                    yield u, v, k

    def __contains__(self, edge) -> bool:
        u, v = edge[0], edge[1]
        key = edge[2] if len(edge) > 2 else None
        if u not in self._succ or v not in self._succ[u]:
            return False
        if key is None:
            return True
        return key in self._succ[u][v]

    def data(self, attr=None, default=None):
        for u, nbrs in self._succ.items():
            for v, keydict in nbrs.items():
                for k, d in keydict.items():
                    if attr is None:
                        yield u, v, k, d
                    else:
                        yield u, v, k, d.get(attr, default)


class MultiDiGraph(MultiGraph):
    """Directed multigraph."""

    _edge_view_cls = MultiDiEdgeView  # type: ignore[assignment]

    def __init__(self, incoming=None, *, name: str = "", **graph_attrs) -> None:
        self._nodes: Dict[NodeID, AttrDict] = {}
        self._succ: Dict[NodeID, Dict[NodeID, Dict[int, AttrDict]]] = {}
        self._pred: Dict[NodeID, Dict[NodeID, Dict[int, AttrDict]]] = {}
        self._adj = self._succ
        self.name = name
        self.graph: AttrDict = dict(graph_attrs)
        if incoming is not None:
            self.update(incoming)

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

    def add_edge(self, u: NodeID, v: NodeID, key: Optional[int] = None, **attrs) -> int:
        if u not in self._nodes:
            self.add_node(u)
        if v not in self._nodes:
            self.add_node(v)
        if v not in self._succ[u]:
            self._succ[u][v] = {}
            self._pred[v][u] = {}
        if key is None:
            key = max(self._succ[u][v], default=-1) + 1
        edge_dict: AttrDict = dict(attrs)
        self._succ[u][v][key] = edge_dict
        self._pred[v][u][key] = edge_dict
        return key

    def remove_edge(self, u: NodeID, v: NodeID, key: Optional[int] = None) -> None:
        if u not in self._succ or v not in self._succ[u]:
            raise EdgeNotFound(u, v)
        keydict = self._succ[u][v]
        if key is None:
            if len(keydict) > 1:
                raise AmbiguousKeyError(u, v)
            key = next(iter(keydict))
        del self._succ[u][v][key]
        del self._pred[v][u][key]
        if not self._succ[u][v]:
            del self._succ[u][v]
            del self._pred[v][u]

    def has_edge(self, u, v, key=None) -> bool:
        if u not in self._succ or v not in self._succ[u]:
            return False
        if key is None:
            return True
        return key in self._succ[u][v]

    @property
    def edges(self):  # type: ignore[override]
        return MultiDiEdgeView(self._succ)

    def predecessors(self, node: NodeID):
        if node not in self._pred:
            raise NodeNotFound(node)
        return iter(self._pred[node])

    def successors(self, node: NodeID):
        if node not in self._succ:
            raise NodeNotFound(node)
        return iter(self._succ[node])

    def neighbors(self, node: NodeID):
        return self.successors(node)

    def number_of_edges(self, u=None, v=None) -> int:
        if u is None:
            return sum(len(k) for nbrs in self._succ.values() for k in nbrs.values())
        if u not in self._succ or v not in self._succ.get(u, {}):
            return 0
        return len(self._succ[u][v])

    def is_directed(self) -> bool:
        return True

    def reverse(self) -> "MultiDiGraph":
        rev = MultiDiGraph(name=f"{self.name}_reversed")
        for n, d in self._nodes.items():
            rev.add_node(n, **d)
        for u, v, k, d in self.edges.data():
            rev.add_edge(v, u, key=k, **d)
        return rev

    def __repr__(self) -> str:
        return (
            f"MultiDiGraph(name={self.name!r}, "
            f"nodes={self.number_of_nodes()}, edges={self.number_of_edges()})"
        )
