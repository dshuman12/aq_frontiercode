"""Integration tests exercising end-to-end graph workflows."""

import pytest
from meridian import DiGraph, Graph
from meridian.algorithms.centrality import betweenness_centrality, pagerank
from meridian.algorithms.community import louvain_communities, modularity
from meridian.algorithms.components import connected_components, is_connected
from meridian.algorithms.shortest_path import dijkstra, floyd_warshall
from meridian.algorithms.spanning_tree import minimum_spanning_tree
from meridian.algorithms.traverse import bfs, topological_sort
from meridian.generators.classic import complete_graph
from meridian.generators.random import barabasi_albert_graph, erdos_renyi_graph
from meridian.io.json_io import from_json, to_json
from meridian.metrics import average_clustering, density, diameter
from meridian.query import GraphQuery


class TestSocialNetwork:
    """Simulate a small social network analysis pipeline."""

    def setup_method(self):
        self.g = Graph(name="social")
        edges = [
            ("alice", "bob"), ("alice", "carol"), ("bob", "carol"),
            ("carol", "dave"), ("dave", "eve"), ("eve", "frank"),
            ("frank", "dave"), ("alice", "grace"), ("grace", "henry"),
        ]
        for u, v in edges:
            self.g.add_edge(u, v)

    def test_connectivity(self):
        assert is_connected(self.g)

    def test_bfs_from_alice(self):
        nodes = bfs(self.g, "alice")
        assert set(nodes) == set(self.g.nodes)

    def test_betweenness_centrality(self):
        bc = betweenness_centrality(self.g)
        assert "carol" in bc
        # carol connects two clusters
        assert bc["carol"] >= bc["alice"]

    def test_shortest_paths(self):
        dist, paths = dijkstra(self.g, "alice")
        assert "henry" in dist
        assert dist["henry"] == 2.0

    def test_communities(self):
        comms = louvain_communities(self.g, seed=42)
        total = sum(len(c) for c in comms)
        assert total == self.g.number_of_nodes()

    def test_json_roundtrip(self):
        s = to_json(self.g)
        g2 = from_json(s)
        assert g2.number_of_nodes() == self.g.number_of_nodes()
        assert g2.number_of_edges() == self.g.number_of_edges()

    def test_query_high_degree(self):
        q = GraphQuery(self.g)
        hd = q.nodes().with_degree(min_deg=3).all()
        assert all(self.g.degree(v) >= 3 for v in hd)


class TestDAGWorkflow:
    """Simulate a dependency/workflow DAG analysis."""

    def setup_method(self):
        self.g = DiGraph(name="workflow")
        # Build a diamond-like DAG
        self.g.add_edge("start", "task_a")
        self.g.add_edge("start", "task_b")
        self.g.add_edge("task_a", "task_c")
        self.g.add_edge("task_b", "task_c")
        self.g.add_edge("task_a", "task_d")
        self.g.add_edge("task_c", "end")
        self.g.add_edge("task_d", "end")

    def test_topological_order(self):
        order = list(topological_sort(self.g))
        assert order.index("start") < order.index("task_a")
        assert order.index("task_c") < order.index("end")

    def test_all_paths_to_end(self):
        from meridian.analysis.paths import all_simple_paths
        paths = list(all_simple_paths(self.g, "start", "end"))
        assert len(paths) >= 2

    def test_critical_path_length(self):
        dist, path = dijkstra(self.g, "start", target="end")
        assert dist == 3.0  # hop count

    def test_pagerank_distinguishes_importance(self):
        pr = pagerank(self.g)
        # "end" should receive more rank
        assert pr["end"] > pr["start"]


class TestRandomGraphAnalysis:
    def test_erdos_renyi_properties(self):
        g = erdos_renyi_graph(30, 0.3, seed=0)
        d = density(g)
        assert 0.0 <= d <= 1.0
        comps = connected_components(g)
        assert len(comps) >= 1

    def test_barabasi_albert_scale_free(self):
        g = barabasi_albert_graph(50, 2, seed=0)
        degrees = sorted(g.degree().values(), reverse=True)
        # Scale-free: max degree >> average degree
        avg = sum(degrees) / len(degrees)
        assert degrees[0] > avg * 2

    def test_all_pairs_dijkstra_consistent(self):
        g = complete_graph(5)
        fw = floyd_warshall(g)
        for u in g:
            for v in g:
                if u != v:
                    dj, _ = dijkstra(g, u, target=v)
                    assert abs(dj - fw[u][v]) < 1e-9

    def test_mst_on_weighted_random(self):
        import random
        rng = random.Random(42)
        g = Graph()
        for i in range(10):
            for j in range(i + 1, 10):
                g.add_edge(i, j, weight=rng.uniform(0.1, 10.0))
        mst = minimum_spanning_tree(g)
        assert mst.number_of_nodes() == 10
        assert mst.number_of_edges() == 9
