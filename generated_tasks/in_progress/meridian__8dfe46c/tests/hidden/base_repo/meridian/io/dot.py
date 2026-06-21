"""GraphViz DOT format import / export."""

from __future__ import annotations

import re
from typing import Optional


def to_dot(G, directed: Optional[bool] = None, graph_name: Optional[str] = None) -> str:
    """Export *G* to GraphViz DOT format string."""
    is_directed = G.is_directed() if directed is None else directed
    gtype = "digraph" if is_directed else "graph"
    edge_op = "->" if is_directed else "--"
    gname = graph_name or G.name or "G"
    gname_safe = re.sub(r"[^A-Za-z0-9_]", "_", gname)

    lines = [f'{gtype} {gname_safe} {{']

    # Graph attributes
    for k, v in G.graph.items():
        lines.append(f'  graph [{k}="{v}"];')

    # Nodes
    for n, attrs in G.nodes.data():
        node_str = _dot_id(n)
        if attrs:
            attr_str = ", ".join(f'{k}="{v}"' for k, v in attrs.items())
            lines.append(f'  {node_str} [{attr_str}];')
        else:
            lines.append(f'  {node_str};')

    # Edges
    seen: set = set()
    for u, v, attrs in G.edges.data():
        if not is_directed:
            key = (min(_dot_id(u), _dot_id(v)), max(_dot_id(u), _dot_id(v)))
            if key in seen:
                continue
            seen.add(key)
        u_str = _dot_id(u)
        v_str = _dot_id(v)
        if attrs:
            attr_str = ", ".join(f'{k}="{v2}"' for k, v2 in attrs.items())
            lines.append(f'  {u_str} {edge_op} {v_str} [{attr_str}];')
        else:
            lines.append(f'  {u_str} {edge_op} {v_str};')

    lines.append("}")
    return "\n".join(lines)


def _dot_id(node) -> str:
    """Convert a node id to a safe DOT identifier."""
    s = str(node)
    if re.match(r'^[A-Za-z_]\w*$', s):
        return s
    # Escape as quoted string
    s = s.replace('"', '\\"')
    return f'"{s}"'


def from_dot(dot_str: str):
    """Parse a DOT string and return a meridian graph.

    Supports basic DOT syntax: node declarations, edge declarations,
    and simple attribute lists.  Does not support subgraphs, HTML labels,
    or complex DOT extensions.
    """
    # Determine graph type
    directed = bool(re.search(r'\bdigraph\b', dot_str, re.IGNORECASE))

    if directed:
        from meridian.digraph import DiGraph
        G = DiGraph()
    else:
        from meridian.graph import Graph
        G = Graph()

    # Extract graph name
    m = re.search(r'\b(?:di)?graph\s+(\w+)\s*\{', dot_str, re.IGNORECASE)
    if m:
        G.name = m.group(1)

    # Remove comments
    dot_str = re.sub(r'//.*$', '', dot_str, flags=re.MULTILINE)
    dot_str = re.sub(r'/\*.*?\*/', '', dot_str, flags=re.DOTALL)

    edge_op = '->' if directed else '--'

    # Parse edges
    edge_pattern = re.compile(
        r'(\w+|"[^"]*")\s*' + re.escape(edge_op) + r'\s*(\w+|"[^"]*")\s*(?:\[([^\]]*)\])?;?'
    )
    for m in edge_pattern.finditer(dot_str):
        u = _undot_id(m.group(1))
        v = _undot_id(m.group(2))
        attrs = _parse_attrs(m.group(3) or "")
        G.add_edge(u, v, **attrs)

    # Parse node declarations (that don't appear in edges)
    node_pattern = re.compile(r'^\s*(\w+|"[^"]*")\s*(?:\[([^\]]*)\])?;', re.MULTILINE)
    for m in node_pattern.finditer(dot_str):
        nid = _undot_id(m.group(1))
        if nid in ("graph", "digraph", "node", "edge", "subgraph"):
            continue
        attrs = _parse_attrs(m.group(2) or "")
        if not G.has_node(nid):
            G.add_node(nid, **attrs)
        elif attrs:
            G.nodes[nid].update(attrs)

    return G


def _undot_id(s: str):
    """Convert a DOT identifier back to a Python value."""
    s = s.strip()
    if s.startswith('"') and s.endswith('"'):
        s = s[1:-1].replace('\\"', '"')
    # Try numeric conversion
    try:
        return int(s)
    except ValueError:
        pass
    try:
        return float(s)
    except ValueError:
        pass
    return s


def _parse_attrs(attr_str: str) -> dict:
    """Parse a DOT attribute list 'key=val, key=val' into a dict."""
    attrs: dict = {}
    if not attr_str:
        return attrs
    for pair in re.finditer(r'(\w+)\s*=\s*("(?:[^"\\]|\\.)*"|\S+)', attr_str):
        key = pair.group(1)
        val = pair.group(2).strip('"')
        try:
            val = int(val)
        except (ValueError, TypeError):
            try:
                val = float(val)
            except (ValueError, TypeError):
                pass
        attrs[key] = val
    return attrs


def save_dot(G, path: str) -> None:
    """Write *G* to a DOT file."""
    with open(path, "w", encoding="utf-8") as f:
        f.write(to_dot(G))


def load_dot(path: str):
    """Load a graph from a DOT file."""
    with open(path, "r", encoding="utf-8") as f:
        return from_dot(f.read())
