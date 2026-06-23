"""Minimal HTTP dashboard for FlowQ.

Serves a JSON status endpoint and a basic HTML page showing live
queue/worker/metrics state. Uses only stdlib — no web framework needed.

Usage::

    from flowq.dashboard import Dashboard
    from flowq.storage import Storage
    from flowq.monitoring import metrics

    db = Dashboard(storage=Storage("flowq.db"), metrics=metrics)
    db.start(host="127.0.0.1", port=8765)
"""

from __future__ import annotations

import json
import threading
from datetime import datetime
from http.server import BaseHTTPRequestHandler, HTTPServer
from typing import Optional

from flowq.monitoring import MetricsRegistry
from flowq.storage import Storage


_HTML_TEMPLATE = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta http-equiv="refresh" content="10">
  <title>FlowQ Dashboard</title>
  <style>
    body {{ font-family: monospace; background: #0d1117; color: #c9d1d9; margin: 2rem; }}
    h1   {{ color: #58a6ff; }}
    h2   {{ color: #8b949e; border-bottom: 1px solid #30363d; padding-bottom: 4px; }}
    table {{ border-collapse: collapse; width: 100%; margin-bottom: 1rem; }}
    th, td {{ text-align: left; padding: 6px 12px; border-bottom: 1px solid #21262d; }}
    th   {{ color: #58a6ff; }}
    .pending   {{ color: #d29922; }}
    .running   {{ color: #3fb950; }}
    .success   {{ color: #3fb950; }}
    .failed    {{ color: #f85149; }}
    .cancelled {{ color: #8b949e; }}
    .retrying  {{ color: #d29922; }}
    pre  {{ background: #161b22; padding: 1rem; border-radius: 6px; overflow: auto; }}
  </style>
</head>
<body>
  <h1>&#9889; FlowQ Dashboard</h1>
  <p>Last updated: {timestamp} &mdash; auto-refreshes every 10s</p>
  <h2>Job counts by status</h2>
  <table>
    <tr><th>Status</th><th>Count</th></tr>
    {status_rows}
  </table>
  <h2>Recent jobs (last 20)</h2>
  <table>
    <tr><th>ID</th><th>Name</th><th>Status</th><th>Priority</th><th>Created</th></tr>
    {job_rows}
  </table>
  <h2>Metrics snapshot</h2>
  <pre>{metrics_json}</pre>
  <p><a href="/api/status" style="color:#58a6ff">JSON API</a></p>
</body>
</html>"""


class _Handler(BaseHTTPRequestHandler):

    storage: Optional[Storage] = None
    metrics_registry: Optional[MetricsRegistry] = None

    def do_GET(self):
        if self.path.startswith("/api/status"):
            self._serve_json()
        else:
            self._serve_html()

    def _serve_json(self):
        data = self._build_data()
        body = json.dumps(data, indent=2, default=str).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.end_headers()
        self.wfile.write(body)

    def _serve_html(self):
        data = self._build_data()
        counts = data.get("job_counts", {})
        status_rows = "".join(
            f'<tr><td class="{s}">{s}</td><td>{c}</td></tr>'
            for s, c in counts.items()
        )
        jobs = data.get("recent_jobs", [])
        job_rows = "".join(
            f'<tr><td>{j["id"][:8]}</td><td>{j["name"]}</td>'
            f'<td class="{j["status"]}">{j["status"]}</td>'
            f'<td>{j["priority"]}</td><td>{j["created_at"][:19]}</td></tr>'
            for j in jobs
        )
        html = _HTML_TEMPLATE.format(
            timestamp=datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            status_rows=status_rows or "<tr><td colspan=2>No jobs</td></tr>",
            job_rows=job_rows or "<tr><td colspan=5>No jobs</td></tr>",
            metrics_json=json.dumps(data.get("metrics", {}), indent=2, default=str),
        ).encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", len(html))
        self.end_headers()
        self.wfile.write(html)

    def _build_data(self) -> dict:
        data: dict = {"timestamp": datetime.utcnow().isoformat()}
        if self.storage:
            try:
                data["job_counts"] = self.storage.count_by_status()
                jobs = self.storage.list_jobs(limit=20)
                data["recent_jobs"] = [j.to_dict() for j in jobs]
            except Exception as exc:
                data["storage_error"] = str(exc)
        if self.metrics_registry:
            data["metrics"] = self.metrics_registry.snapshot()
        return data

    def log_message(self, *args):
        pass   # suppress request logging


class Dashboard:
    """Lightweight HTTP dashboard for FlowQ."""

    def __init__(self, storage: Optional[Storage] = None,
                 metrics: Optional[MetricsRegistry] = None):
        self._storage = storage
        self._metrics = metrics
        self._server: Optional[HTTPServer] = None
        self._thread: Optional[threading.Thread] = None

    def start(self, host: str = "127.0.0.1", port: int = 8765) -> None:
        """Start the dashboard in a background thread."""
        _Handler.storage          = self._storage
        _Handler.metrics_registry = self._metrics

        self._server = HTTPServer((host, port), _Handler)
        self._thread = threading.Thread(target=self._server.serve_forever, daemon=True)
        self._thread.start()
        print(f"FlowQ dashboard running at http://{host}:{port}")

    def stop(self) -> None:
        if self._server:
            self._server.shutdown()
            self._server = None

    def __repr__(self) -> str:
        return f"Dashboard(storage={self._storage!r}, metrics={self._metrics!r})"
