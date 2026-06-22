"""Tests for traversal algorithms."""

import pytest
from meridian import DiGraph, Graph
from meridian.algorithms.traverse import (
    all_topological_sorts,
    bfs,
    bfs_edges,
    bfs_predecessors,
    bfs_tree,
    dfs,
    dfs_edges,
    dfs_tree,
    descendants_at_distance,
    find_cycle,
    has_cycle,
    is_dag,
    topological_generations,
    topological_sort,
)
from meridian.exceptions import HasACycle, NodeNotFound


def make_path(n):
    g = Graph()
    for i in range(n - 1):
        g.add_edge(i, i + 1)
    return g


def make_directed_path(n):
    g = DiGraph()
    for i in range(n - 1):
        g.add_edge(i, i + 1)
    return g


class TestBFS:
    def test_bfs_path_order(self):
        g = make_path(5)
        result = bfs(g, 0)
        assert result[0] == 0

    def test_bfs_all_nodes_reachable(self):
        g = make_path(5)
        result = bfs(g, 0)
        assert set(result) == {0, 1, 2, 3, 4}

    def test_bfs_depth_limit(self):
        g = make_path(6)
        result = bfs(g, 0, depth_limit=2)
        assert 0 in result and 1 in result and 2 in result
        assert 5 not in result

    def test_bfs_disconnected(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_node(5)
        result = set(bfs(g, 0))
        assert 5 not in result

    def test_bfs_invalid_source(self):
        g = make_path(3)
        with pytest.raises(NodeNotFound):
            bfs(g, 99)

    def test_bfs_edges(self):
        g = make_path(4)
        edges = list(bfs_edges(g, 0))
        assert len(edges) == 3
        parents = {v: u for u, v in edges}
        assert parents[1] == 0
        assert parents[2] == 1

    def test_bfs_tree(self):
        g = make_path(4)
        T = bfs_tree(g, 0)
        assert T.is_directed()
        assert T.number_of_nodes() == 4
        assert T.number_of_edges() == 3

    def test_bfs_predecessors(self):
        g = make_path(4)
        pred = bfs_predecessors(g, 0)
        assert pred[1] == 0
        assert pred[2] == 1

    def test_descendants_at_distance(self):
        g = make_path(5)
        d2 = descendants_at_distance(g, 0, 2)
        assert 2 in d2
        assert 0 not in d2
        assert 1 not in d2


class TestDFS:
    def test_dfs_visits_all_reachable(self):
        g = make_path(5)
        result = dfs(g, 0)
        assert set(result) == {0, 1, 2, 3, 4}

    def test_dfs_depth_limit(self):
        g = make_path(6)
        result = dfs(g, 0, depth_limit=2)
        assert 5 not in result

    def test_dfs_edges(self):
        g = make_path(4)
        edges = list(dfs_edges(g, 0))
        assert len(edges) == 3

    def test_dfs_tree_is_directed(self):
        g = make_path(4)
        T = dfs_tree(g, 0)
        assert T.is_directed()
        assert T.number_of_nodes() == 4

    def test_dfs_directed_graph(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 2)
        g.add_edge(1, 3)
        result = dfs(g, 0)
        assert set(result) == {0, 1, 2, 3}


class TestTopologicalSort:
    def test_simple_dag(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        order = list(topological_sort(g))
        assert order.index(0) < order.index(1) < order.index(2)

    def test_cycle_raises(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        with pytest.raises(HasACycle):
            list(topological_sort(g))

    def test_undirected_raises(self):
        g = Graph()
        g.add_edge(0, 1)
        with pytest.raises(TypeError):
            list(topological_sort(g))

    def test_complete_coverage(self):
        g = DiGraph()
        for i in range(5):
            g.add_node(i)
        g.add_edge(0, 2)
        g.add_edge(1, 2)
        g.add_edge(2, 3)
        g.add_edge(2, 4)
        order = list(topological_sort(g))
        assert set(order) == {0, 1, 2, 3, 4}
        assert order.index(2) > order.index(0)
        assert order.index(2) > order.index(1)

    def test_is_dag_true(self):
        g = make_directed_path(4)
        assert is_dag(g) is True

    def test_is_dag_false_cycle(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 0)
        assert is_dag(g) is False

    def test_topological_generations(self):
        g = DiGraph()
        g.add_edge(0, 2)
        g.add_edge(1, 2)
        g.add_edge(2, 3)
        gens = list(topological_generations(g))
        assert {0, 1} <= set(gens[0])
        assert 2 in gens[1]
        assert 3 in gens[2]

    def test_all_topological_sorts_path(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        sorts = list(all_topological_sorts(g))
        assert len(sorts) == 1
        assert sorts[0] == [0, 1, 2]

    def test_all_topological_sorts_diamond(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 2)
        g.add_edge(1, 3)
        g.add_edge(2, 3)
        sorts = list(all_topological_sorts(g))
        assert len(sorts) == 2
        for s in sorts:
            assert s[0] == 0 and s[-1] == 3


class TestCycleDetection:
    def test_has_cycle_false(self):
        g = make_path(5)
        assert has_cycle(g) is False

    def test_has_cycle_true(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        assert has_cycle(g) is True

    def test_has_cycle_directed_dag(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        assert has_cycle(g) is False

    def test_has_cycle_directed_cycle(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        assert has_cycle(g) is True

    def test_find_cycle_directed(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        cycle = find_cycle(g)
        assert len(cycle) > 0
