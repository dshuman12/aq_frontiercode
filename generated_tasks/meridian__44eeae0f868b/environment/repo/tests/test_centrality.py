"""Tests for centrality algorithms."""

import pytest
from meridian import DiGraph, Graph
from meridian.algorithms.centrality import (
    betweenness_centrality,
    closeness_centrality,
    degree_centrality,
    eigenvector_centrality,
    harmonic_centrality,
    in_degree_centrality,
    katz_centrality,
    load_centrality,
    out_degree_centrality,
    pagerank,
)


def make_star(n_leaves=4):
    g = Graph()
    for i in range(1, n_leaves + 1):
        g.add_edge(0, i)
    return g


def make_path(n):
    g = Graph()
    for i in range(n - 1):
        g.add_edge(i, i + 1)
    return g


def make_complete(n):
    from meridian.generators.classic import complete_graph
    return complete_graph(n)


class TestDegreeCentrality:
    def test_star_hub(self):
        g = make_star(4)
        dc = degree_centrality(g)
        assert dc[0] == pytest.approx(1.0)

    def test_star_leaf(self):
        g = make_star(4)
        dc = degree_centrality(g)
        assert dc[1] == pytest.approx(0.25)

    def test_complete_graph_uniform(self):
        g = make_complete(4)
        dc = degree_centrality(g)
        vals = list(dc.values())
        assert all(abs(v - vals[0]) < 1e-9 for v in vals)

    def test_single_node(self):
        g = Graph()
        g.add_node(0)
        dc = degree_centrality(g)
        assert dc[0] == 0.0

    def test_in_out_centrality_directed(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(0, 2)
        g.add_edge(1, 2)
        in_c = in_degree_centrality(g)
        out_c = out_degree_centrality(g)
        assert in_c[0] == pytest.approx(0.0)
        assert out_c[0] == pytest.approx(1.0)


class TestBetweenness:
    def test_path_centre(self):
        g = make_path(5)
        bc = betweenness_centrality(g)
        # Centre node (2) should have highest betweenness
        assert bc[2] == max(bc.values())

    def test_path_endpoints_zero(self):
        g = make_path(5)
        bc = betweenness_centrality(g)
        assert bc[0] == pytest.approx(0.0)
        assert bc[4] == pytest.approx(0.0)

    def test_star_hub_max(self):
        g = make_star(5)
        bc = betweenness_centrality(g)
        assert bc[0] == max(bc.values())

    def test_complete_graph_uniform(self):
        g = make_complete(4)
        bc = betweenness_centrality(g)
        vals = list(bc.values())
        assert max(vals) - min(vals) < 1e-9

    def test_unnormalized(self):
        g = make_path(4)
        bc_norm = betweenness_centrality(g, normalized=True)
        bc_raw = betweenness_centrality(g, normalized=False)
        for v in g:
            assert bc_norm[v] <= bc_raw[v] + 1e-9 or bc_norm[v] >= bc_raw[v] - 1e-9


class TestCloseness:
    def test_star_hub_max(self):
        g = make_star(4)
        cc = closeness_centrality(g)
        assert cc[0] == max(cc.values())

    def test_path_centre_max(self):
        g = make_path(5)
        cc = closeness_centrality(g)
        assert cc[2] == max(cc.values())

    def test_complete_graph_uniform(self):
        g = make_complete(5)
        cc = closeness_centrality(g)
        vals = list(cc.values())
        assert max(vals) - min(vals) < 1e-9


class TestPageRank:
    def test_sums_to_one(self):
        g = make_star(4)
        pr = pagerank(g)
        assert abs(sum(pr.values()) - 1.0) < 1e-6

    def test_hub_gets_more_rank(self):
        g = DiGraph()
        g.add_edge(1, 0)
        g.add_edge(2, 0)
        g.add_edge(3, 0)
        pr = pagerank(g)
        assert pr[0] == max(pr.values())

    def test_empty_graph(self):
        g = Graph()
        assert pagerank(g) == {}

    def test_cycle_uniform(self):
        from meridian.generators.classic import cycle_graph
        g = cycle_graph(4).to_directed()
        pr = pagerank(g)
        vals = list(pr.values())
        assert max(vals) - min(vals) < 1e-4


class TestEigenvectorCentrality:
    def test_star_hub(self):
        g = make_star(4)
        ec = eigenvector_centrality(g)
        assert ec[0] == max(ec.values())

    def test_all_positive(self):
        g = make_path(5)
        ec = eigenvector_centrality(g)
        assert all(v >= 0 for v in ec.values())


class TestKatzCentrality:
    def test_star_hub(self):
        g = make_star(4)
        kc = katz_centrality(g, alpha=0.1)
        assert kc[0] == max(kc.values())

    def test_all_positive(self):
        g = make_path(5)
        kc = katz_centrality(g, alpha=0.1)
        assert all(v > 0 for v in kc.values())


class TestHarmonicCentrality:
    def test_hub_max(self):
        g = make_star(4)
        hc = harmonic_centrality(g)
        assert hc[0] == max(hc.values())

    def test_non_negative(self):
        g = make_path(5)
        hc = harmonic_centrality(g)
        assert all(v >= 0 for v in hc.values())
