"""Tests for community detection."""

import pytest
from meridian import Graph
from meridian.algorithms.community import (
    coverage,
    girvan_newman,
    k_clique_communities,
    label_propagation_communities,
    louvain_communities,
    modularity,
    performance,
)
from meridian.generators.classic import complete_bipartite_graph, complete_graph


def make_two_cliques():
    g = Graph()
    for i in range(4):
        for j in range(i + 1, 4):
            g.add_edge(i, j)
    for i in range(4, 8):
        for j in range(i + 1, 8):
            g.add_edge(i, j)
    g.add_edge(3, 4)  # bridge
    return g


class TestModularity:
    def test_perfect_partition(self):
        g = make_two_cliques()
        partition = [{0, 1, 2, 3}, {4, 5, 6, 7}]
        q = modularity(g, partition)
        assert q > 0

    def test_empty_graph(self):
        g = Graph()
        g.add_nodes_from([0, 1])
        q = modularity(g, [{0}, {1}])
        assert q == 0.0

    def test_single_community(self):
        g = complete_graph(4)
        partition = [set(g.nodes)]
        q = modularity(g, partition)
        assert isinstance(q, float)


class TestLabelPropagation:
    def test_two_cliques(self):
        g = make_two_cliques()
        comms = label_propagation_communities(g, seed=42)
        assert len(comms) >= 1
        # All nodes should be in some community
        all_nodes = set()
        for c in comms:
            all_nodes |= c
        assert all_nodes == set(g.nodes)

    def test_complete_graph(self):
        g = complete_graph(5)
        comms = label_propagation_communities(g, seed=0)
        # Complete graph: may converge to 1 or a few communities
        total_nodes = sum(len(c) for c in comms)
        assert total_nodes == 5


class TestGirvanNewman:
    def test_yields_partitions(self):
        g = make_two_cliques()
        gen = girvan_newman(g)
        partition = next(gen)
        assert len(partition) >= 2

    def test_partitions_cover_all_nodes(self):
        g = complete_graph(4)
        gen = girvan_newman(g)
        partition = next(gen)
        all_nodes = set()
        for c in partition:
            all_nodes |= c
        assert all_nodes == set(g.nodes)


class TestLouvain:
    def test_returns_partition(self):
        g = make_two_cliques()
        comms = louvain_communities(g, seed=0)
        total = sum(len(c) for c in comms)
        assert total == g.number_of_nodes()

    def test_empty_graph(self):
        g = Graph()
        comms = louvain_communities(g)
        assert comms == []


class TestKCliqueComm:
    def test_two_cliques(self):
        g = make_two_cliques()
        comms = k_clique_communities(g, k=3)
        assert len(comms) == 2

    def test_invalid_k(self):
        g = complete_graph(4)
        with pytest.raises(ValueError):
            k_clique_communities(g, k=1)


class TestCoveragePerformance:
    def test_coverage_perfect_partition(self):
        g = make_two_cliques()
        partition = [{0, 1, 2, 3}, {4, 5, 6, 7}]
        c = coverage(g, partition)
        assert 0.0 <= c <= 1.0
        assert c > 0.5

    def test_performance_complete(self):
        g = complete_graph(4)
        partition = [set(g.nodes)]
        p = performance(g, partition)
        assert 0.0 <= p <= 1.0
