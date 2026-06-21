"""meridian — graph construction, analysis and network algorithms."""

from meridian.graph import Graph
from meridian.digraph import DiGraph
from meridian.multigraph import MultiGraph, MultiDiGraph
from meridian.exceptions import (
    MeridianError,
    NodeNotFound,
    EdgeNotFound,
    HasACycle,
    NegativeCycleError,
    GraphNotConnected,
    ConvergenceError,
)

__version__ = "0.9.2"

__all__ = [
    "Graph",
    "DiGraph",
    "MultiGraph",
    "MultiDiGraph",
    "MeridianError",
    "NodeNotFound",
    "EdgeNotFound",
    "HasACycle",
    "NegativeCycleError",
    "GraphNotConnected",
    "ConvergenceError",
]
