"""Tests for MultiGraph and MultiDiGraph."""

import pytest
from meridian.multigraph import MultiDiGraph, MultiGraph
from meridian.exceptions import AmbiguousKeyError, EdgeNotFound, NodeNotFound


class TestMultiGraph:
    def test_add_parallel_edges(self):
        g = MultiGraph()
        k1 = g.add_edge(0, 1, weight=1.0)
        k2 = g.add_edge(0, 1, weight=2.0)
        assert k1 != k2
        assert g.number_of_edges(0, 1) == 2

    def test_has_edge_any_key(self):
        g = MultiGraph()
        g.add_edge(0, 1)
        assert g.has_edge(0, 1)
        assert g.has_edge(1, 0)

    def test_has_edge_specific_key(self):
        g = MultiGraph()
        k = g.add_edge(0, 1)
        assert g.has_edge(0, 1, key=k)
        assert not g.has_edge(0, 1, key=99)

    def test_remove_edge_with_key(self):
        g = MultiGraph()
        k = g.add_edge(0, 1)
        g.remove_edge(0, 1, key=k)
        assert not g.has_edge(0, 1)

    def test_remove_edge_ambiguous_raises(self):
        g = MultiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 1)
        with pytest.raises(AmbiguousKeyError):
            g.remove_edge(0, 1)

    def test_edges_between(self):
        g = MultiGraph()
        g.add_edge(0, 1, label="a")
        g.add_edge(0, 1, label="b")
        eb = g.edges_between(0, 1)
        assert len(eb) == 2

    def test_degree_counts_parallel(self):
        g = MultiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 1)
        assert g.degree(0) == 2

    def test_is_multigraph(self):
        g = MultiGraph()
        assert g.is_multigraph()

    def test_not_directed(self):
        g = MultiGraph()
        assert not g.is_directed()

    def test_subgraph(self):
        g = MultiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        sub = g.subgraph([0, 1])
        assert sub.number_of_nodes() == 2
        assert sub.number_of_edges() == 2

    def test_to_simple_graph(self):
        g = MultiGraph()
        g.add_edge(0, 1, weight=1.0)
        g.add_edge(0, 1, weight=2.0)
        g.add_edge(1, 2)
        simple = g.to_simple_graph()
        assert not simple.is_multigraph()
        assert simple.number_of_edges(0, 1) == 1

    def test_total_edge_count(self):
        g = MultiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        assert g.number_of_edges() == 3


class TestMultiDiGraph:
    def test_directed(self):
        g = MultiDiGraph()
        assert g.is_directed()

    def test_parallel_directed_edges(self):
        g = MultiDiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 1)
        assert g.number_of_edges(0, 1) == 2
        assert g.number_of_edges(1, 0) == 0

    def test_reverse(self):
        g = MultiDiGraph()
        k = g.add_edge(0, 1, weight=5)
        rev = g.reverse()
        assert rev.has_edge(1, 0)
        assert not rev.has_edge(0, 1)

    def test_predecessors_successors(self):
        g = MultiDiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 1)
        g.add_edge(2, 1)
        assert list(g.predecessors(1)) == sorted([0, 2], key=str) or \
               set(g.predecessors(1)) == {0, 2}

    def test_remove_edge_by_key(self):
        g = MultiDiGraph()
        k = g.add_edge(0, 1)
        g.remove_edge(0, 1, key=k)
        assert not g.has_edge(0, 1)
