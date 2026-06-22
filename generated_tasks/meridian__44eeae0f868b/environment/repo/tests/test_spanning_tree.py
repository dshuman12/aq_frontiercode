"""Tests for spanning tree algorithms."""

import pytest
from meridian import Graph
from meridian.algorithms.spanning_tree import (
    is_spanning_tree,
    kruskal_mst,
    maximum_spanning_tree,
    minimum_spanning_edges,
    minimum_spanning_tree,
    prim_mst,
    spanning_tree_weight,
)


def make_weighted_graph():
    g = Graph()
    g.add_weighted_edges_from([
        (0, 1, 4), (0, 2, 3), (1, 2, 1), (1, 3, 2),
        (2, 3, 4), (3, 4, 2), (4, 5, 6), (3, 5, 5)
    ])
    return g


class TestKruskal:
    def test_mst_weight(self):
        g = make_weighted_graph()
        mst_edges = list(kruskal_mst(g))
        total = sum(d.get("weight", 1) for _, _, d in mst_edges)
        assert total == 14  # 1+2+3+2+6 or similar optimal

    def test_mst_edge_count(self):
        g = make_weighted_graph()
        mst_edges = list(kruskal_mst(g))
        assert len(mst_edges) == g.number_of_nodes() - 1

    def test_mst_max(self):
        g = make_weighted_graph()
        max_edges = list(kruskal_mst(g, maximum=True))
        max_w = sum(d.get("weight", 1) for _, _, d in max_edges)
        min_w = sum(d.get("weight", 1) for _, _, d in kruskal_mst(g))
        assert max_w >= min_w

    def test_directed_raises(self):
        from meridian import DiGraph
        g = DiGraph()
        g.add_edge(0, 1)
        with pytest.raises(TypeError):
            list(kruskal_mst(g))


class TestPrim:
    def test_mst_weight_equals_kruskal(self):
        g = make_weighted_graph()
        prim_w = sum(d.get("weight", 1) for _, _, d in prim_mst(g))
        kruskal_w = sum(d.get("weight", 1) for _, _, d in kruskal_mst(g))
        assert prim_w == kruskal_w

    def test_edge_count(self):
        g = make_weighted_graph()
        edges = list(prim_mst(g))
        assert len(edges) == g.number_of_nodes() - 1


class TestMSTGraph:
    def test_minimum_spanning_tree_is_tree(self):
        g = make_weighted_graph()
        mst = minimum_spanning_tree(g)
        assert is_spanning_tree(g, mst)

    def test_maximum_spanning_tree_is_tree(self):
        g = make_weighted_graph()
        mst = maximum_spanning_tree(g)
        assert is_spanning_tree(g, mst)

    def test_mst_prim_algorithm(self):
        g = make_weighted_graph()
        mst = minimum_spanning_tree(g, algorithm="prim")
        assert is_spanning_tree(g, mst)

    def test_spanning_tree_weight(self):
        g = make_weighted_graph()
        mst = minimum_spanning_tree(g)
        w = spanning_tree_weight(mst)
        assert w > 0

    def test_minimum_spanning_edges(self):
        g = make_weighted_graph()
        edges = list(minimum_spanning_edges(g))
        assert len(edges) == g.number_of_nodes() - 1

    def test_unknown_algorithm_raises(self):
        g = make_weighted_graph()
        with pytest.raises(ValueError):
            minimum_spanning_tree(g, algorithm="boruvka")
