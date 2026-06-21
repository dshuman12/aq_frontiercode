# NexusFlow

A modular Python API platform with authentication, event-driven architecture, plugin system, and background task processing.

## Features

- **Authentication**: JWT tokens, RBAC permissions, OAuth2, session management
- **API Framework**: Dynamic routing, versioning, validation, OpenAPI generation
- **Database**: Connection pooling, query builder, migrations, caching
- **Events**: Event bus with async dispatch, middleware pipeline, replay/sourcing
- **Tasks**: Background worker with retries, scheduling, dead letter queues
- **Plugins**: Plugin discovery, hook system, sandboxing, lifecycle management
- **Telemetry**: Metrics, distributed tracing, structured logging, health checks

## Quick Start

```python
from nexusflow import NexusApp

app = NexusApp(config_path="config.yaml")

@app.on_startup
async def setup(app):
    print("App starting...")

async with app:
    # App is running
    pass
```

## Installation

```bash
pip install -e .
```

## Development

```bash
pip install -e ".[dev]"
pytest
```

## Configuration

NexusFlow uses a layered configuration system:

1. **Defaults** (built-in)
2. **YAML file** (config.yaml)
3. **Environment variables** (NEXUS__SECTION__KEY=value)

Environment variables override file config, which overrides defaults.

## Architecture

```
nexusflow/
├── app.py          # Application factory and lifecycle
├── config/         # Configuration loading and validation
├── auth/           # Authentication, authorization, sessions
├── api/            # Routing, serialization, validation
├── db/             # Database connections, queries, caching
├── events/         # Event bus, handlers, replay
├── tasks/          # Background workers, scheduling
├── plugins/        # Plugin system and hooks
├── telemetry/      # Metrics, tracing, logging
└── utils/          # Shared utilities
```

## License

MIT
