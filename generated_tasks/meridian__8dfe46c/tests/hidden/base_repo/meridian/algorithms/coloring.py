"""Graph coloring algorithms."""

from __future__ import annotations

from typing import Any, Callable, Dict, List, Optional


# ---------------------------------------------------------------------------
# Greedy coloring strategies
# ---------------------------------------------------------------------------

def _strategy_largest_first(G, colors: Dict) -> List:
    """Order nodes by degree descending."""
    return sorted(G.nodes, key=lambda v: G.degree(v), reverse=True)


def _strategy_smallest_last(G, colors: Dict) -> List:
    """Iteratively remove the minimum-degree node."""
    degrees = dict(G.degree())
    order = []
    remaining = set(G.nodes)
    while remaining:
        v = min(remaining, key=lambda x: degrees[x])
        order.append(v)
        remaining.discard(v)
        for nbr in G.neighbors(v):
            if nbr in remaining:
                degrees[nbr] -= 1
    return list(reversed(order))


def _strategy_saturation(G, colors: Dict) -> List:
    """DSATUR: pick node with most distinctly-colored neighbours."""
    uncolored = set(G.nodes)
    order = []
    while uncolored:
        best = max(
            uncolored,
            key=lambda v: (
                len({colors[nbr] for nbr in G.neighbors(v) if nbr in colors}),
                G.degree(v),
            ),
        )
        order.append(best)
        colors[best] = -1  # placeholder to track coloring order
        uncolored.discard(best)
    return order


def _strategy_random_sequential(G, colors: Dict, seed=None) -> List:
    import random
    if seed is not None:
        random.seed(seed)
    nodes = list(G.nodes)
    random.shuffle(nodes)
    return nodes


def _strategy_independent_set(G, colors: Dict) -> List:
    """Color independent sets sequentially (greedy)."""
    return list(G.nodes)


def _strategy_connected_sequential_bfs(G, colors: Dict) -> List:
    """BFS order starting from the highest-degree node."""
    from collections import deque
    if not list(G.nodes):
        return []
    start = max(G.nodes, key=lambda v: G.degree(v))
    visited = {start}
    order = [start]
    queue: deque = deque([start])
    while queue:
        v = queue.popleft()
        for nbr in G.neighbors(v):
            if nbr not in visited:
                visited.add(nbr)
                order.append(nbr)
                queue.append(nbr)
    # Include any disconnected components
    for v in G.nodes:
        if v not in visited:
            order.append(v)
    return order


STRATEGIES = {
    "largest_first": _strategy_largest_first,
    "smallest_last": _strategy_smallest_last,
    "saturation_largest_first": _strategy_saturation,
    "random_sequential": _strategy_random_sequential,
    "independent_set": _strategy_independent_set,
    "connected_sequential_bfs": _strategy_connected_sequential_bfs,
}


def greedy_color(
    G,
    strategy: str = "largest_first",
    interchange: bool = False,
) -> Dict[Any, int]:
    """Assign colors to nodes greedily.

    Parameters
    ----------
    strategy : ordering strategy name (see STRATEGIES).
    interchange : if True, attempt color interchange to reduce color count.

    Returns
    -------
    dict mapping node -> color (0-indexed integer).
    """
    if strategy not in STRATEGIES:
        raise ValueError(
            f"Unknown strategy {strategy!r}. Choose from {list(STRATEGIES)}"
        )

    colors: Dict[Any, int] = {}
    order = STRATEGIES[strategy](G, colors)

    for node in order:
        # Find the smallest color not used by any neighbour
        neighbour_colors = {colors[nbr] for nbr in G.neighbors(node) if nbr in colors}
        color = 0
        while color in neighbour_colors:
            color += 1
        colors[node] = color

    if interchange:
        colors = _color_interchange(G, colors)

    return colors


def _color_interchange(G, colors: Dict[Any, int]) -> Dict[Any, int]:
    """Try to reduce the number of colors by swapping color classes."""
    max_color = max(colors.values(), default=0)
    if max_color == 0:
        return colors

    improved = True
    while improved:
        improved = False
        for v in G:
            cv = colors[v]
            nbr_colors = {colors[nbr] for nbr in G.neighbors(v)}
            for alt in range(max_color):
                if alt != cv and alt not in nbr_colors:
                    colors[v] = alt
                    new_max = max(colors.values())
                    if new_max < max_color:
                        max_color = new_max
                        improved = True
                    break
    return colors


def is_valid_coloring(G, coloring: Dict[Any, int]) -> bool:
    """Return True if no two adjacent nodes share the same color."""
    for u, v in G.edges:
        if coloring.get(u) == coloring.get(v):
            return False
    return True


def number_of_colors(coloring: Dict[Any, int]) -> int:
    """Return the number of distinct colors used."""
    return len(set(coloring.values()))


def chromatic_number_bound(G) -> Dict[str, int]:
    """Return upper and lower bounds on the chromatic number.

    Uses greedy coloring as upper bound and clique number as lower bound.
    Exact chromatic number computation is NP-hard; this gives practical bounds.
    """
    upper = number_of_colors(greedy_color(G, strategy="smallest_last"))
    # Lower bound via clique detection
    try:
        from meridian.analysis.clique import clique_number
        lower = clique_number(G)
    except Exception:
        lower = 1
    return {"lower": lower, "upper": upper}


def color_classes(coloring: Dict[Any, int]) -> Dict[int, List]:
    """Group nodes by their assigned color.

    Returns dict {color: [node, ...]}
    """
    classes: Dict[int, List] = {}
    for node, color in coloring.items():
        classes.setdefault(color, []).append(node)
    return classes


def equitable_coloring(G, num_colors: int) -> Dict[Any, int]:
    """Attempt an equitable coloring with *num_colors* colors.

    Nodes are distributed as evenly as possible among the color classes.
    Falls back to greedy if the number of colors is sufficient.
    """
    n = G.number_of_nodes()
    if num_colors < 1:
        raise ValueError("num_colors must be >= 1")
    max_per_class = (n + num_colors - 1) // num_colors
    color_counts = [0] * num_colors
    colors: Dict[Any, int] = {}

    order = _strategy_largest_first(G, colors)
    for node in order:
        nbr_colors = {colors[nbr] for nbr in G.neighbors(node) if nbr in colors}
        # Find valid color with smallest count
        best_color = None
        best_count = n + 1
        for c in range(num_colors):
            if c not in nbr_colors and color_counts[c] < max_per_class:
                if color_counts[c] < best_count:
                    best_count = color_counts[c]
                    best_color = c
        if best_color is None:
            # Fall back: pick any valid color
            for c in range(num_colors):
                if c not in nbr_colors:
                    best_color = c
                    break
        if best_color is None:
            best_color = max(nbr_colors) + 1  # need more colors
        colors[node] = best_color
        color_counts[best_color] = color_counts[best_color] + 1

    return colors
