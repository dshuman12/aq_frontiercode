"""Tests for graph coloring."""

import pytest
from meridian import Graph
from meridian.algorithms.coloring import (
    chromatic_number_bound,
    color_classes,
    equitable_coloring,
    greedy_color,
    is_valid_coloring,
    number_of_colors,
)
from meridian.generators.classic import complete_graph, cycle_graph, path_graph


class TestGreedyColor:
    def test_valid_coloring(self):
        g = complete_graph(5)
        colors = greedy_color(g)
        assert is_valid_coloring(g, colors)

    def test_path_two_colors(self):
        g = path_graph(6)
        colors = greedy_color(g)
        assert number_of_colors(colors) == 2

    def test_odd_cycle_three_colors(self):
        g = cycle_graph(5)
        colors = greedy_color(g)
        assert is_valid_coloring(g, colors)
        assert number_of_colors(colors) == 3

    def test_even_cycle_two_colors(self):
        g = cycle_graph(6)
        colors = greedy_color(g)
        assert is_valid_coloring(g, colors)
        assert number_of_colors(colors) == 2

    def test_complete_graph_n_colors(self):
        g = complete_graph(4)
        colors = greedy_color(g)
        assert number_of_colors(colors) == 4

    def test_bipartite_two_colors(self):
        from meridian.generators.classic import complete_bipartite_graph
        g = complete_bipartite_graph(3, 3)
        colors = greedy_color(g, strategy="largest_first")
        assert is_valid_coloring(g, colors)
        assert number_of_colors(colors) == 2

    def test_all_strategies_valid(self):
        from meridian.algorithms.coloring import STRATEGIES
        g = complete_graph(4)
        for strategy in STRATEGIES:
            colors = greedy_color(g, strategy=strategy)
            assert is_valid_coloring(g, colors)

    def test_unknown_strategy_raises(self):
        g = Graph()
        g.add_edge(0, 1)
        with pytest.raises(ValueError):
            greedy_color(g, strategy="nonexistent")

    def test_empty_graph(self):
        g = Graph()
        colors = greedy_color(g)
        assert colors == {}


class TestColorClasses:
    def test_classes_partition(self):
        g = path_graph(4)
        colors = greedy_color(g)
        classes = color_classes(colors)
        # All nodes appear exactly once
        all_nodes = [n for nodes in classes.values() for n in nodes]
        assert set(all_nodes) == set(g.nodes)

    def test_no_adjacent_same_class(self):
        g = complete_graph(3)
        colors = greedy_color(g)
        classes = color_classes(colors)
        for c, nodes in classes.items():
            for i in range(len(nodes)):
                for j in range(i + 1, len(nodes)):
                    assert not g.has_edge(nodes[i], nodes[j])


class TestChromaticBound:
    def test_path_bounds(self):
        g = path_graph(5)
        bounds = chromatic_number_bound(g)
        assert bounds["lower"] <= bounds["upper"]
        assert bounds["upper"] <= 2

    def test_complete_bounds(self):
        g = complete_graph(4)
        bounds = chromatic_number_bound(g)
        assert bounds["lower"] == 4
        assert bounds["upper"] == 4


class TestEquitableColoring:
    def test_valid_equitable(self):
        g = path_graph(6)
        colors = equitable_coloring(g, num_colors=2)
        assert is_valid_coloring(g, colors)

    def test_equitable_invalid_colors(self):
        g = Graph()
        with pytest.raises(ValueError):
            equitable_coloring(g, num_colors=0)
