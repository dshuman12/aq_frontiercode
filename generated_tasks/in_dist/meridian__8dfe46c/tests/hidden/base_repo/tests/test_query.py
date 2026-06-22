"""Tests for the GraphQuery DSL."""

import pytest
from meridian import Graph
from meridian.generators.classic import complete_graph, path_graph, star_graph
from meridian.query import GraphQuery


def make_labeled():
    g = Graph()
    g.add_node(0, role="hub", weight=10)
    g.add_node(1, role="leaf", weight=3)
    g.add_node(2, role="leaf", weight=5)
    g.add_node(3, role="hub", weight=8)
    g.add_edge(0, 1, weight=1.0)
    g.add_edge(0, 2, weight=2.0)
    g.add_edge(0, 3, weight=0.5)
    g.add_edge(3, 1, weight=3.0)
    return g


class TestNodeQuery:
    def test_all_nodes(self):
        g = make_labeled()
        q = GraphQuery(g)
        result = q.nodes().all()
        assert set(result) == set(g.nodes)

    def test_with_attr_key(self):
        g = make_labeled()
        q = GraphQuery(g)
        hubs = q.nodes().with_attr("role").all()
        assert len(hubs) == 4  # all have role

    def test_with_attr_value(self):
        g = make_labeled()
        q = GraphQuery(g)
        hubs = q.nodes().with_attr("role", "hub").all()
        assert set(hubs) == {0, 3}

    def test_where_predicate(self):
        g = make_labeled()
        q = GraphQuery(g)
        heavy = q.nodes().where(lambda n, d: d.get("weight", 0) >= 8).all()
        assert set(heavy) == {0, 3}

    def test_with_degree(self):
        g = make_labeled()
        q = GraphQuery(g)
        high_deg = q.nodes().with_degree(min_deg=3).all()
        assert 0 in high_deg

    def test_limit(self):
        g = make_labeled()
        q = GraphQuery(g)
        result = q.nodes().limit(2).all()
        assert len(result) == 2

    def test_order_by_degree(self):
        g = make_labeled()
        q = GraphQuery(g)
        ordered = q.nodes().order_by_degree(reverse=True).all()
        # First node should have highest degree
        assert g.degree(ordered[0]) >= g.degree(ordered[-1])

    def test_connected_to(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_node(5)
        q = GraphQuery(g)
        result = q.nodes().connected_to(0).all()
        assert 5 not in result
        assert 2 in result

    def test_count(self):
        g = make_labeled()
        q = GraphQuery(g)
        assert q.nodes().count() == 4

    def test_exists(self):
        g = make_labeled()
        q = GraphQuery(g)
        assert q.nodes().with_attr("role", "hub").exists()
        assert not q.nodes().with_attr("role", "boss").exists()

    def test_first(self):
        g = make_labeled()
        q = GraphQuery(g)
        f = q.nodes().with_attr("role", "hub").first()
        assert f in {0, 3}

    def test_subgraph(self):
        g = make_labeled()
        q = GraphQuery(g)
        sub = q.nodes().with_attr("role", "hub").subgraph()
        assert sub.number_of_nodes() == 2

    def test_not_in(self):
        g = make_labeled()
        q = GraphQuery(g)
        result = q.nodes().not_in([0, 1]).all()
        assert 0 not in result and 1 not in result


class TestEdgeQuery:
    def test_all_edges(self):
        g = make_labeled()
        q = GraphQuery(g)
        edges = q.edges().all()
        assert len(edges) == 4

    def test_min_weight(self):
        g = make_labeled()
        q = GraphQuery(g)
        heavy = q.edges().min_weight(2.0).all()
        assert len(heavy) == 2

    def test_max_weight(self):
        g = make_labeled()
        q = GraphQuery(g)
        light = q.edges().max_weight(1.0).all()
        assert len(light) == 2

    def test_incident_to(self):
        g = make_labeled()
        q = GraphQuery(g)
        edges = q.edges().incident_to(0).all()
        assert all(e[0] == 0 or e[1] == 0 for e in edges)

    def test_order_by_weight(self):
        g = make_labeled()
        q = GraphQuery(g)
        edges = q.edges().order_by_weight(reverse=True).all()
        weights = [e[2].get("weight", 1.0) for e in edges]
        assert weights == sorted(weights, reverse=True)

    def test_count(self):
        g = make_labeled()
        q = GraphQuery(g)
        assert q.edges().count() == 4

    def test_first(self):
        g = make_labeled()
        q = GraphQuery(g)
        f = q.edges().first()
        assert f is not None and len(f) == 3


class TestPathQuery:
    def test_shortest_path(self):
        g = path_graph(5)
        q = GraphQuery(g)
        path = q.paths(0, 4).shortest()
        assert path[0] == 0 and path[-1] == 4

    def test_all_simple_paths_cutoff(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(0, 2)
        g.add_edge(1, 3)
        g.add_edge(2, 3)
        q = GraphQuery(g)
        paths = q.paths(0, 3).cutoff(3).all()
        assert len(paths) >= 2

    def test_path_count(self):
        g = path_graph(4)
        q = GraphQuery(g)
        assert q.paths(0, 3).count() == 1

    def test_shortest_length(self):
        g = Graph()
        g.add_weighted_edges_from([(0, 1, 2.0), (1, 2, 3.0)])
        q = GraphQuery(g)
        l = q.paths(0, 2).weighted().shortest_length()
        assert l == pytest.approx(5.0)


class TestNeighbourhoodQuery:
    def test_within_hops(self):
        g = path_graph(6)
        q = GraphQuery(g)
        nbrs = q.neighbourhood(0).within_hops(2).all()
        assert 1 in nbrs and 2 in nbrs and 5 not in nbrs

    def test_include_source(self):
        g = path_graph(4)
        q = GraphQuery(g)
        result = q.neighbourhood(0).within_hops(1).include_source().all()
        assert 0 in result
