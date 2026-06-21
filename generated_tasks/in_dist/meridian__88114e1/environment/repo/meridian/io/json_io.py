"""JSON serialisation / deserialisation for meridian graphs."""

from __future__ import annotations

import json
from typing import IO, Union


def to_json(G, indent: int = 2) -> str:
    """Serialise *G* to a JSON string."""
    data = G.to_dict()
    return json.dumps(data, indent=indent, default=_json_default)


def from_json(data: Union[str, dict]):
    """Deserialise a graph from a JSON string or dict."""
    if isinstance(data, str):
        obj = json.loads(data)
    else:
        obj = data

    directed = obj.get("directed", False)
    multigraph = obj.get("multigraph", False)
    name = obj.get("name", "")

    if directed and multigraph:
        from meridian.multigraph import MultiDiGraph
        G = MultiDiGraph(name=name)
    elif directed:
        from meridian.digraph import DiGraph
        G = DiGraph(name=name)
    elif multigraph:
        from meridian.multigraph import MultiGraph
        G = MultiGraph(name=name)
    else:
        from meridian.graph import Graph
        G = Graph(name=name)

    G.graph.update(obj.get("graph", {}))

    for node_data in obj.get("nodes", []):
        node_id = node_data.pop("id")
        G.add_node(node_id, **node_data)

    for edge_data in obj.get("edges", []):
        src = edge_data.pop("source")
        tgt = edge_data.pop("target")
        key = edge_data.pop("key", None)
        if multigraph and key is not None:
            G.add_edge(src, tgt, key=key, **edge_data)
        else:
            G.add_edge(src, tgt, **edge_data)

    return G


def save_json(G, path: str, indent: int = 2) -> None:
    """Write *G* to a JSON file at *path*."""
    with open(path, "w", encoding="utf-8") as f:
        f.write(to_json(G, indent=indent))


def load_json(path: str):
    """Load a graph from a JSON file at *path*."""
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return from_json(data)


def _json_default(obj):
    """Handle non-serialisable types."""
    if hasattr(obj, "__iter__"):
        return list(obj)
    return str(obj)


def to_json_adjacency(G, indent: int = 2) -> str:
    """Serialise in adjacency-list format (compact alternative)."""
    data: dict = {
        "directed": G.is_directed(),
        "graph": G.name,
        "nodes": [],
    }
    for n, attrs in G.nodes.data():
        entry = {"id": n, "adjacency": []}
        for nbr in G.neighbors(n):
            edge_attrs = G.get_edge_data(n, nbr, {})
            entry["adjacency"].append({"id": nbr, **edge_attrs})
        data["nodes"].append(entry)
    return json.dumps(data, indent=indent, default=_json_default)


def from_json_adjacency(data: Union[str, dict]):
    """Deserialise adjacency-list JSON format."""
    if isinstance(data, str):
        obj = json.loads(data)
    else:
        obj = data
    directed = obj.get("directed", False)
    if directed:
        from meridian.digraph import DiGraph
        G = DiGraph(name=obj.get("graph", ""))
    else:
        from meridian.graph import Graph
        G = Graph(name=obj.get("graph", ""))
    for node_entry in obj.get("nodes", []):
        nid = node_entry["id"]
        G.add_node(nid)
        for adj in node_entry.get("adjacency", []):
            nbr = adj.pop("id")
            if not G.has_edge(nid, nbr):
                G.add_edge(nid, nbr, **adj)
    return G
