"""Case-insensitive header multimap.

Properties:

* Lookup is ASCII case-insensitive.
* Iteration preserves insertion order.
* Multiple values per name are kept (e.g. ``Set-Cookie``).
* The first-seen casing is preserved for emit.

We use :func:`str.lower` (not :meth:`str.casefold`) for the comparison
key. ``casefold`` does language-aware folding (German ß → ss, dotless
i in Turkish, etc.) which changes the match semantics in ways that
break the smuggling guarantees the wire layer relies on.
"""

from __future__ import annotations

from typing import Iterable, Iterator


def _key(name: str) -> str:
    return name.lower()


class Headers:
    """A case-insensitive multimap of HTTP header names → values.

    The semantics intentionally match RFC 7230 §3.2.2: multiple
    headers with the same name are equivalent to a single header
    whose value is the comma-joined concatenation, *except* for
    ``Set-Cookie``, which never coalesces.
    """

    __slots__ = ("_items",)

    def __init__(self, items: Iterable[tuple[str, str]] = ()) -> None:
        # Tuples of (original-cased name, value).
        self._items: list[tuple[str, str]] = list(items)

    # ---- container protocol ---------------------------------------------

    def __len__(self) -> int:
        return len(self._items)

    def __iter__(self) -> Iterator[tuple[str, str]]:
        return iter(self._items)

    def __contains__(self, name: str) -> bool:
        k = _key(name)
        return any(_key(n) == k for n, _ in self._items)

    # ---- access ---------------------------------------------------------

    def get(self, name: str, default: str | None = None) -> str | None:
        """Return the first value for ``name``, or ``default`` if absent."""
        k = _key(name)
        for n, v in self._items:
            if _key(n) == k:
                return v
        return default

    def get_all(self, name: str) -> list[str]:
        """Return all values for ``name`` in insertion order."""
        k = _key(name)
        return [v for n, v in self._items if _key(n) == k]

    def joined(self, name: str) -> str | None:
        """Return the comma-joined coalesced value (RFC 7230 §3.2.2).

        Returns ``None`` if ``name`` isn't present. ``Set-Cookie`` is
        never coalesced; for that header use :meth:`get_all`.
        """
        if _key(name) == "set-cookie":
            raise ValueError("set-cookie cannot be coalesced; use get_all")
        vals = self.get_all(name)
        if not vals:
            return None
        return ", ".join(vals)

    # ---- mutation -------------------------------------------------------

    def add(self, name: str, value: str) -> None:
        self._items.append((name, value))

    def set(self, name: str, value: str) -> None:
        """Replace all existing values for ``name`` with a single ``value``.

        The first-seen casing of any matching existing entry is
        preserved; if the header was new, the casing of ``name`` is
        used.
        """
        k = _key(name)
        new: list[tuple[str, str]] = []
        first_case = name
        seen = False
        for n, v in self._items:
            if _key(n) == k:
                if not seen:
                    first_case = n
                seen = True
                continue
            new.append((n, v))
        new.append((first_case, value))
        self._items = new

    def delete(self, name: str) -> None:
        k = _key(name)
        self._items = [(n, v) for n, v in self._items if _key(n) != k]

    # ---- helpers --------------------------------------------------------

    def items(self) -> list[tuple[str, str]]:
        return list(self._items)

    def __repr__(self) -> str:  # pragma: no cover - debug helper
        return f"Headers({self._items!r})"
