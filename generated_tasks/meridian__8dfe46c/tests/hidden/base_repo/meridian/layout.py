"""Node layout algorithms for graph visualisation."""

from __future__ import annotations

import math
import random as _random
from typing import Any, Dict, List, Optional, Tuple


Pos = Dict[Any, Tuple[float, float]]


def random_layout(G, center=(0.0, 0.0), scale: float = 1.0, seed: Optional[int] = None) -> Pos:
    """Assign random positions to all nodes."""
    rng = _random.Random(seed)
    cx, cy = center
    return {
        n: (cx + rng.uniform(-scale, scale), cy + rng.uniform(-scale, scale))
        for n in G
    }


def circular_layout(G, scale: float = 1.0, center=(0.0, 0.0)) -> Pos:
    """Place nodes evenly around a circle."""
    nodes = list(G)
    n = len(nodes)
    if n == 0:
        return {}
    cx, cy = center
    pos: Pos = {}
    for i, v in enumerate(nodes):
        angle = 2 * math.pi * i / n
        pos[v] = (cx + scale * math.cos(angle), cy + scale * math.sin(angle))
    return pos


def shell_layout(G, nlist: Optional[List[List]] = None, scale: float = 1.0, center=(0.0, 0.0)) -> Pos:
    """Place nodes in concentric shells.

    *nlist* is a list of lists; each inner list is one shell.
    """
    if nlist is None:
        nlist = [list(G)]
    cx, cy = center
    pos: Pos = {}
    num_shells = len(nlist)
    for shell_idx, shell in enumerate(nlist):
        if not shell:
            continue
        r = scale * (shell_idx + 1) / num_shells
        n = len(shell)
        for i, v in enumerate(shell):
            angle = 2 * math.pi * i / n
            pos[v] = (cx + r * math.cos(angle), cy + r * math.sin(angle))
    return pos


def spiral_layout(G, scale: float = 1.0, equidistant: bool = False, center=(0.0, 0.0)) -> Pos:
    """Place nodes along an Archimedean spiral."""
    nodes = list(G)
    n = len(nodes)
    cx, cy = center
    pos: Pos = {}
    for i, v in enumerate(nodes):
        t = i / max(n - 1, 1)
        angle = 2 * math.pi * t * 3  # 3 full rotations
        r = scale * t
        pos[v] = (cx + r * math.cos(angle), cy + r * math.sin(angle))
    return pos


def spring_layout(
    G,
    k: Optional[float] = None,
    pos: Optional[Pos] = None,
    fixed=None,
    iterations: int = 50,
    threshold: float = 1e-4,
    weight: str = "weight",
    scale: float = 1.0,
    center=(0.0, 0.0),
    seed: Optional[int] = None,
) -> Pos:
    """Fruchterman-Reingold force-directed layout.

    Parameters
    ----------
    k           : optimal edge length (default 1/sqrt(n))
    pos         : initial positions dict (if None, random initialisation)
    fixed       : set of nodes with fixed positions
    iterations  : number of cooling iterations
    threshold   : convergence threshold
    seed        : random seed for initial positions
    """
    rng = _random.Random(seed)
    nodes = list(G)
    n = len(nodes)
    if n == 0:
        return {}

    if k is None:
        k = math.sqrt(1.0 / n)

    # Initialise positions
    if pos is None:
        cur_pos: Dict[Any, List[float]] = {
            v: [rng.uniform(0, 1), rng.uniform(0, 1)] for v in nodes
        }
    else:
        cur_pos = {v: list(pos.get(v, (rng.uniform(0, 1), rng.uniform(0, 1)))) for v in nodes}

    fixed_nodes: set = set(fixed) if fixed else set()

    temperature = 0.1 * math.sqrt(n)
    dt = temperature / (iterations + 1)

    for step in range(iterations):
        # Repulsive forces
        displacement: Dict[Any, List[float]] = {v: [0.0, 0.0] for v in nodes}
        for i, v in enumerate(nodes):
            for j, u in enumerate(nodes):
                if v == u:
                    continue
                dx = cur_pos[v][0] - cur_pos[u][0]
                dy = cur_pos[v][1] - cur_pos[u][1]
                dist = math.sqrt(dx * dx + dy * dy) or 1e-10
                force = k * k / dist
                displacement[v][0] += (dx / dist) * force
                displacement[v][1] += (dy / dist) * force

        # Attractive forces along edges
        for e in G.edges:
            u, v = e[0], e[1]
            dx = cur_pos[v][0] - cur_pos[u][0]
            dy = cur_pos[v][1] - cur_pos[u][1]
            dist = math.sqrt(dx * dx + dy * dy) or 1e-10
            w = 1.0
            if weight:
                w = G.get_edge_data(u, v, {}).get(weight, 1.0)
            force = dist * dist / k * w
            displacement[v][0] -= (dx / dist) * force
            displacement[v][1] -= (dy / dist) * force
            displacement[u][0] += (dx / dist) * force
            displacement[u][1] += (dy / dist) * force

        # Limit displacement and update positions
        max_move = 0.0
        for v in nodes:
            if v in fixed_nodes:
                continue
            dx, dy = displacement[v]
            mag = math.sqrt(dx * dx + dy * dy) or 1e-10
            move = min(mag, temperature)
            cur_pos[v][0] += (dx / mag) * move
            cur_pos[v][1] += (dy / mag) * move
            max_move = max(max_move, move)

        temperature -= dt
        if max_move < threshold:
            break

    # Rescale to [-scale, scale]
    xs = [p[0] for p in cur_pos.values()]
    ys = [p[1] for p in cur_pos.values()]
    if not xs:
        return {}
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    span_x = max(max_x - min_x, 1e-10)
    span_y = max(max_y - min_y, 1e-10)
    cx, cy = center
    final_pos: Pos = {}
    for v in nodes:
        nx = (cur_pos[v][0] - min_x) / span_x * 2 * scale - scale + cx
        ny = (cur_pos[v][1] - min_y) / span_y * 2 * scale - scale + cy
        final_pos[v] = (nx, ny)
    return final_pos


