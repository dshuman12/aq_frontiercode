# API Reference

All endpoints are mounted under `${API_PREFIX}` (default `/api/v1`).
The full OpenAPI document is exposed at `${OPENAPI_URL}` (default
`/openapi.json`) and rendered by Swagger UI at `${DOCS_URL}` and ReDoc
at `${REDOC_URL}`.

## Authentication

The API supports two authentication schemes which can be used
interchangeably:

1. **JWT bearer tokens** — issued via `/auth/login` and `/auth/refresh`.
2. **API keys** — issued via `/api-keys/`. Sent as the `X-API-Key`
   request header.

Routes that require admin privileges check the user's `is_superuser`
flag or the `admin` role.

## Auth — `/auth`

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/auth/register` | Create a new account. |
| `POST` | `/auth/login` | Exchange email + password for tokens. |
| `POST` | `/auth/refresh` | Trade a refresh token for new access tokens. |

## Users — `/users`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/users/me` | Read the authenticated user. |
| `PATCH` | `/users/me` | Update profile / preferences. |
| `GET` | `/users/` | List users (admin). |
| `GET` | `/users/{id}` | Read a user (admin). |
| `PATCH` | `/users/{id}` | Update a user (admin). |
| `DELETE` | `/users/{id}` | Deactivate a user (admin). |

## API Keys — `/api-keys`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api-keys/` | List the authenticated user's keys. |
| `POST` | `/api-keys/` | Mint a new key (returns plaintext once). |
| `PATCH` | `/api-keys/{id}` | Update key metadata. |
| `DELETE` | `/api-keys/{id}` | Revoke a key. |

## Documents — `/documents`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/documents/` | List documents owned by the caller. |
| `POST` | `/documents/` | Ingest a JSON payload (text or URL). |
| `POST` | `/documents/upload` | Multipart upload for a single file. |
| `GET` | `/documents/{id}` | Retrieve metadata for a document. |
| `PATCH` | `/documents/{id}` | Update document metadata. |
| `DELETE` | `/documents/{id}` | Soft-delete a document. |

## Conversations — `/conversations`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/conversations/` | List the caller's conversations. |
| `POST` | `/conversations/` | Start a new conversation. |
| `GET` | `/conversations/{id}` | Read a conversation including history. |
| `PATCH` | `/conversations/{id}` | Update conversation metadata. |
| `DELETE` | `/conversations/{id}` | Soft-delete a conversation. |

## Chat — `/chat`

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/chat/` | Run a single non-streaming RAG turn. |
| `POST` | `/chat/stream` | Stream a RAG turn over Server-Sent Events. |

## Search — `/search`

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/search/` | Retrieve top-k chunks for a query. |

## Admin — `/admin`

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/admin/stats` | Aggregate counts (users, documents, jobs). |
| `POST` | `/admin/reindex` | Schedule a full reindex job. |
| `POST` | `/admin/maintenance/vacuum` | Schedule a database vacuum. |

## Health — root

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/health` | Aggregate health check. |
| `GET` | `/ping` | Lightweight liveness probe. |
| `GET` | `/ready` | Readiness probe. |
| `GET` | `/metrics` | Prometheus metrics endpoint. |
