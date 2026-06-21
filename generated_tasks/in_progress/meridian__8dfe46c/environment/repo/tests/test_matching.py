"""Tests for matching algorithms."""

import pytest
from meridian import Graph
from meridian.algorithms.matching import (
    hopcroft_karp,
    is_independent_set,
    is_perfect_matching,
    matching_weight,
    maximal_independent_set,
    maximum_matching,
)
from meridian.generators.classic import complete_bipartite_graph, path_graph


class TestHopcroftKarp:
    def test_complete_bipartite_perfect(self):
        g = complete_bipartite_graph(3, 3)
        from meridian.analysis.bipartite import bipartite_sets
        top, _ = bipartite_sets(g)
        matching = hopcroft_karp(g, top_nodes=top)
        assert len(matching) == 6  # 3 pairs × 2

    def test_path_bipartite(self):
        g = path_graph(4)
        from meridian.analysis.bipartite import bipartite_sets
        top, _ = bipartite_sets(g)
        matching = hopcroft_karp(g, top_nodes=top)
        assert len(matching) >= 2  # at least 1 pair

    def test_matching_symmetric(self):
        g = complete_bipartite_graph(2, 2)
        from meridian.analysis.bipartite import bipartite_sets
        top, _ = bipartite_sets(g)
        matching = hopcroft_karp(g, top_nodes=top)
        for u, v in matching.items():
            assert matching[v] == u


class TestMaximumMatching:
    def test_path_matching(self):
        g = path_graph(6)
        m = maximum_matching(g)
        assert len(m) >= 2  # at least 1 pair each direction

    def test_symmetric(self):
        g = path_graph(4)
        m = maximum_matching(g)
        for u, v in m.items():
            assert m.get(v) == u

    def test_no_adjacent_matched(self):
        g = path_graph(6)
        m = maximum_matching(g)
        matched_pairs = set()
        for u, v in m.items():
            if frozenset({u, v}) not in matched_pairs:
                matched_pairs.add(frozenset({u, v}))
        # No two edges in matching share a node
        matched_nodes = [n for pair in matched_pairs for n in pair]
        assert len(matched_nodes) == len(set(matched_nodes))


class TestMatchingHelpers:
    def test_is_perfect_matching(self):
        g = complete_bipartite_graph(2, 2)
        m = {0: 2, 2: 0, 1: 3, 3: 1}
        assert is_perfect_matching(g, m) is True

    def test_not_perfect_matching(self):
        g = path_graph(4)
        m = {0: 1, 1: 0}
        assert is_perfect_matching(g, m) is False

    def test_matching_weight(self):
        g = Graph()
        g.add_edge(0, 1, weight=3.0)
        g.add_edge(2, 3, weight=2.0)
        m = {0: 1, 1: 0, 2: 3, 3: 2}
        w = matching_weight(g, m)
        assert w == pytest.approx(5.0)


class TestIndependentSet:
    def test_maximal_independent_set(self):
        g = path_graph(6)
        ind = maximal_independent_set(g, seed=0)
        assert is_independent_set(g, ind)

    def test_all_nodes_covered(self):
        g = path_graph(6)
        ind = maximal_independent_set(g, seed=0)
        covered = set(ind)
        for v in g:
            if v not in covered:
                assert any(g.has_edge(v, u) for u in ind)

    def test_is_independent_set_true(self):
        g = path_graph(4)
        assert is_independent_set(g, [0, 2]) is True

    def test_is_independent_set_false(self):
        g = path_graph(4)
        assert is_independent_set(g, [0, 1]) is False
