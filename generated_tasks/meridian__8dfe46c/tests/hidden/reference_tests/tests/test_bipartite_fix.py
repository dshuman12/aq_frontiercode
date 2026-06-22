"""Tests for bipartite graph detection and 2-coloring."""
import pytest
from meridian import Graph
from meridian.analysis.bipartite import bipartite_sets, two_color, is_bipartite


def test_simple_bipartite_graph():
    G = Graph()
    for n in [1, 2, 3, 4]:
        G.add_node(n)
    G.add_edge(1, 2)
    G.add_edge(1, 4)
    G.add_edge(3, 2)
    G.add_edge(3, 4)

    top, bottom = bipartite_sets(G)
    assert top | bottom == {1, 2, 3, 4}
    # Nodes 1,3 should be in one set; 2,4 in the other
    assert (top == {1, 3} and bottom == {2, 4}) or (top == {2, 4} and bottom == {1, 3})


def test_odd_cycle_is_not_bipartite():
    G = Graph()
    for n in [1, 2, 3]:
        G.add_node(n)
    G.add_edge(1, 2)
    G.add_edge(2, 3)
    G.add_edge(3, 1)

    with pytest.raises(ValueError):
        bipartite_sets(G)


def test_is_bipartite_even_cycle():
    G = Graph()
    for n in range(4):
        G.add_node(n)
    for i in range(4):
        G.add_edge(i, (i+1) % 4)
    assert is_bipartite(G)


def test_is_bipartite_odd_cycle():
    G = Graph()
    for n in range(3):
        G.add_node(n)
    for i in range(3):
        G.add_edge(i, (i+1) % 3)
    assert not is_bipartite(G)
