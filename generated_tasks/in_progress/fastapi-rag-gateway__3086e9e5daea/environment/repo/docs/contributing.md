# Contributing

Thank you for considering a contribution! This document is a quick
checklist for setting up your environment and submitting changes.

## Setup

```bash
git clone https://github.com/DevaanshKathuria/FastAPI_RAG_Gateway.git
cd FastAPI_RAG_Gateway
make install
make test
```

## Coding style

* Python 3.11+. Type hints are required for all public functions.
* Format with `make format` (runs `ruff` + `black`).
* Lint with `make lint` (`ruff` + `mypy`).
* Tests live in `tests/` and follow the existing structure
  (`unit/`, `integration/`, `e2e/`).

## Pull requests

Pull requests must:

1. Include or update tests for the change.
2. Pass `make lint` and `make test` locally.
3. Keep the test suite at parity (~47 tests) or higher.
4. Update relevant docs in `docs/`.

The CI workflow under `.github/workflows/ci.yml` will run the same
checks on every PR.

## Commit messages

We do not enforce a strict commit-message format, but please:

* Use the imperative mood ("Add ..." not "Added ...").
* Keep the subject under ~72 characters.
* Include a body when the change is non-trivial.
