"""Tests for core Graph class."""

import pytest
from meridian import Graph
from meridian.exceptions import EdgeNotFound, NodeNotFound


def make_triangle():
    g = Graph()
    g.add_edge(0, 1)
    g.add_edge(1, 2)
    g.add_edge(0, 2)
    return g


def make_path(n):
    g = Graph()
    for i in range(n - 1):
        g.add_edge(i, i + 1)
    return g


class TestNodeOps:
    def test_add_single_node(self):
        g = Graph()
        g.add_node("a")
        assert g.has_node("a")
        assert "a" in g

    def test_add_node_with_attrs(self):
        g = Graph()
        g.add_node(1, color="red", weight=5.0)
        assert g.nodes[1]["color"] == "red"
        assert g.nodes[1]["weight"] == 5.0

    def test_add_nodes_from_list(self):
        g = Graph()
        g.add_nodes_from([1, 2, 3])
        assert set(g.nodes) == {1, 2, 3}

    def test_add_nodes_from_pairs(self):
        g = Graph()
        g.add_nodes_from([(1, {"label": "a"}), (2, {"label": "b"})])
        assert g.nodes[1]["label"] == "a"
        assert g.nodes[2]["label"] == "b"

    def test_remove_node(self):
        g = make_triangle()
        g.remove_node(0)
        assert not g.has_node(0)
        assert not g.has_edge(0, 1)
        assert not g.has_edge(0, 2)
        assert g.has_edge(1, 2)

    def test_remove_nonexistent_node_raises(self):
        g = Graph()
        with pytest.raises(NodeNotFound):
            g.remove_node("x")

    def test_remove_nodes_from(self):
        g = make_triangle()
        g.remove_nodes_from([0, 1])
        assert set(g.nodes) == {2}

    def test_node_count(self):
        g = Graph()
        g.add_nodes_from(range(7))
        assert g.number_of_nodes() == 7
        assert len(g) == 7
        assert g.order() == 7

    def test_nodes_iteration(self):
        g = Graph()
        for i in range(4):
            g.add_node(i)
        assert sorted(g) == [0, 1, 2, 3]

    def test_node_attr_update(self):
        g = Graph()
        g.add_node(1, x=1)
        g.add_node(1, x=2, y=3)
        assert g.nodes[1] == {"x": 2, "y": 3}


class TestEdgeOps:
    def test_add_edge_creates_nodes(self):
        g = Graph()
        g.add_edge("a", "b")
        assert g.has_node("a")
        assert g.has_node("b")

    def test_add_edge_undirected_symmetry(self):
        g = Graph()
        g.add_edge(1, 2, weight=3.0)
        assert g.has_edge(1, 2)
        assert g.has_edge(2, 1)
        assert g.get_edge_data(1, 2)["weight"] == 3.0
        assert g.get_edge_data(2, 1)["weight"] == 3.0

    def test_add_edges_from_tuples(self):
        g = Graph()
        g.add_edges_from([(1, 2), (2, 3), (3, 4)])
        assert g.number_of_edges() == 3

    def test_add_edges_from_with_attrs(self):
        g = Graph()
        g.add_edges_from([(1, 2, {"weight": 5}), (2, 3, {"weight": 7})])
        assert g.get_edge_data(1, 2)["weight"] == 5
        assert g.get_edge_data(2, 3)["weight"] == 7

    def test_add_weighted_edges(self):
        g = Graph()
        g.add_weighted_edges_from([(0, 1, 2.5), (1, 2, 3.5)])
        assert g.get_edge_data(0, 1)["weight"] == 2.5

    def test_remove_edge(self):
        g = make_triangle()
        g.remove_edge(0, 1)
        assert not g.has_edge(0, 1)
        assert not g.has_edge(1, 0)
        assert g.has_edge(1, 2)

    def test_remove_nonexistent_edge_raises(self):
        g = Graph()
        g.add_node(0)
        g.add_node(1)
        with pytest.raises(EdgeNotFound):
            g.remove_edge(0, 1)

    def test_remove_edges_from(self):
        g = make_triangle()
        g.remove_edges_from([(0, 1), (1, 2)])
        assert g.has_edge(0, 2)
        assert not g.has_edge(0, 1)

    def test_edge_count(self):
        g = make_triangle()
        assert g.number_of_edges() == 3

    def test_edges_iteration(self):
        g = Graph()
        g.add_edge("a", "b")
        g.add_edge("b", "c")
        edges = sorted(g.edges, key=str)
        assert len(edges) == 2

    def test_self_loop(self):
        g = Graph()
        g.add_edge(1, 1)
        assert g.has_edge(1, 1)
        assert g.number_of_selfloops() == 1

    def test_edge_attr_update(self):
        g = Graph()
        g.add_edge(1, 2, weight=1.0)
        g.add_edge(1, 2, weight=2.0, color="blue")
        assert g.get_edge_data(1, 2)["weight"] == 2.0
        assert g.get_edge_data(1, 2)["color"] == "blue"

    def test_get_edge_data_default(self):
        g = Graph()
        g.add_edge(1, 2)
        assert g.get_edge_data(1, 3, "missing") == "missing"


