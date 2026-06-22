"""Tests for shortest path algorithms."""

import math
import pytest
from meridian import DiGraph, Graph
from meridian.algorithms.shortest_path import (
    astar,
    bellman_ford,
    bellman_ford_path,
    dijkstra,
    dijkstra_path,
    dijkstra_path_length,
    floyd_warshall,
    floyd_warshall_predecessor_and_distance,
    has_path,
    reconstruct_path,
    single_source_dijkstra,
)
from meridian.exceptions import NegativeCycleError, NodeNotFound


def make_weighted():
    g = Graph()
    g.add_weighted_edges_from([(0, 1, 1), (1, 2, 2), (0, 2, 4), (2, 3, 1)])
    return g


def make_directed_weighted():
    g = DiGraph()
    g.add_weighted_edges_from([(0, 1, 1), (0, 2, 4), (1, 2, 2), (2, 3, 1)])
    return g


class TestDijkstra:
    def test_single_source_all_nodes(self):
        g = make_weighted()
        dist, paths = dijkstra(g, 0)
        assert dist[0] == 0.0
        assert dist[1] == 1.0
        assert dist[2] == 3.0
        assert dist[3] == 4.0

    def test_path_via_shorter_intermediate(self):
        g = make_weighted()
        _, paths = dijkstra(g, 0)
        assert paths[2] == [0, 1, 2]  # 0→1→2 costs 3, 0→2 costs 4

    def test_target_early_stop(self):
        g = make_weighted()
        dist, path = dijkstra(g, 0, target=3)
        assert dist == 4.0
        assert path == [0, 1, 2, 3]

    def test_unit_weight_default(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        dist, _ = dijkstra(g, 0)
        assert dist[2] == 2.0

    def test_path_length(self):
        g = make_weighted()
        assert dijkstra_path_length(g, 0, 3) == 4.0

    def test_dijkstra_path(self):
        g = make_directed_weighted()
        path = dijkstra_path(g, 0, 3)
        assert path[0] == 0 and path[-1] == 3

    def test_no_path_raises(self):
        g = Graph()
        g.add_node(0)
        g.add_node(5)
        with pytest.raises(ValueError):
            dijkstra(g, 0, target=5)

    def test_missing_source_raises(self):
        g = Graph()
        with pytest.raises(NodeNotFound):
            dijkstra(g, 99)

    def test_single_source_with_cutoff(self):
        g = make_weighted()
        dist, _ = single_source_dijkstra(g, 0, cutoff=2.0)
        assert 1 in dist
        assert 3 not in dist  # dist[3] = 4.0 > cutoff


class TestBellmanFord:
    def test_positive_weights(self):
        g = make_directed_weighted()
        dist, pred = bellman_ford(g, 0)
        assert dist[3] == 4.0

    def test_negative_weights(self):
        g = DiGraph()
        g.add_weighted_edges_from([(0, 1, 5), (0, 2, 4), (1, 3, 3), (2, 1, -4), (3, 2, -1)])
        dist, _ = bellman_ford(g, 0)
        assert dist[1] == 0.0  # 0→2→1 costs 0

    def test_negative_cycle_raises(self):
        g = DiGraph()
        g.add_weighted_edges_from([(0, 1, 1), (1, 2, -2), (2, 0, -1)])
        with pytest.raises(NegativeCycleError):
            bellman_ford(g, 0)

    def test_path_reconstruction(self):
        g = make_directed_weighted()
        path = bellman_ford_path(g, 0, 3)
        assert path[0] == 0 and path[-1] == 3


class TestFloydWarshall:
    def test_all_pairs(self):
        g = make_weighted()
        dist = floyd_warshall(g)
        assert dist[0][3] == 4.0
        assert dist[3][0] == 4.0  # undirected

    def test_directed(self):
        g = make_directed_weighted()
        dist = floyd_warshall(g)
        assert dist[0][3] == 4.0

    def test_disconnected(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_node(5)
        dist = floyd_warshall(g)
        assert dist[0][5] == math.inf

    def test_self_distance_zero(self):
        g = make_weighted()
        dist = floyd_warshall(g)
        for v in g:
            assert dist[v][v] == 0.0

    def test_predecessor_reconstruct(self):
        g = make_directed_weighted()
        pred, dist = floyd_warshall_predecessor_and_distance(g)
        path = reconstruct_path(0, 3, pred)
        assert path[0] == 0 and path[-1] == 3
        assert len(path) >= 2


class TestAStar:
    def test_finds_shortest_path(self):
        g = make_weighted()
        dist, path = astar(g, 0, 3)
        assert dist == 4.0
        assert path[0] == 0 and path[-1] == 3

    def test_with_heuristic(self):
        g = make_weighted()
        # Heuristic: always 0 (admissible)
        dist, path = astar(g, 0, 3, heuristic=lambda u, v: 0)
        assert dist == 4.0

    def test_no_path_raises(self):
        g = Graph()
        g.add_node(0)
        g.add_node(1)
        with pytest.raises(ValueError):
            astar(g, 0, 1)

    def test_same_source_target(self):
        g = make_weighted()
        dist, path = astar(g, 2, 2)
        assert dist == 0.0
        assert path == [2]


class TestHasPath:
    def test_connected(self):
        g = make_weighted()
        assert has_path(g, 0, 3) is True

    def test_disconnected(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_node(5)
        assert has_path(g, 0, 5) is False

    def test_same_node(self):
        g = make_weighted()
        assert has_path(g, 0, 0) is True
