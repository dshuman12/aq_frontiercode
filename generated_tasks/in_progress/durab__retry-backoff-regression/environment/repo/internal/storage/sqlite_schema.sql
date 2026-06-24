PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE IF NOT EXISTS workflow_runs (
    namespace      TEXT NOT NULL,
    workflow_id    TEXT NOT NULL,
    run_id         TEXT NOT NULL,
    workflow_type  TEXT NOT NULL,
    task_queue     TEXT NOT NULL,
    status         TEXT NOT NULL,
    start_time     TEXT NOT NULL,
    close_time     TEXT,
    attempt        INTEGER NOT NULL DEFAULT 1,
    parent_wf_id   TEXT,
    parent_run_id  TEXT,
    search_attrs   BLOB,
    memo           BLOB,
    PRIMARY KEY (namespace, workflow_id, run_id)
);
CREATE INDEX IF NOT EXISTS idx_runs_by_status
    ON workflow_runs(namespace, status, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_runs_by_queue
    ON workflow_runs(namespace, task_queue, status);

CREATE TABLE IF NOT EXISTS history_events (
    namespace    TEXT NOT NULL,
    workflow_id  TEXT NOT NULL,
    run_id       TEXT NOT NULL,
    event_id     INTEGER NOT NULL,
    kind         TEXT NOT NULL,
    time         TEXT NOT NULL,
    attempt      INTEGER NOT NULL DEFAULT 0,
    attrs        BLOB,
    PRIMARY KEY (namespace, workflow_id, run_id, event_id)
);
CREATE INDEX IF NOT EXISTS idx_history_kind
    ON history_events(namespace, workflow_id, run_id, kind);

CREATE TABLE IF NOT EXISTS tasks (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    kind         TEXT NOT NULL,
    namespace    TEXT NOT NULL,
    task_queue   TEXT NOT NULL,
    workflow_id  TEXT NOT NULL,
    run_id       TEXT NOT NULL,
    activity_id  INTEGER NOT NULL DEFAULT 0,
    event_id     INTEGER NOT NULL DEFAULT 0,
    visible_at   TEXT NOT NULL,
    leased_until TEXT,
    worker_id    TEXT,
    attempts     INTEGER NOT NULL DEFAULT 0,
    completed    INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_tasks_queue
    ON tasks(kind, task_queue, completed, visible_at);

CREATE TABLE IF NOT EXISTS timers (
    namespace    TEXT NOT NULL,
    workflow_id  TEXT NOT NULL,
    run_id       TEXT NOT NULL,
    timer_id     TEXT NOT NULL,
    fire_at      TEXT NOT NULL,
    PRIMARY KEY (namespace, workflow_id, run_id, timer_id)
);
CREATE INDEX IF NOT EXISTS idx_timers_fire ON timers(fire_at);
