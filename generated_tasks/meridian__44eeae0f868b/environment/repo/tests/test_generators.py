"""Tests for graph generators."""

import pytest
from meridian import Graph
from meridian.generators.classic import (
    barbell_graph,
    circular_ladder_graph,
    complete_bipartite_graph,
    complete_graph,
    cycle_graph,
    dag_graph,
    directed_cycle,
    directed_path,
    empty_graph,
    grid_2d_graph,
    hypercube_graph,
    ladder_graph,
    lollipop_graph,
    null_graph,
    path_graph,
    petersen_graph,
    star_graph,
    trivial_graph,
    turan_graph,
    wheel_graph,
)
from meridian.generators.random import (
    barabasi_albert_graph,
    erdos_renyi_graph,
    gnm_random_graph,
    random_regular_graph,
    random_tree,
    watts_strogatz_graph,
)
from meridian.algorithms.components import is_connected


class TestClassicGenerators:
    def test_empty_graph(self):
        g = empty_graph(5)
        assert g.number_of_nodes() == 5
        assert g.number_of_edges() == 0

    def test_null_graph(self):
        g = null_graph()
        assert g.number_of_nodes() == 0

    def test_trivial_graph(self):
        g = trivial_graph()
        assert g.number_of_nodes() == 1

    def test_complete_graph_edges(self):
        g = complete_graph(5)
        assert g.number_of_nodes() == 5
        assert g.number_of_edges() == 10

    def test_complete_bipartite(self):
        g = complete_bipartite_graph(3, 4)
        assert g.number_of_nodes() == 7
        assert g.number_of_edges() == 12

    def test_cycle_graph(self):
        g = cycle_graph(6)
        assert g.number_of_nodes() == 6
        assert g.number_of_edges() == 6
        for v in g:
            assert g.degree(v) == 2

    def test_path_graph(self):
        g = path_graph(5)
        assert g.number_of_nodes() == 5
        assert g.number_of_edges() == 4
        assert g.degree(0) == 1
        assert g.degree(2) == 2

    def test_star_graph(self):
        g = star_graph(5)
        assert g.degree(0) == 5
        for i in range(1, 6):
            assert g.degree(i) == 1

    def test_wheel_graph(self):
        g = wheel_graph(6)
        assert g.number_of_nodes() == 6
        assert g.degree(0) == 5  # hub

    def test_grid_graph(self):
        g = grid_2d_graph(3, 4)
        assert g.number_of_nodes() == 12

    def test_petersen_graph(self):
        g = petersen_graph()
        assert g.number_of_nodes() == 10
        assert g.number_of_edges() == 15
        for v in g:
            assert g.degree(v) == 3

    def test_ladder_graph(self):
        g = ladder_graph(4)
        assert g.number_of_nodes() == 8

    def test_circular_ladder_graph(self):
        g = circular_ladder_graph(4)
        assert g.number_of_nodes() == 8

    def test_hypercube_graph(self):
        g = hypercube_graph(3)
        assert g.number_of_nodes() == 8
        for v in g:
            assert g.degree(v) == 3

    def test_barbell_graph(self):
        g = barbell_graph(3, 2)
        assert g.number_of_nodes() > 0
        assert is_connected(g)

    def test_lollipop_graph(self):
        g = lollipop_graph(3, 3)
        assert is_connected(g)

    def test_turan_graph(self):
        g = turan_graph(9, 3)
        assert g.number_of_nodes() == 9

    def test_directed_cycle(self):
        g = directed_cycle(5)
        assert g.is_directed()
        for v in g:
            assert g.out_degree(v) == 1

    def test_directed_path(self):
        g = directed_path(4)
        assert g.is_directed()
        assert g.number_of_edges() == 3

    def test_dag_graph(self):
        g = dag_graph(5, seed=42)
        assert g.is_dag()

    def test_cycle_invalid(self):
        with pytest.raises(ValueError):
            cycle_graph(0)


class TestRandomGenerators:
    def test_erdos_renyi_p1_complete(self):
        g = erdos_renyi_graph(5, 1.0, seed=0)
        assert g.number_of_edges() == 10

    def test_erdos_renyi_p0_empty(self):
        g = erdos_renyi_graph(5, 0.0, seed=0)
        assert g.number_of_edges() == 0

    def test_erdos_renyi_directed(self):
        g = erdos_renyi_graph(5, 1.0, seed=0, directed=True)
        assert g.is_directed()

    def test_erdos_renyi_deterministic(self):
        g1 = erdos_renyi_graph(10, 0.5, seed=42)
        g2 = erdos_renyi_graph(10, 0.5, seed=42)
        assert g1.number_of_edges() == g2.number_of_edges()

    def test_gnm_exact_edges(self):
        g = gnm_random_graph(10, 15, seed=0)
        assert g.number_of_edges() == 15

    def test_barabasi_albert_scale_free(self):
        g = barabasi_albert_graph(50, 2, seed=0)
        assert g.number_of_nodes() == 50
        assert is_connected(g)

    def test_barabasi_invalid(self):
        with pytest.raises(ValueError):
            barabasi_albert_graph(5, 5)

    def test_watts_strogatz_regular_start(self):
        g = watts_strogatz_graph(10, 4, 0.0, seed=0)
        for v in g:
            assert g.degree(v) >= 2

    def test_random_tree_is_tree(self):
        from meridian.metrics import is_tree
        g = random_tree(10, seed=42)
        assert is_tree(g)

    def test_random_tree_node_count(self):
        g = random_tree(20, seed=0)
        assert g.number_of_nodes() == 20

    def test_random_regular_graph(self):
        g = random_regular_graph(3, 6, seed=0)
        assert g.number_of_nodes() == 6
        for v in g:
            assert g.degree(v) == 3

    def test_random_regular_invalid(self):
        with pytest.raises(ValueError):
            random_regular_graph(3, 5)  # 3*5 = 15 odd
