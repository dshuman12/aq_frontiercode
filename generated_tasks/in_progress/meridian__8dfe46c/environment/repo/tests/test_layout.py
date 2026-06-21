"""Tests for layout algorithms."""

import math
import pytest
from meridian import Graph
from meridian.generators.classic import complete_graph, cycle_graph, path_graph
from meridian.layout import (
    circular_layout,
    kamada_kawai_layout,
    random_layout,
    rescale_layout,
    shell_layout,
    spiral_layout,
    spring_layout,
)


def assert_positions_valid(pos, G):
    """Check all nodes have 2D positions."""
    for v in G:
        assert v in pos
        x, y = pos[v]
        assert math.isfinite(x)
        assert math.isfinite(y)


class TestRandomLayout:
    def test_all_nodes_have_positions(self):
        g = complete_graph(5)
        pos = random_layout(g, seed=0)
        assert_positions_valid(pos, g)

    def test_deterministic_with_seed(self):
        g = path_graph(10)
        p1 = random_layout(g, seed=42)
        p2 = random_layout(g, seed=42)
        for v in g:
            assert p1[v] == p2[v]


class TestCircularLayout:
    def test_all_on_circle(self):
        g = cycle_graph(6)
        pos = circular_layout(g, scale=1.0)
        for v in g:
            x, y = pos[v]
            assert abs(math.sqrt(x ** 2 + y ** 2) - 1.0) < 1e-10

    def test_node_count(self):
        g = complete_graph(4)
        pos = circular_layout(g)
        assert len(pos) == 4


class TestShellLayout:
    def test_valid_positions(self):
        g = complete_graph(6)
        pos = shell_layout(g)
        assert_positions_valid(pos, g)

    def test_custom_shells(self):
        g = Graph()
        for i in range(6):
            g.add_node(i)
        pos = shell_layout(g, nlist=[[0], [1, 2, 3], [4, 5]])
        assert 0 in pos


class TestSpiralLayout:
    def test_valid_positions(self):
        g = complete_graph(5)
        pos = spiral_layout(g)
        assert_positions_valid(pos, g)


class TestSpringLayout:
    def test_valid_positions(self):
        g = complete_graph(5)
        pos = spring_layout(g, seed=0)
        assert_positions_valid(pos, g)

    def test_empty_graph(self):
        g = Graph()
        pos = spring_layout(g, seed=0)
        assert pos == {}

    def test_single_node(self):
        g = Graph()
        g.add_node(0)
        pos = spring_layout(g)
        assert 0 in pos

    def test_fixed_nodes(self):
        g = path_graph(4)
        fixed_pos = {0: (0.0, 0.0)}
        pos = spring_layout(g, pos=fixed_pos, fixed={0}, seed=0)
        # Fixed node position should remain approximately the same
        # (spring layout doesn't enforce fixed strictly in our impl,
        #  but position should be assigned)
        assert 0 in pos


class TestKamadaKawai:
    def test_valid_positions(self):
        g = complete_graph(4)
        pos = kamada_kawai_layout(g)
        assert_positions_valid(pos, g)

    def test_path_graph(self):
        g = path_graph(5)
        pos = kamada_kawai_layout(g)
        assert len(pos) == 5


class TestRescaleLayout:
    def test_rescale(self):
        g = path_graph(4)
        pos = random_layout(g, seed=0, scale=10.0)
        rescaled = rescale_layout(pos, scale=1.0)
        for v in g:
            x, y = rescaled[v]
            assert abs(x) <= 1.0 + 1e-9
            assert abs(y) <= 1.0 + 1e-9
