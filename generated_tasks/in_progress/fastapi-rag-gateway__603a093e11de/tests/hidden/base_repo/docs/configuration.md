# Configuration

Configuration is loaded by [`app.core.config.Settings`](../app/core/config.py)
which is built on top of `pydantic-settings`. All values can be set
through environment variables or via a `.env` file at the repository
root.

| Variable | Default | Description |
| --- | --- | --- |
| `APP_NAME` | `FastAPI RAG Gateway` | Display name for the service. |
| `ENVIRONMENT` | `development` | One of `development`, `staging`, `production`, `test`. |
| `HOST` | `0.0.0.0` | Bind host for uvicorn. |
| `PORT` | `8000` | Bind port for uvicorn. |
| `API_PREFIX` | `/api/v1` | URL prefix for the public API. |
| `SECRET_KEY` | `change-me-in-production` | JWT signing secret. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | TTL for access tokens. |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `14` | TTL for refresh tokens. |
| `DATABASE_URL` | `sqlite+aiosqlite:///./rag_gateway.db` | SQLAlchemy URL (async). |
| `REDIS_URL` | _(unset)_ | If set, used by cache + rate limit + Celery. |
| `LLM_PROVIDER` | `openrouter` | One of `openai`, `openrouter`, `anthropic`, `ollama`, `mock`. |
| `LLM_MODEL` | `deepseek/deepseek-chat` | Default LLM model. |
| `EMBEDDING_PROVIDER` | `openai` | One of `openai`, `huggingface`, `sentence_transformers`, `mock`. |
| `VECTOR_STORE` | `chroma` | One of `chroma`, `faiss`, `qdrant`, `pinecone`, `pgvector`, `memory`. |
| `RETRIEVER` | `dense` | One of `dense`, `bm25`, `hybrid`, `ensemble`. |
| `RERANKER` | `identity` | One of `identity`, `cross_encoder`, `cohere`. |
| `RERANK_ENABLED` | `false` | Toggle automatic reranking. |
| `MEMORY_KIND` | `window` | Conversation memory strategy. |
| `MEMORY_WINDOW_SIZE` | `8` | Number of turns kept by the window memory. |
| `RATE_LIMIT_ENABLED` | `true` | Toggle the request rate limiter. |
| `CACHE_ENABLED` | `true` | Toggle the cache backend. |
| `METRICS_ENABLED` | `true` | Expose `/metrics`. |
| `TRACING_ENABLED` | `false` | Initialise OpenTelemetry. |
| `SENTRY_DSN` | _(unset)_ | Enables error reporting when present. |

## Secrets

Secrets are stored as `pydantic.SecretStr` and are redacted by
`Settings.model_dump_safe()` so they cannot be accidentally logged. Use
`Settings.secret("openai_api_key")` to materialise the plaintext value
when integrating with third-party SDKs.

## Profiles

Use the `ENVIRONMENT` variable to select runtime behaviour:

* `development` enables verbose logs, auto-reload, and lenient CORS.
* `production` enables structured JSON logs, security headers, and
  rate limiting.
* `test` runs the suite in `pytest` with mock providers and an
  ephemeral SQLite database.
