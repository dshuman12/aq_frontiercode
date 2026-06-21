"""Tests for graph metrics."""

import math
import pytest
from meridian import Graph
from meridian.generators.classic import complete_graph, cycle_graph, path_graph
from meridian.metrics import (
    average_clustering,
    average_degree,
    barycenter,
    center,
    clustering,
    degree_histogram,
    density,
    diameter,
    eccentricity,
    is_forest,
    is_tree,
    number_of_triangles,
    periphery,
    radius,
    transitivity,
    wiener_index,
)


class TestDensity:
    def test_complete_graph_density(self):
        g = complete_graph(5)
        assert density(g) == pytest.approx(1.0)

    def test_empty_graph_density(self):
        from meridian.generators.classic import empty_graph
        g = empty_graph(5)
        assert density(g) == pytest.approx(0.0)

    def test_path_density(self):
        g = path_graph(4)
        # 3 edges, max = 6
        assert density(g) == pytest.approx(0.5)


class TestClustering:
    def test_triangle_clustering(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(0, 2)
        c = clustering(g)
        assert c[0] == pytest.approx(1.0)

    def test_star_zero_clustering(self):
        from meridian.generators.classic import star_graph
        g = star_graph(4)
        c = clustering(g)
        # Leaves have 0 or 1 neighbour, clustering = 0
        for leaf in [1, 2, 3, 4]:
            assert c[leaf] == pytest.approx(0.0)

    def test_complete_graph_clustering(self):
        g = complete_graph(5)
        c = clustering(g)
        for v in g:
            assert c[v] == pytest.approx(1.0)

    def test_average_clustering(self):
        g = complete_graph(4)
        assert average_clustering(g) == pytest.approx(1.0)

    def test_transitivity_triangle(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(0, 2)
        assert transitivity(g) == pytest.approx(1.0)


class TestEccentricity:
    def test_path_eccentricity(self):
        g = path_graph(5)
        ecc = eccentricity(g)
        assert ecc[0] == 4
        assert ecc[2] == 2

    def test_cycle_eccentricity_uniform(self):
        g = cycle_graph(6)
        ecc = eccentricity(g)
        vals = list(ecc.values())
        assert max(vals) - min(vals) == 0


class TestDiameter:
    def test_path_diameter(self):
        g = path_graph(5)
        assert diameter(g) == 4

    def test_complete_graph_diameter(self):
        g = complete_graph(5)
        assert diameter(g) == 1

    def test_disconnected_raises(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_node(5)
        with pytest.raises(Exception):
            diameter(g)


class TestRadius:
    def test_path_radius(self):
        g = path_graph(5)
        assert radius(g) == 2

    def test_complete_radius(self):
        g = complete_graph(4)
        assert radius(g) == 1


class TestCenterPeriphery:
    def test_path_center(self):
        g = path_graph(5)
        c = center(g)
        assert 2 in c

    def test_path_periphery(self):
        g = path_graph(5)
        p = periphery(g)
        assert 0 in p and 4 in p

    def test_barycenter(self):
        g = path_graph(5)
        bc = barycenter(g)
        assert len(bc) > 0


class TestTreeForest:
    def test_path_is_tree(self):
        g = path_graph(5)
        assert is_tree(g) is True

    def test_cycle_not_tree(self):
        g = cycle_graph(4)
        assert is_tree(g) is False

    def test_path_is_forest(self):
        g = path_graph(5)
        assert is_forest(g) is True

    def test_two_paths_is_forest(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(3, 4)
        assert is_forest(g) is True


class TestTriangles:
    def test_triangle_count(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(0, 2)
        tri = number_of_triangles(g)
        for v in g:
            assert tri[v] == 1

    def test_no_triangles_in_path(self):
        g = path_graph(5)
        tri = number_of_triangles(g)
        assert all(t == 0 for t in tri.values())


class TestWiener:
    def test_path_wiener(self):
        g = path_graph(4)
        # distances: 1+2+3+1+2+1 = 10
        assert wiener_index(g) == pytest.approx(10.0)


class TestDegreeHistogram:
    def test_path_histogram(self):
        g = path_graph(4)
        hist = degree_histogram(g)
        assert hist[1] == 2
        assert hist[2] == 2

    def test_average_degree(self):
        g = complete_graph(4)
        assert average_degree(g) == pytest.approx(3.0)
