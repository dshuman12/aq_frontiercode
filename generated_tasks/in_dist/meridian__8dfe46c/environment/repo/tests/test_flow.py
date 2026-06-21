"""Tests for max-flow algorithms."""

import pytest
from meridian import DiGraph, Graph
from meridian.algorithms.flow import (
    edmonds_karp,
    ford_fulkerson,
    max_flow,
    minimum_cut,
    minimum_cut_value,
)
from meridian.exceptions import NodeNotFound


def make_flow_network():
    g = DiGraph()
    edges = [
        (0, 1, 16), (0, 2, 13), (1, 2, 10), (1, 3, 12),
        (2, 1, 4), (2, 4, 14), (3, 2, 9), (3, 5, 20),
        (4, 3, 7), (4, 5, 4)
    ]
    for u, v, c in edges:
        g.add_edge(u, v, capacity=float(c))
    return g


class TestEdmondsKarp:
    def test_max_flow_value(self):
        g = make_flow_network()
        value, _ = edmonds_karp(g, 0, 5)
        assert value == pytest.approx(23.0)

    def test_flow_dict_non_negative(self):
        g = make_flow_network()
        _, flow = edmonds_karp(g, 0, 5)
        for u in flow:
            for v, f in flow[u].items():
                assert f >= 0

    def test_conservation(self):
        g = make_flow_network()
        value, flow = edmonds_karp(g, 0, 5)
        for v in g:
            if v in (0, 5):
                continue
            in_flow = sum(flow.get(u, {}).get(v, 0) for u in g)
            out_flow = sum(flow.get(v, {}).get(w, 0) for w in g)
            assert abs(in_flow - out_flow) < 1e-9

    def test_missing_source(self):
        g = DiGraph()
        with pytest.raises(NodeNotFound):
            edmonds_karp(g, 0, 1)


class TestFordFulkerson:
    def test_max_flow_matches(self):
        g = make_flow_network()
        ek_val, _ = edmonds_karp(g, 0, 5)
        ff_val, _ = ford_fulkerson(g, 0, 5)
        assert abs(ek_val - ff_val) < 1e-9

    def test_with_cutoff(self):
        g = make_flow_network()
        # Ford-Fulkerson stops when cumulative flow >= cutoff; may overshoot by one path
        ff_val, _ = ford_fulkerson(g, 0, 5, cutoff=10.0)
        assert ff_val <= 23.0 + 1e-9  # at most the full max-flow


class TestMaxFlow:
    def test_edmonds_karp_method(self):
        g = make_flow_network()
        assert max_flow(g, 0, 5) == pytest.approx(23.0)

    def test_ford_fulkerson_method(self):
        g = make_flow_network()
        assert max_flow(g, 0, 5, method="ford_fulkerson") == pytest.approx(23.0)

    def test_unknown_method_raises(self):
        g = make_flow_network()
        with pytest.raises(ValueError):
            max_flow(g, 0, 5, method="fancy")


class TestMinCut:
    def test_min_cut_value(self):
        g = make_flow_network()
        val = minimum_cut_value(g, 0, 5)
        assert val == pytest.approx(23.0)

    def test_min_cut_partition(self):
        g = make_flow_network()
        val, (reachable, non_reachable) = minimum_cut(g, 0, 5)
        assert 0 in reachable
        assert 5 in non_reachable
        assert val > 0

    def test_simple_cut(self):
        g = DiGraph()
        g.add_edge(0, 1, capacity=3.0)
        g.add_edge(1, 2, capacity=5.0)
        val = minimum_cut_value(g, 0, 2)
        assert val == pytest.approx(3.0)
