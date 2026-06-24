"""Database integration package.

This subpackage owns SQLAlchemy session management, declarative base
class registration, and a small set of helpers used by the
repositories layer. Importing this package is cheap — heavy work
(creating engines, opening connections) only happens when a session is
requested.
"""

from __future__ import annotations

from app.db.base import Base, naming_convention
from app.db.session import (
    SessionLocal,
    engine,
    get_session,
    init_db,
    reset_engine,
)

__all__ = [
    "Base",
    "SessionLocal",
    "engine",
    "get_session",
    "init_db",
    "naming_convention",
    "reset_engine",
]
