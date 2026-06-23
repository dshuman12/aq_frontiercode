# Changelog

## [0.3.0] — 2026-05-04

### Added
- `retry_strategies`: ImmediateRetry, ConstantDelay, LinearBackoff, ExponentialBackoff, FibonacciBackoff, JitteredBackoff, CompositeRetry
- `circuit_breaker`: CircuitBreaker with CLOSED/OPEN/HALF_OPEN states, CircuitBreakerRegistry
- `health`: HealthRegistry, HealthCheck, CheckResult, HealthReport with built-in self-check
- `workflows`: Workflow DAG engine, WorkflowStep, WorkflowRunner, CyclicDependencyError
- `job_groups`: JobGroup batch manager, GroupStats, cancel_pending, wait
- `plugins`: PluginManager with 8 lifecycle hooks, LoggingPlugin, MetricsPlugin
- `throttle`: ConcurrencyLimiter, NamedSemaphore, ThrottleGroup, default_throttle
- `logging_config`: JSONFormatter, ConsoleFormatter, configure_logging, get_logger
- `backends.file_backend`: FileBackend JSON-file-per-job storage
- CLI: `stats`, `purge`, `retry`, `handlers`, `dashboard` commands
- 8 new test modules covering all additions

## [0.2.0] — 2026-04-20

### Added
- `config`, `events`, `middleware`, `rate_limiter`, `deadletter`, `monitoring`, `utils`
- `backends` package with BaseBackend, MemoryBackend, SQLiteBackend
- `serializers`: JSON, Pickle, Base64 with registry
- `dashboard`: stdlib HTTP server with /api/status and /health endpoints
- `examples/` directory with 4 usage examples

## [0.1.0] — 2026-02-05

### Added
- Core: Job, JobStatus, Priority, JobQueue, Storage, Worker, WorkerPool, Scheduler
- Exceptions hierarchy
- Click CLI: enqueue, status, list, cancel, worker
- Full pytest suite
