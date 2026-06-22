"""Tests for path enumeration and Eulerian paths."""

import pytest
from meridian import DiGraph, Graph
from meridian.analysis.paths import (
    all_shortest_paths,
    all_simple_paths,
    cycle_basis,
    eulerian_circuit,
    has_eulerian_circuit,
    has_eulerian_path,
    simple_cycles,
)
from meridian.generators.classic import complete_graph, cycle_graph, path_graph


class TestAllSimplePaths:
    def test_single_path(self):
        g = path_graph(4)
        paths = list(all_simple_paths(g, 0, 3))
        assert len(paths) == 1
        assert paths[0] == [0, 1, 2, 3]

    def test_two_paths(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(0, 2)
        g.add_edge(1, 3)
        g.add_edge(2, 3)
        paths = list(all_simple_paths(g, 0, 3))
        assert len(paths) == 2

    def test_with_cutoff(self):
        g = complete_graph(4)
        paths = list(all_simple_paths(g, 0, 3, cutoff=2))
        # Should only include paths with <= 2 edges
        for p in paths:
            assert len(p) - 1 <= 2

    def test_same_source_target(self):
        g = path_graph(4)
        paths = list(all_simple_paths(g, 0, 0))
        assert paths == [[0]]

    def test_no_path(self):
        g = Graph()
        g.add_node(0)
        g.add_node(1)
        paths = list(all_simple_paths(g, 0, 1))
        assert paths == []


class TestAllShortestPaths:
    def test_single_shortest(self):
        g = path_graph(4)
        paths = list(all_shortest_paths(g, 0, 3))
        assert len(paths) == 1

    def test_two_shortest(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(0, 2)
        g.add_edge(1, 3)
        g.add_edge(2, 3)
        paths = list(all_shortest_paths(g, 0, 3))
        assert len(paths) == 2
        assert all(len(p) == 3 for p in paths)  # length 2 hops


class TestCycleBasis:
    def test_cycle_basis_triangle(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(0, 2)
        basis = cycle_basis(g)
        assert len(basis) == 1

    def test_cycle_basis_path_empty(self):
        g = path_graph(4)
        basis = cycle_basis(g)
        assert len(basis) == 0

    def test_cycle_basis_two_triangles(self):
        g = Graph()
        for e in [(0, 1), (1, 2), (0, 2), (2, 3), (3, 4), (2, 4)]:
            g.add_edge(*e)
        basis = cycle_basis(g)
        assert len(basis) == 2


class TestSimpleCycles:
    def test_directed_cycle(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        cycles = list(simple_cycles(g))
        assert len(cycles) >= 1

    def test_dag_no_cycles(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        cycles = list(simple_cycles(g))
        assert cycles == []

    def test_undirected_raises(self):
        g = Graph()
        g.add_edge(0, 1)
        with pytest.raises(TypeError):
            list(simple_cycles(g))


class TestEulerian:
    def test_has_eulerian_circuit_cycle(self):
        g = cycle_graph(5)
        assert has_eulerian_circuit(g) is True

    def test_no_eulerian_circuit_path(self):
        g = path_graph(4)
        assert has_eulerian_circuit(g) is False

    def test_has_eulerian_path_two_odd(self):
        g = path_graph(4)
        assert has_eulerian_path(g) is True

    def test_eulerian_circuit_result(self):
        g = cycle_graph(4)
        circuit = eulerian_circuit(g)
        assert circuit[0] == circuit[-1]
        assert len(circuit) == 5  # n edges + back to start

    def test_eulerian_circuit_non_eulerian_raises(self):
        g = path_graph(4)
        with pytest.raises(ValueError):
            eulerian_circuit(g)
