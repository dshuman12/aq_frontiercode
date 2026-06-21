"""Tests for graph partitioning."""

import pytest
from meridian import Graph
from meridian.generators.classic import complete_bipartite_graph, cycle_graph, path_graph
from meridian.partition import (
    balanced_partition,
    conductance,
    cut_size,
    kernighan_lin_bisection,
    normalized_cut,
    partition_imbalance,
    ratio_cut,
    recursive_bisection,
    spectral_bisection,
)


def make_two_cliques():
    g = Graph()
    for i in range(4):
        for j in range(i + 1, 4):
            g.add_edge(i, j)
    for i in range(4, 8):
        for j in range(i + 1, 8):
            g.add_edge(i, j)
    g.add_edge(3, 4)
    return g


class TestKernighanLin:
    def test_two_cliques_bisect(self):
        g = make_two_cliques()
        A, B = kernighan_lin_bisection(g, seed=0)
        assert len(A) + len(B) == g.number_of_nodes()
        assert len(A) > 0 and len(B) > 0

    def test_partition_covers_all_nodes(self):
        g = path_graph(8)
        A, B = kernighan_lin_bisection(g, seed=42)
        assert A | B == set(g.nodes)
        assert A & B == set()

    def test_path_balanced(self):
        g = path_graph(8)
        A, B = kernighan_lin_bisection(g, seed=0)
        assert abs(len(A) - len(B)) <= 2

    def test_single_node(self):
        g = Graph()
        g.add_node(0)
        A, B = kernighan_lin_bisection(g)
        assert len(A) + len(B) == 1

    def test_custom_partition(self):
        g = make_two_cliques()
        init_A = {0, 1, 2, 3}
        init_B = {4, 5, 6, 7}
        A, B = kernighan_lin_bisection(g, partition=(init_A, init_B), seed=0)
        assert A | B == set(g.nodes)


class TestSpectralBisection:
    def test_covers_all_nodes(self):
        g = path_graph(6)
        A, B = spectral_bisection(g, seed=0)
        assert A | B == set(g.nodes)
        assert A & B == set()

    def test_two_cliques(self):
        g = make_two_cliques()
        A, B = spectral_bisection(g, seed=0)
        assert len(A) > 0 and len(B) > 0


class TestRecursiveBisection:
    def test_two_parts(self):
        g = path_graph(8)
        parts = recursive_bisection(g, k=2, seed=0)
        all_nodes = set()
        for p in parts:
            all_nodes |= p
        assert all_nodes == set(g.nodes)

    def test_four_parts(self):
        g = path_graph(12)
        parts = recursive_bisection(g, k=4, seed=0)
        assert len(parts) >= 2
        all_nodes = set()
        for p in parts:
            all_nodes |= p
        assert all_nodes == set(g.nodes)

    def test_spectral_method(self):
        g = path_graph(8)
        parts = recursive_bisection(g, k=2, method="spectral", seed=0)
        all_nodes = set()
        for p in parts:
            all_nodes |= p
        assert all_nodes == set(g.nodes)

    def test_k1_returns_all(self):
        g = path_graph(4)
        parts = recursive_bisection(g, k=1)
        assert len(parts) == 1
        assert parts[0] == set(g.nodes)


class TestBalancedPartition:
    def test_two_parts(self):
        g = path_graph(6)
        parts = balanced_partition(g, k=2, seed=0)
        assert len(parts) == 2
        all_nodes = set()
        for p in parts:
            all_nodes |= p
        assert all_nodes == set(g.nodes)

    def test_three_parts(self):
        g = path_graph(9)
        parts = balanced_partition(g, k=3, seed=0)
        assert len(parts) <= 3
        all_nodes = set()
        for p in parts:
            all_nodes |= p
        assert all_nodes == set(g.nodes)

    def test_k_invalid(self):
        g = path_graph(4)
        with pytest.raises(ValueError):
            balanced_partition(g, k=0)


class TestPartitionMetrics:
    def test_cut_size_bridge(self):
        g = make_two_cliques()
        A = {0, 1, 2, 3}
        B = {4, 5, 6, 7}
        assert cut_size(g, A, B) == 1.0

    def test_cut_size_no_crossing(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_node(2)
        A = {0, 1}
        B = {2}
        assert cut_size(g, A, B) == 0.0

    def test_normalized_cut(self):
        g = make_two_cliques()
        A = {0, 1, 2, 3}
        nc = normalized_cut(g, A)
        assert 0.0 <= nc <= 2.0

    def test_ratio_cut(self):
        g = make_two_cliques()
        A = {0, 1, 2, 3}
        rc = ratio_cut(g, A)
        assert rc > 0.0

    def test_partition_imbalance_balanced(self):
        parts = [{0, 1, 2}, {3, 4, 5}]
        assert partition_imbalance(parts) == pytest.approx(0.0)

    def test_partition_imbalance_unbalanced(self):
        parts = [{0}, {1, 2, 3}]
        imb = partition_imbalance(parts)
        assert imb > 0.0

    def test_conductance(self):
        g = make_two_cliques()
        A = {0, 1, 2, 3}
        c = conductance(g, A)
        assert 0.0 <= c <= 1.0
