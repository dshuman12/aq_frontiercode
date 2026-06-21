"""Tests for clique and bipartite analysis."""

import pytest
from meridian import Graph
from meridian.analysis.bipartite import (
    bipartite_sets,
    degrees,
    is_bipartite,
    is_complete_bipartite,
    projected_graph,
    two_color,
)
from meridian.analysis.clique import (
    clique_number,
    cliques_containing_node,
    find_cliques,
    is_clique,
    node_clique_number,
    number_of_cliques,
)
from meridian.generators.classic import (
    complete_bipartite_graph,
    complete_graph,
    cycle_graph,
    path_graph,
)


class TestFindCliques:
    def test_complete_graph_one_clique(self):
        g = complete_graph(4)
        cliques = list(find_cliques(g))
        assert len(cliques) == 1
        assert len(cliques[0]) == 4

    def test_path_only_single_edges(self):
        g = path_graph(4)
        cliques = list(find_cliques(g))
        assert all(len(c) <= 2 for c in cliques)

    def test_triangle(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(0, 2)
        cliques = list(find_cliques(g))
        assert any(set(c) == {0, 1, 2} for c in cliques)

    def test_two_triangles_sharing_edge(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(0, 2)
        g.add_edge(1, 3)
        g.add_edge(2, 3)
        cliques = list(find_cliques(g))
        assert len(cliques) == 2


class TestCliqueNumber:
    def test_complete_graph(self):
        g = complete_graph(5)
        assert clique_number(g) == 5

    def test_path(self):
        g = path_graph(5)
        assert clique_number(g) == 2

    def test_empty(self):
        g = Graph()
        assert clique_number(g) == 0


class TestCliqueHelpers:
    def test_number_of_cliques(self):
        g = complete_graph(4)
        assert number_of_cliques(g) == 1

    def test_cliques_containing_node(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(0, 2)
        g.add_edge(2, 3)
        cliques = cliques_containing_node(g, 2)
        assert any(0 in c and 1 in c and 2 in c for c in cliques)

    def test_node_clique_number(self):
        g = complete_graph(4)
        assert node_clique_number(g, 0) == 4

    def test_is_clique_true(self):
        g = complete_graph(4)
        assert is_clique(g, [0, 1, 2, 3]) is True

    def test_is_clique_false(self):
        g = path_graph(4)
        assert is_clique(g, [0, 1, 2]) is False


class TestBipartite:
    def test_path_is_bipartite(self):
        g = path_graph(5)
        assert is_bipartite(g) is True

    def test_odd_cycle_not_bipartite(self):
        g = cycle_graph(5)
        assert is_bipartite(g) is False

    def test_even_cycle_bipartite(self):
        g = cycle_graph(6)
        assert is_bipartite(g) is True

    def test_bipartite_sets_path(self):
        g = path_graph(4)
        top, bottom = bipartite_sets(g)
        assert len(top) == 2
        assert len(bottom) == 2

    def test_bipartite_sets_non_bipartite_raises(self):
        g = cycle_graph(3)
        with pytest.raises(ValueError):
            bipartite_sets(g)

    def test_two_color(self):
        g = path_graph(4)
        colors = two_color(g)
        for u, v in g.edges:
            assert colors[u] != colors[v]

    def test_is_complete_bipartite(self):
        g = complete_bipartite_graph(3, 3)
        assert is_complete_bipartite(g) is True

    def test_not_complete_bipartite(self):
        g = path_graph(4)
        assert is_complete_bipartite(g) is False

    def test_projected_graph(self):
        g = complete_bipartite_graph(3, 3)
        top, bottom = bipartite_sets(g)
        proj = projected_graph(g, top)
        assert proj.number_of_nodes() == 3

    def test_degrees(self):
        g = complete_bipartite_graph(2, 3)
        top, bottom = bipartite_sets(g)
        td, bd = degrees(g, top)
        assert all(d == 3 for d in td.values())
        assert all(d == 2 for d in bd.values())
