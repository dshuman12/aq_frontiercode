"""Tests for I/O serialisation."""

import json
import pytest
from meridian import DiGraph, Graph
from meridian.io.csv_io import from_edgelist, to_adjacency_csv, to_edgelist
from meridian.io.dot import from_dot, to_dot
from meridian.io.json_io import from_json, to_json


def make_weighted():
    g = Graph(name="test")
    g.add_edge("a", "b", weight=1.5)
    g.add_edge("b", "c", weight=2.0)
    return g


class TestJSON:
    def test_roundtrip_undirected(self):
        g = make_weighted()
        s = to_json(g)
        g2 = from_json(s)
        assert not g2.is_directed()
        assert g2.has_edge("a", "b")
        assert g2.get_edge_data("a", "b")["weight"] == pytest.approx(1.5)

    def test_roundtrip_directed(self):
        g = DiGraph(name="directed")
        g.add_edge(0, 1, weight=3.0)
        g.add_edge(1, 2)
        s = to_json(g)
        g2 = from_json(s)
        assert g2.is_directed()
        assert g2.has_edge(0, 1)
        assert not g2.has_edge(1, 0)

    def test_from_dict(self):
        d = {
            "directed": False,
            "multigraph": False,
            "name": "g",
            "graph": {},
            "nodes": [{"id": 0}, {"id": 1}],
            "edges": [{"source": 0, "target": 1}],
        }
        g = from_json(d)
        assert g.has_edge(0, 1)

    def test_node_attrs_preserved(self):
        g = Graph()
        g.add_node(1, color="red")
        s = to_json(g)
        g2 = from_json(s)
        assert g2.nodes[1]["color"] == "red"

    def test_valid_json_output(self):
        g = make_weighted()
        s = to_json(g)
        parsed = json.loads(s)
        assert "nodes" in parsed and "edges" in parsed


class TestCSV:
    def test_roundtrip_undirected(self):
        g = make_weighted()
        csv_str = to_edgelist(g)
        g2 = from_edgelist(csv_str)
        assert g2.has_edge("a", "b") or g2.has_edge("b", "a")

    def test_edge_count(self):
        g = make_weighted()
        csv_str = to_edgelist(g)
        lines = [l for l in csv_str.strip().splitlines() if l]
        assert len(lines) == 3  # header + 2 edges

    def test_from_edgelist_directed(self):
        csv_data = "source,target,weight\n0,1,2.0\n1,2,3.0\n"
        g = from_edgelist(csv_data, directed=True)
        assert g.is_directed()
        assert g.has_edge(0, 1)

    def test_adjacency_csv(self):
        g = Graph()
        g.add_edge(0, 1, weight=5)
        adj = to_adjacency_csv(g)
        assert "5" in adj

    def test_numeric_node_ids(self):
        csv_data = "source,target\n0,1\n1,2\n"
        g = from_edgelist(csv_data)
        assert g.has_edge(0, 1)
        assert g.has_edge(1, 2)


class TestDOT:
    def test_undirected_dot(self):
        g = Graph(name="test")
        g.add_edge("a", "b")
        dot = to_dot(g)
        assert "graph" in dot
        assert "--" in dot
        assert "a" in dot

    def test_directed_dot(self):
        g = DiGraph(name="d")
        g.add_edge(0, 1)
        dot = to_dot(g)
        assert "digraph" in dot
        assert "->" in dot

    def test_roundtrip_undirected(self):
        g = Graph(name="simple")
        g.add_edge("x", "y")
        g.add_edge("y", "z")
        dot = to_dot(g)
        g2 = from_dot(dot)
        assert not g2.is_directed()
        assert g2.has_edge("x", "y") or g2.has_edge("y", "x")

    def test_roundtrip_directed(self):
        g = DiGraph(name="d")
        g.add_edge(0, 1)
        dot = to_dot(g)
        g2 = from_dot(dot)
        assert g2.is_directed()

    def test_edge_attrs_in_dot(self):
        g = Graph()
        g.add_edge(1, 2, weight=3.0)
        dot = to_dot(g)
        assert "weight" in dot

    def test_node_attrs_in_dot(self):
        g = Graph()
        g.add_node(1, color="blue")
        dot = to_dot(g)
        assert "color" in dot