class TestDegree:
    def test_single_node_degree(self):
        g = make_triangle()
        assert g.degree(0) == 2
        assert g.degree(1) == 2
        assert g.degree(2) == 2

    def test_degree_all_nodes(self):
        g = make_path(4)
        degs = g.degree()
        assert degs[0] == 1
        assert degs[1] == 2
        assert degs[2] == 2
        assert degs[3] == 1

    def test_weighted_degree(self):
        g = Graph()
        g.add_edge(0, 1, weight=2.0)
        g.add_edge(0, 2, weight=3.0)
        assert g.degree(0, weight="weight") == 5.0

    def test_degree_nonexistent_node(self):
        g = Graph()
        with pytest.raises(NodeNotFound):
            g.degree(99)

    def test_neighbors(self):
        g = make_triangle()
        assert set(g.neighbors(0)) == {1, 2}


class TestGraphOps:
    def test_copy(self):
        g = make_triangle()
        g2 = g.copy()
        assert g2.number_of_nodes() == g.number_of_nodes()
        g2.remove_node(0)
        assert g.has_node(0)  # original unchanged

    def test_subgraph(self):
        g = make_triangle()
        sub = g.subgraph([0, 1])
        assert sub.number_of_nodes() == 2
        assert sub.has_edge(0, 1)
        assert not sub.has_edge(0, 2)

    def test_subgraph_missing_node_raises(self):
        g = make_triangle()
        with pytest.raises(NodeNotFound):
            g.subgraph([0, 99])

    def test_update_graph(self):
        g1 = Graph()
        g1.add_edge(0, 1)
        g2 = Graph()
        g2.add_edge(2, 3)
        g1.update(g2)
        assert g1.has_edge(0, 1)
        assert g1.has_edge(2, 3)

    def test_clear(self):
        g = make_triangle()
        g.clear()
        assert g.number_of_nodes() == 0
        assert g.number_of_edges() == 0

    def test_clear_edges(self):
        g = make_triangle()
        g.clear_edges()
        assert g.number_of_nodes() == 3
        assert g.number_of_edges() == 0

    def test_complement(self):
        g = Graph()
        g.add_nodes_from([0, 1, 2, 3])
        g.add_edge(0, 1)
        g.add_edge(2, 3)
        comp = g.complement()
        assert comp.has_edge(0, 2)
        assert comp.has_edge(0, 3)
        assert not comp.has_edge(0, 1)

    def test_to_directed(self):
        g = make_triangle()
        dg = g.to_directed()
        assert dg.is_directed()
        assert dg.has_edge(0, 1)
        assert dg.has_edge(1, 0)

    def test_size_weighted(self):
        g = Graph()
        g.add_edge(0, 1, weight=2.0)
        g.add_edge(1, 2, weight=3.0)
        assert g.size(weight="weight") == 5.0

    def test_to_dict(self):
        g = make_triangle()
        d = g.to_dict()
        assert d["directed"] is False
        assert len(d["nodes"]) == 3
        assert len(d["edges"]) == 3

    def test_repr(self):
        g = Graph(name="test")
        assert "Graph" in repr(g)
        assert "test" in repr(g)

    def test_eq_same(self):
        g1 = make_triangle()
        g2 = make_triangle()
        assert g1 == g2

    def test_ne_different(self):
        g1 = make_triangle()
        g2 = make_path(3)
        assert g1 != g2

    def test_adjacency_iter(self):
        g = make_path(3)
        adj = dict(g.adjacency())
        assert 1 in adj[0]
        assert 2 in adj[1]
