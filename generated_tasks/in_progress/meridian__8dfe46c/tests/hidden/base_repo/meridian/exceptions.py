"""Exception hierarchy for meridian."""

from __future__ import annotations


class MeridianError(Exception):
    """Base class for all meridian exceptions."""


class NodeNotFound(MeridianError):
    """Raised when a requested node does not exist in the graph."""

    def __init__(self, node) -> None:
        self.node = node
        super().__init__(f"Node {node!r} not found in graph")


class EdgeNotFound(MeridianError):
    """Raised when a requested edge does not exist in the graph."""

    def __init__(self, u, v) -> None:
        self.u = u
        self.v = v
        super().__init__(f"Edge ({u!r}, {v!r}) not found in graph")


class NetworkXNotImplemented(MeridianError):
    """Raised when an algorithm is not implemented for the given graph type."""

    def __init__(self, msg: str = "") -> None:
        super().__init__(msg or "Algorithm not available for this graph type")


class HasACycle(MeridianError):
    """Raised when a cycle is detected in an operation that requires a DAG."""

    def __init__(self, msg: str = "") -> None:
        super().__init__(msg or "Graph contains a cycle")


class NegativeCycleError(MeridianError):
    """Raised when Bellman-Ford detects a negative-weight cycle."""

    def __init__(self, msg: str = "") -> None:
        super().__init__(msg or "Negative-weight cycle detected")


class GraphNotConnected(MeridianError):
    """Raised when an algorithm requires a connected graph but the input is not."""

    def __init__(self, msg: str = "") -> None:
        super().__init__(msg or "Graph is not connected")


class AmbiguousKeyError(MeridianError):
    """Raised when a multi-edge key is ambiguous or missing."""

    def __init__(self, u, v, key=None) -> None:
        self.u = u
        self.v = v
        self.key = key
        detail = f"key={key!r}" if key is not None else "no key given"
        super().__init__(f"Ambiguous multi-edge between {u!r} and {v!r}: {detail}")


class GraphTypeError(MeridianError, TypeError):
    """Raised when a graph operation is called on an incompatible graph type."""


class InvalidArgument(MeridianError, ValueError):
    """Raised when an argument value is logically invalid."""

    def __init__(self, name: str, value, reason: str = "") -> None:
        self.name = name
        self.value = value
        msg = f"Invalid value for {name!r}: {value!r}"
        if reason:
            msg += f" — {reason}"
        super().__init__(msg)


class ConvergenceError(MeridianError):
    """Raised when an iterative algorithm fails to converge."""

    def __init__(self, algorithm: str, iterations: int) -> None:
        self.algorithm = algorithm
        self.iterations = iterations
        super().__init__(
            f"{algorithm} did not converge after {iterations} iterations"
        )


class DeserializationError(MeridianError):
    """Raised when graph data cannot be deserialised from an external format."""

    def __init__(self, fmt: str, reason: str = "") -> None:
        self.fmt = fmt
        msg = f"Failed to deserialise {fmt} data"
        if reason:
            msg += f": {reason}"
        super().__init__(msg)
