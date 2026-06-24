# Runbook

Operational guide for the FastAPI RAG Gateway. The gateway is built so
that the same artifact can run as the API server, a Celery worker, or
the Typer CLI — pick the right entrypoint for the role.

## Local development

```bash
make install            # creates a virtual environment and installs deps
cp .env.example .env    # tweak provider keys
make dev                # uvicorn --reload on http://localhost:8000
make test               # pytest tests/ with coverage
```

## Database migrations

The project uses [Alembic](https://alembic.sqlalchemy.org/) for schema
management. Models live in `app/models` and a generic base in
`app/db/base.py` provides timestamp + UUID mixins.

```bash
rag-gateway migrate upgrade head        # apply migrations
rag-gateway migrate downgrade base      # roll back
rag-gateway migrate create-all          # bypass Alembic in dev
```

## Workers

The worker process is a standard Celery worker and can be scaled
horizontally. The default broker is `redis://` (configured via
`CELERY_BROKER_URL`) but any broker supported by Celery works.

```bash
celery -A app.workers.app:celery_app worker --loglevel=info
celery -A app.workers.app:celery_app beat --loglevel=info  # periodic tasks
```

When Celery is not installed, the helpers in `app.workers.executor`
fall back to in-process execution so unit tests and CLI commands keep
working.

## CLI

The Typer-based CLI is shipped as `rag-gateway` (or
`python -m app.cli.main`). Notable commands:

```bash
rag-gateway dev info                    # print resolved settings
rag-gateway dev routes                  # list HTTP routes
rag-gateway users create-admin email pw # bootstrap an admin user
rag-gateway ingest file ./README.md     # ingest a local file
rag-gateway queue dispatch ingestion.run --document-id=<id>
```

## Health checks

* `GET /api/v1/ping` — liveness (always 200 when the process is up).
* `GET /api/v1/health` — readiness (database probe).
* `GET /api/v1/metrics` — Prometheus metrics.

Configure your load balancer to use `/ping` for liveness and
`/health` for readiness probes.

## Backups

The default SQLite store can be backed up by copying
`rag_gateway.db`. For Postgres, use `pg_dump` against the database
referenced by `DATABASE_URL`. The vector stores have their own backup
recipes:

* `chroma_persist_dir` is a regular directory — back it up alongside
  the database.
* FAISS persists `index.faiss` + `metadata.json` in
  `faiss_index_dir`.
* Qdrant / Pinecone / pgvector are managed externally — refer to the
  provider documentation.
