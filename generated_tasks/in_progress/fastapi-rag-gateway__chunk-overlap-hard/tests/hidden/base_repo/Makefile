.PHONY: help install dev test test-unit test-integration test-e2e lint format type-check clean migrate run-worker run-beat docs

PY ?= python
PIP ?= $(PY) -m pip
UVICORN ?= $(PY) -m uvicorn
PYTEST ?= $(PY) -m pytest

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## install runtime + dev dependencies
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	$(PIP) install -r requirements-dev.txt || true

dev: ## run uvicorn with --reload for local development
	$(UVICORN) main:app --host 0.0.0.0 --port 8000 --reload

run: ## run uvicorn without reload (production-ish)
	$(UVICORN) main:app --host 0.0.0.0 --port 8000

test: ## run the full test suite
	$(PYTEST)

test-unit: ## run unit tests only
	$(PYTEST) tests/unit

test-integration: ## run integration tests only
	$(PYTEST) tests/integration

test-e2e: ## run end-to-end tests only
	$(PYTEST) tests/e2e

lint: ## run all linters
	$(PY) -m ruff check app tests
	$(PY) -m black --check app tests
	$(PY) -m mypy app || true

format: ## auto-format the codebase
	$(PY) -m ruff check --fix app tests
	$(PY) -m black app tests

type-check: ## run mypy
	$(PY) -m mypy app

migrate: ## apply DB migrations
	rag-gateway migrate upgrade head

run-worker: ## run the celery worker
	celery -A app.workers.app:celery_app worker --loglevel=info

run-beat: ## run celery beat
	celery -A app.workers.app:celery_app beat --loglevel=info

docs: ## render the docs to docs/_build (uses python -m sphinx if available)
	@echo "Static markdown docs live in docs/. Use a local viewer of choice."

clean: ## remove caches and build artefacts
	rm -rf .pytest_cache .ruff_cache .mypy_cache build dist
	find . -type d -name "__pycache__" -prune -exec rm -rf {} +