def kamada_kawai_layout(
    G,
    dist: Optional[Dict] = None,
    pos: Optional[Pos] = None,
    weight: str = "weight",
    scale: float = 1.0,
    center=(0.0, 0.0),
    iterations: int = 10,
) -> Pos:
    """Kamada-Kawai energy-minimisation layout.

    Minimises the difference between graph-theoretic and Euclidean distances.
    """
    from meridian.algorithms.shortest_path import floyd_warshall

    nodes = list(G)
    n = len(nodes)
    if n == 0:
        return {}
    if n == 1:
        return {nodes[0]: center}

    idx = {v: i for i, v in enumerate(nodes)}

    if dist is None:
        fw = floyd_warshall(G, weight=weight)
        d = [[fw[u].get(v, math.inf) for v in nodes] for u in nodes]
    else:
        d = [[dist.get(u, {}).get(v, math.inf) for v in nodes] for u in nodes]

    # Ideal edge length
    l = [[0.0] * n for _ in range(n)]
    L = max(d[i][j] for i in range(n) for j in range(n) if d[i][j] < math.inf) or 1.0
    for i in range(n):
        for j in range(n):
            l[i][j] = (L / d[i][j]) if d[i][j] > 0 and d[i][j] < math.inf else 0.0

    # Spring constants
    K_spring = [[1.0 / (d[i][j] ** 2) if d[i][j] > 0 and d[i][j] < math.inf else 0.0
                 for j in range(n)] for i in range(n)]

    # Initialise with circular layout
    init_pos = circular_layout(G, scale=1.0) if pos is None else pos
    x = [[init_pos[v][0], init_pos[v][1]] for v in nodes]

    # Gradient descent
    for _ in range(iterations * n):
        # Find node with maximum delta_m
        delta_m = 0.0
        m_idx = 0
        for m in range(n):
            dEdx = dEdy = 0.0
            for i in range(n):
                if i == m:
                    continue
                dx = x[m][0] - x[i][0]
                dy = x[m][1] - x[i][1]
                dist_mi = math.sqrt(dx * dx + dy * dy) or 1e-10
                k = K_spring[m][i]
                l_mi = l[m][i]
                dEdx += k * (dx - l_mi * dx / dist_mi)
                dEdy += k * (dy - l_mi * dy / dist_mi)
            delta = math.sqrt(dEdx * dEdx + dEdy * dEdy)
            if delta > delta_m:
                delta_m = delta
                m_idx = m
                grad = (dEdx, dEdy)

        if delta_m < 1e-6:
            break

        # Newton step for node m_idx
        m = m_idx
        dEdx2 = dEdxdy = dEdy2 = 0.0
        for i in range(n):
            if i == m:
                continue
            dx = x[m][0] - x[i][0]
            dy = x[m][1] - x[i][1]
            dist_mi = math.sqrt(dx * dx + dy * dy) or 1e-10
            k = K_spring[m][i]
            l_mi = l[m][i]
            d3 = dist_mi ** 3
            dEdx2 += k * (1 - l_mi * dy * dy / d3)
            dEdy2 += k * (1 - l_mi * dx * dx / d3)
            dEdxdy += k * l_mi * dx * dy / d3

        det = dEdx2 * dEdy2 - dEdxdy ** 2
        if abs(det) < 1e-14:
            continue
        gx, gy = grad
        x[m][0] -= (dEdy2 * gx - dEdxdy * gy) / det
        x[m][1] -= (dEdx2 * gy - dEdxdy * gx) / det

    cx, cy = center
    xs = [p[0] for p in x]
    ys = [p[1] for p in x]
    span = max(max(xs) - min(xs), max(ys) - min(ys), 1e-10)
    return {
        nodes[i]: (
            cx + (x[i][0] - sum(xs) / n) / span * 2 * scale,
            cy + (x[i][1] - sum(ys) / n) / span * 2 * scale,
        )
        for i in range(n)
    }


def rescale_layout(pos: Pos, scale: float = 1.0, center=(0.0, 0.0)) -> Pos:
    """Rescale layout positions to fit within *scale* of *center*."""
    if not pos:
        return pos
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    cx, cy = center
    mid_x = (max(xs) + min(xs)) / 2
    mid_y = (max(ys) + min(ys)) / 2
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1.0
    return {
        v: (
            (p[0] - mid_x) / span * 2 * scale + cx,
            (p[1] - mid_y) / span * 2 * scale + cy,
        )
        for v, p in pos.items()
    }
