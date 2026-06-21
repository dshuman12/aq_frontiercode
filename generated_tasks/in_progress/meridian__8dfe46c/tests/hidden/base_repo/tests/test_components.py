"""Tests for connected components algorithms."""

import pytest
from meridian import DiGraph, Graph
from meridian.algorithms.components import (
    articulation_points,
    bridges,
    connected_components,
    is_connected,
    is_strongly_connected,
    is_weakly_connected,
    kosaraju_strongly_connected_components,
    node_connected_component,
    number_connected_components,
    strongly_connected_components,
    weakly_connected_components,
    condensation,
)
from meridian.exceptions import NodeNotFound


class TestConnectedComponents:
    def test_single_component(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        comps = connected_components(g)
        assert len(comps) == 1
        assert comps[0] == {0, 1, 2}

    def test_two_components(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(2, 3)
        comps = connected_components(g)
        assert len(comps) == 2

    def test_isolated_nodes(self):
        g = Graph()
        g.add_nodes_from([0, 1, 2, 3])
        comps = connected_components(g)
        assert len(comps) == 4

    def test_is_connected_true(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        assert is_connected(g) is True

    def test_is_connected_false(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_node(2)
        assert is_connected(g) is False

    def test_empty_graph_connected(self):
        g = Graph()
        assert is_connected(g) is True

    def test_number_components(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(2, 3)
        g.add_node(5)
        assert number_connected_components(g) == 3

    def test_node_connected_component(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(3, 4)
        comp = node_connected_component(g, 0)
        assert comp == {0, 1, 2}

    def test_node_connected_component_missing(self):
        g = Graph()
        with pytest.raises(NodeNotFound):
            node_connected_component(g, 99)


class TestStronglyConnected:
    def test_single_scc(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        sccs = strongly_connected_components(g)
        assert len(sccs) == 1
        assert sccs[0] == {0, 1, 2}

    def test_dag_all_singleton_sccs(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        sccs = strongly_connected_components(g)
        assert len(sccs) == 3
        assert all(len(s) == 1 for s in sccs)

    def test_mixed_sccs(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 0)  # SCC {0,1}
        g.add_edge(1, 2)  # singleton {2}
        sccs = strongly_connected_components(g)
        sizes = sorted(len(s) for s in sccs)
        assert sizes == [1, 2]

    def test_is_strongly_connected_true(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        assert is_strongly_connected(g) is True

    def test_is_strongly_connected_false(self):
        g = DiGraph()
        g.add_edge(0, 1)
        assert is_strongly_connected(g) is False

    def test_kosaraju_matches_tarjan(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        g.add_edge(2, 3)
        tarjan = strongly_connected_components(g)
        kosaraju = kosaraju_strongly_connected_components(g)
        assert {frozenset(s) for s in tarjan} == {frozenset(s) for s in kosaraju}

    def test_condensation_is_dag(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(1, 0)
        g.add_edge(1, 2)
        dag = condensation(g)
        assert dag.is_directed()
        assert dag.is_dag()


class TestWeaklyConnected:
    def test_weakly_connected(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_edge(2, 1)
        assert is_weakly_connected(g) is True

    def test_weakly_disconnected(self):
        g = DiGraph()
        g.add_edge(0, 1)
        g.add_node(5)
        wc = weakly_connected_components(g)
        assert len(wc) == 2


class TestArticulationAndBridges:
    def test_bridge_in_path(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        b = bridges(g)
        assert len(b) == 2

    def test_no_bridge_in_cycle(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 0)
        b = bridges(g)
        assert len(b) == 0

    def test_articulation_point(self):
        g = Graph()
        g.add_edge(0, 1)
        g.add_edge(1, 2)
        g.add_edge(2, 3)
        g.add_edge(3, 1)
        aps = articulation_points(g)
        assert 1 in aps

    def test_bridges_directed_raises(self):
        g = DiGraph()
        g.add_edge(0, 1)
        with pytest.raises(TypeError):
            bridges(g)

    def test_articulation_directed_raises(self):
        g = DiGraph()
        g.add_edge(0, 1)
        with pytest.raises(TypeError):
            articulation_points(g)
