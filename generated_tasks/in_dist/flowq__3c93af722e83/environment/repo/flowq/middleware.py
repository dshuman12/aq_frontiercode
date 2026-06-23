"""Middleware pipeline for FlowQ job processing.

Middleware functions wrap job execution and can inspect/modify the job
before and after it runs, short-circuit execution, or handle errors.

Example::

    from flowq.middleware import middleware_stack

    @middleware_stack.use
    def logging_middleware(job, next_handler):
        print(f"Starting {job.name}")
        result = next_handler(job)
        print(f"Finished {job.name}")
        return result
"""

from __future__ import annotations

import functools
import logging
import time
from typing import Callable, List, Optional

from flowq.models import Job

logger = logging.getLogger(__name__)

MiddlewareFn = Callable[[Job, Callable], object]


class MiddlewareStack:
    """Ordered pipeline of middleware functions.

    Middleware is applied in registration order (outermost first).
    Each middleware receives the job and a ``next_handler`` callable
    that invokes the rest of the chain.
    """

    def __init__(self):
        self._middleware: List[MiddlewareFn] = []

    # ------------------------------------------------------------------
    # Registration
    # ------------------------------------------------------------------

    def use(self, fn: MiddlewareFn) -> MiddlewareFn:
        """Register *fn* as the next middleware layer (decorator or call)."""
        self._middleware.append(fn)
        return fn

    def remove(self, fn: MiddlewareFn) -> None:
        try:
            self._middleware.remove(fn)
        except ValueError:
            pass

    def clear(self) -> None:
        self._middleware.clear()

    # ------------------------------------------------------------------
    # Execution
    # ------------------------------------------------------------------

    def wrap(self, handler: Callable[[Job], object]) -> Callable[[Job], object]:
        """Return a new callable that runs *handler* through the middleware stack."""
        pipeline = handler
        for mw in reversed(self._middleware):
            pipeline = _make_next(mw, pipeline)
        return pipeline

    # ------------------------------------------------------------------
    # Built-in middleware factories
    # ------------------------------------------------------------------

    @staticmethod
    def timing() -> MiddlewareFn:
        """Middleware that logs job execution duration."""
        def _timing(job: Job, next_handler: Callable) -> object:
            start = time.perf_counter()
            try:
                result = next_handler(job)
                elapsed = time.perf_counter() - start
                logger.info("Job %s (%s) completed in %.3fs", job.id[:8], job.name, elapsed)
                return result
            except Exception:
                elapsed = time.perf_counter() - start
                logger.warning("Job %s (%s) failed after %.3fs", job.id[:8], job.name, elapsed)
                raise
        return _timing

    @staticmethod
    def tag_filter(required_tag: str) -> MiddlewareFn:
        """Middleware that skips jobs not carrying *required_tag*."""
        def _filter(job: Job, next_handler: Callable) -> object:
            if required_tag not in job.tags:
                logger.debug("Job %s skipped by tag filter (needs %r)", job.id[:8], required_tag)
                return None
            return next_handler(job)
        return _filter

    @staticmethod
    def payload_validator(schema: dict) -> MiddlewareFn:
        """Middleware that validates required payload keys before execution."""
        def _validate(job: Job, next_handler: Callable) -> object:
            missing = [k for k in schema if k not in job.payload]
            if missing:
                raise ValueError(f"Job {job.name} missing payload keys: {missing}")
            return next_handler(job)
        return _validate

    def __len__(self) -> int:
        return len(self._middleware)

    def __repr__(self) -> str:
        return f"MiddlewareStack(layers={len(self._middleware)})"


def _make_next(mw: MiddlewareFn, next_fn: Callable) -> Callable:
    @functools.wraps(next_fn)
    def _wrapped(job: Job) -> object:
        return mw(job, next_fn)
    return _wrapped


# Global singleton
middleware_stack = MiddlewareStack()
