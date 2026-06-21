"""Clique detection and analysis."""

from __future__ import annotations

from typing import Any, Iterator, List, Optional, Set


# ---------------------------------------------------------------------------
# Bron-Kerbosch (with pivot)
# ---------------------------------------------------------------------------

def find_cliques(G) -> Iterator[List]:
    """Yield all maximal cliques using Bron-Kerbosch with Tomita pivot selection."""
    if G.is_directed():
        g = G.to_undirected()
    else:
        g = G

    adj = {v: set(g.neighbors(v)) for v in g}

    def _bk(R: set, P: set, X: set):
        if not P and not X:
            yield sorted(R, key=str)
            return
        # Pivot: choose the node in P ∪ X with the most neighbours in P
        pivot = max(P | X, key=lambda v: len(adj[v] & P))
        for v in list(P - adj[pivot]):
            yield from _bk(R | {v}, P & adj[v], X & adj[v])
            P.discard(v)
            X.add(v)

    yield from _bk(set(), set(g.nodes), set())


def clique_number(G) -> int:
    """Return the size of the largest clique (clique number ω(G))."""
    return max((len(c) for c in find_cliques(G)), default=0)


def number_of_cliques(G, nodes=None) -> int:
    """Return total count of maximal cliques (or cliques containing *nodes*)."""
    if nodes is None:
        return sum(1 for _ in find_cliques(G))
    node_set = set(nodes) if not isinstance(nodes, set) else nodes
    return sum(1 for c in find_cliques(G) if node_set <= set(c))


def cliques_containing_node(G, v) -> List[List]:
    """Return all maximal cliques that contain node *v*."""
    return [c for c in find_cliques(G) if v in c]


def node_clique_number(G, v) -> int:
    """Return the size of the largest clique containing *v*."""
    cliques = cliques_containing_node(G, v)
    return max((len(c) for c in cliques), default=1)


def graph_clique_number(G) -> int:
    """Alias for clique_number."""
    return clique_number(G)


def graph_number_of_cliques(G) -> int:
    """Alias for number_of_cliques."""
    return number_of_cliques(G)


def clique_removal(G) -> tuple:
    """Iteratively find and remove the maximum clique.

    Returns a (clique, remaining_graph) pair where *clique* is the largest
    independent set found and *remaining_graph* is the graph with those nodes
    removed.
    """
    largest = []
    for c in find_cliques(G):
        if len(c) > len(largest):
            largest = c
    remaining = G.copy()
    remaining.remove_nodes_from(largest)
    return largest, remaining


def is_clique(G, nodes) -> bool:
    """Return True if *nodes* form a clique in G."""
    node_list = list(nodes)
    for i in range(len(node_list)):
        for j in range(i + 1, len(node_list)):
            if not G.has_edge(node_list[i], node_list[j]):
                return False
    return True


def max_weight_clique(G, weight: str = "weight") -> tuple:
    """Find the maximum weight clique.

    Returns (max_weight, clique_nodes).  Uses branch and bound over all
    maximal cliques; practical for small graphs.
    """
    best_w = 0.0
    best_clique: List = []
    for clique in find_cliques(G):
        w = sum(
            G.nodes[v].get(weight, 1.0)
            for v in clique
        )
        if w > best_w:
            best_w = w
            best_clique = clique
    return best_w, best_clique


# ---------------------------------------------------------------------------
# Independent sets (complement relationship to cliques)
# ---------------------------------------------------------------------------

def maximum_independent_set_size(G) -> int:
    """Return the independence number α(G) = clique number of complement."""
    comp = G.complement()
    return clique_number(comp)


def find_independent_sets(G) -> Iterator[List]:
    """Yield all maximal independent sets (cliques of complement graph)."""
    yield from find_cliques(G.complement())
