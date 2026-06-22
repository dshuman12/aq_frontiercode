"""CSV edge-list import / export."""

from __future__ import annotations

import csv
import io
from typing import List, Optional


def to_edgelist(G, delimiter: str = ",") -> str:
    """Export *G* as a CSV edge list.

    Columns: source, target[, weight, ...]
    """
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=delimiter)
    # Collect all edge attribute names
    edge_attrs: list = []
    for _, _, d in G.edges.data():
        for k in d:
            if k not in edge_attrs:
                edge_attrs.append(k)
    header = ["source", "target"] + edge_attrs
    writer.writerow(header)
    for u, v, d in G.edges.data():
        row = [u, v] + [d.get(a, "") for a in edge_attrs]
        writer.writerow(row)
    return buf.getvalue()


def from_edgelist(
    data: str,
    delimiter: str = ",",
    directed: bool = False,
    source_col: int = 0,
    target_col: int = 1,
    weight_col: Optional[int] = None,
    weight_attr: str = "weight",
    has_header: bool = True,
) -> "Graph":
    """Import a graph from a CSV edge list."""
    from meridian.digraph import DiGraph
    from meridian.graph import Graph

    G = DiGraph() if directed else Graph()
    reader = csv.reader(io.StringIO(data), delimiter=delimiter)
    rows = list(reader)
    if has_header and rows:
        header = rows[0]
        rows = rows[1:]
    else:
        header = None

    for row in rows:
        if not row or (len(row) <= max(source_col, target_col)):
            continue
        u = _try_numeric(row[source_col])
        v = _try_numeric(row[target_col])
        attrs: dict = {}
        if weight_col is not None and weight_col < len(row):
            attrs[weight_attr] = _try_numeric(row[weight_col])
        if header:
            for i, col_name in enumerate(header):
                if i not in (source_col, target_col) and i < len(row):
                    attrs[col_name] = _try_numeric(row[i])
        G.add_edge(u, v, **attrs)
    return G


def to_adjacency_csv(G, delimiter: str = ",") -> str:
    """Export adjacency matrix as CSV.  Nodes are sorted by str representation."""
    nodes = sorted(G.nodes, key=str)
    buf = io.StringIO()
    writer = csv.writer(buf, delimiter=delimiter)
    writer.writerow([""] + [str(n) for n in nodes])
    for u in nodes:
        row = [str(u)]
        for v in nodes:
            if G.has_edge(u, v):
                d = G.get_edge_data(u, v, {})
                row.append(str(d.get("weight", 1)))
            else:
                row.append("0")
        writer.writerow(row)
    return buf.getvalue()


def from_adjacency_csv(data: str, delimiter: str = ",") -> "Graph":
    """Import a graph from an adjacency matrix CSV."""
    from meridian.graph import Graph
    reader = csv.reader(io.StringIO(data), delimiter=delimiter)
    rows = list(reader)
    if not rows:
        return Graph()
    header = rows[0][1:]  # first cell is blank
    nodes = [_try_numeric(h) for h in header]
    G = Graph()
    for n in nodes:
        G.add_node(n)
    for i, row in enumerate(rows[1:]):
        if not row:
            continue
        u = nodes[i]
        for j, val in enumerate(row[1:]):
            v = nodes[j]
            w = _try_numeric(val)
            if w and w != 0:
                G.add_edge(u, v, weight=float(w))
    return G


def save_edgelist(G, path: str, delimiter: str = ",") -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        f.write(to_edgelist(G, delimiter=delimiter))


def load_edgelist(path: str, delimiter: str = ",", directed: bool = False) -> "Graph":
    with open(path, "r", encoding="utf-8", newline="") as f:
        data = f.read()
    return from_edgelist(data, delimiter=delimiter, directed=directed)


def _try_numeric(s: str):
    """Convert string to int or float if possible, else leave as string."""
    s = s.strip()
    try:
        return int(s)
    except (ValueError, TypeError):
        pass
    try:
        return float(s)
    except (ValueError, TypeError):
        pass
    return s
