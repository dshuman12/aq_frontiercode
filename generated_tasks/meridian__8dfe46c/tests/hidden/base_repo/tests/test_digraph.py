"""Tests for DiGraph."""

import pytest
from meridian import DiGraph
from meridian.exceptions import EdgeNotFound, NodeNotFound


def make_dag():
    g = DiGraph()
    g.add_edge(0, 1)
    g.add_edge(0, 2)
    g.add_edge(1, 3)
    g.add_edge(2, 3)
    return g


class TestDiGraphBasics:
    def test_is_directed(self):
        assert DiGraph().is_directed()

    def test_add_edge_one_direction(self):
        g = DiGraph()
        g.add_edge("a", "b")
        assert g.has_edge("a", "b")
        assert not g.has_edge("b", "a")

    def test_successors(self):
        g = make_dag()
        assert set(g.successors(0)) == {1, 2}
        assert set(g.successors(3)) == set()

    def test_predecessors(self):
        g = make_dag()
        assert set(g.predecessors(3)) == {1, 2}
        assert set(g.predecessors(0)) == set()

    def test_in_degree(self):
        g = make_dag()
        assert g.in_degree(0) == 0
        assert g.in_degree(3) == 2

    def test_out_degree(self):
        g = make_dag()
        assert g.out_degree(0) == 2
        assert g.out_degree(3) == 0

    def test_degree_sum(self):
        g = make_dag()
        assert g.degree(3) == g.in_degree(3) + g.out_degree(3)

    def test_number_of_edges_directed(self):
        g = make_dag()
        assert g.number_of_edges() == 4

    def test_remove_edge_directed(self):
        g = DiGraph()
        g.add_edge(1, 2)
        g.remove_edge(1, 2)
        assert not g.has_edge(1, 2)
        assert g.has_node(1) and g.has_node(2)

    def test_remove_node_cleans_edges(self):
        g = make_dag()
        g.remove_node(1)
        assert not g.has_node(1)
        assert not g.has_edge(0, 1)
        assert not g.has_edge(1, 3)
        assert g.has_edge(0, 2)

    def test_reverse(self):
        g = make_dag()
        rev = g.reverse()
        assert rev.has_edge(1, 0)
        assert rev.has_edge(2, 0)
        assert rev.has_edge(3, 1)

    def test_to_undirected(self):
        g = DiGraph()
        g.add_edge(1, 2)
        ug = g.to_undirected()
        assert not ug.is_directed()
        assert ug.has_edge(1, 2)
        assert ug.has_edge(2, 1)

    def test_subgraph(self):
        g = make_dag()
        sub = g.subgraph([0, 1, 3])
        assert sub.has_edge(0, 1)
        assert sub.has_edge(1, 3)
        assert not sub.has_edge(0, 2)

    def test_is_dag_true(self):
        g = make_dag()
        assert g.is_dag()

    def test_is_dag_false(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        assert not g.is_dag()

    def test_edges_view(self):
        g = make_dag()
        edges = list(g.edges)
        assert len(edges) == 4

    def test_in_edges(self):
        g = make_dag()
        in_e = list(g.in_edges)
        assert len(in_e) == 4

    def test_copy(self):
        g = make_dag()
        g2 = g.copy()
        g2.add_edge(5, 6)
        assert not g.has_node(5)

    def test_to_dict(self):
        g = make_dag()
        d = g.to_dict()
        assert d["directed"] is True
        assert len(d["edges"]) == 4

    def test_edge_weight(self):
        g = DiGraph()
        g.add_edge("a", "b", weight=2.5)
        assert g.get_edge_data("a", "b")["weight"] == 2.5

    def test_weighted_out_degree(self):
        g = DiGraph()
        g.add_edge(0, 1, weight=3.0)
        g.add_edge(0, 2, weight=2.0)
        assert g.out_degree(0, weight="weight") == 5.0
