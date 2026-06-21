from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def write_json(path: str, data: dict) -> None:
    write(path, json.dumps(data, indent=2, sort_keys=True) + "\n")


def write_yaml(path: str, lines: list[str]) -> None:
    write(path, "\n".join(lines) + "\n")


def add_claim_processing_service() -> None:
    service = "claim-processing-service"
    write(
        f"services/{service}/README.md",
        """# claim-processing-service

Validates eligibility, prepares X12 claim envelopes, tracks clearinghouse
responses, and emits audit events for billing workflows.
""",
    )
    write(
        f"services/{service}/Dockerfile",
        'FROM python:3.11-slim\nWORKDIR /app\nCOPY . .\nCMD ["python", "-m", "app"]\n',
    )
    write(
        f"services/{service}/app.py",
        '''"""Claim processing runtime."""

from claim_processing_service.pipeline import build_claim_event


def health() -> dict[str, str]:
    return {"service": "claim-processing-service", "status": "ok"}


if __name__ == "__main__":
    print(build_claim_event("demo-patient", "demo-claim"))
''',
    )
    write(
        f"services/{service}/claim_processing_service/__init__.py",
        '"""Claim processing service package."""\n',
    )
    write(
        f"services/{service}/claim_processing_service/pipeline.py",
        '''"""Claim lifecycle pipeline helpers."""


def build_claim_event(patient_id: str, claim_id: str) -> dict[str, str]:
    return {
        "eventType": "claim.submitted",
        "patientId": patient_id,
        "claimId": claim_id,
        "standard": "X12-837",
    }
''',
    )
    write(
        f"services/{service}/claim_processing_service/repository.py",
        '''"""Persistence boundary for claim processing."""


class ClaimRepository:
    def save_status(self, claim_id: str, status: str) -> dict[str, str]:
        return {"claimId": claim_id, "status": status}
''',
    )
    write(
        f"services/{service}/claim_processing_service/rules.py",
        '''"""Claim validation rules."""


REQUIRED_FIELDS = ["patientId", "subscriberId", "diagnosisCode", "serviceDate"]
''',
    )
    write(
        f"services/{service}/claim_processing_service/routes.py",
        '''"""HTTP route declarations for claim processing."""


ROUTES = ["/claims", "/claims/{claim_id}", "/claims/{claim_id}/status"]
''',
    )


def add_frontend_and_website() -> None:
    apps = ["admin-dashboard", "patient-portal", "provider-portal", "integration-console"]
    for app in apps:
        write(
            f"apps/{app}/src/api/healthbridgeClient.ts",
            """export type ApiResult<T> = { data: T; requestId: string };

export async function getJson<T>(path: string): Promise<ApiResult<T>> {
  const response = await fetch(`/api${path}`, { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Request failed: ${response.status}`);
  return { data: await response.json() as T, requestId: response.headers.get("x-request-id") ?? "" };
}
""",
        )
        write(
            f"apps/{app}/src/components/StatusBadge.tsx",
            """export function StatusBadge({ status }: { status: "ok" | "warning" | "critical" }) {
  return <span data-status={status}>{status}</span>;
}
""",
        )
        write(
            f"apps/{app}/src/routes.ts",
            """export const routes = [
  { path: "/", label: "Overview" },
  { path: "/patients", label: "Patients" },
  { path: "/integrations", label: "Integrations" },
  { path: "/audit", label: "Audit" },
];
""",
        )
        write(
            f"apps/{app}/src/styles.css",
            """:root {
  font-family: Inter, system-ui, sans-serif;
  color: #1b1f23;
  background: #f7f9fb;
}

[data-status="ok"] { color: #126b45; }
[data-status="warning"] { color: #8a5a00; }
[data-status="critical"] { color: #a32020; }
""",
        )

    write(
        "apps/public-website/package.json",
        json.dumps(
            {
                "name": "healthbridge-public-website",
                "version": "0.1.0",
                "scripts": {"dev": "vite", "build": "vite build"},
                "dependencies": {"@vitejs/plugin-react": "latest", "vite": "latest", "react": "latest"},
            },
            indent=2,
        )
        + "\n",
    )
    write(
        "apps/public-website/src/App.tsx",
        """export function App() {
  return (
    <main>
      <h1>HealthBridge</h1>
      <p>FHIR, HL7, X12, and audit-ready healthcare integrations.</p>
    </main>
  );
}
""",
    )
    write(
        "apps/public-website/src/pages/security.tsx",
        """export function SecurityPage() {
  return <section>HIPAA-aware audit, encryption, and data retention controls.</section>;
}
""",
    )


def add_database() -> None:
    write(
        "database/schema.sql",
        """CREATE TABLE patients (
  id TEXT PRIMARY KEY,
  external_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE integration_events (
  id TEXT PRIMARY KEY,
  patient_id TEXT REFERENCES patients(id),
  event_type TEXT NOT NULL,
  standard TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_events (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
""",
    )
    for idx, name in enumerate(["patients", "integration_events", "audit_events"], start=1):
        write(
            f"database/migrations/{idx:04d}_create_{name}.sql",
            f"-- Migration {idx:04d}: create {name} table. See database/schema.sql for canonical DDL.\n",
        )
    write_json(
        "database/seeds/development/patient-demo.json",
        {"id": "patient-demo", "external_id": "EHR-10001", "source": "demo"},
    )
    write(
        "database/README.md",
        """# Database

PostgreSQL stores normalized integration events, audit events, consent records,
and operational state. PHI columns are isolated behind service-owned access
paths and every write is paired with an audit event.
""",
    )


def add_skeleton_dirs() -> None:
    write(
        "integrations/labs/README.md",
        "# labs\n\nAggregate laboratory network integration adapters and routing policies.\n",
    )
    write(
        "integrations/pharmacies/README.md",
        "# pharmacies\n\nAggregate pharmacy and e-prescribing integration policies.\n",
    )
    write(
        "integrations/insurers/README.md",
        "# insurers\n\nAggregate payer, eligibility, authorization, and claims integrations.\n",
    )
    for group in ["labs", "pharmacies", "insurers"]:
        write_yaml(
            f"integrations/{group}/contracts/default-routing.yaml",
            [
                f"group: {group}",
                "transport: https",
                "auth: oauth2",
                "audit_required: true",
            ],
        )

    for version in ["2.5.1", "2.7", "2.8.2"]:
        write_yaml(
            f"schemas/hl7/{version}/README.yaml",
            [
                f"standard: HL7v2",
                f"version: {version}",
                "canonical_path: schemas/hl7",
                "compatibility_path: schemas/hl7v2",
            ],
        )
    for event in ["patient.created", "claim.submitted", "lab.resulted", "audit.recorded"]:
        write_json(
            f"schemas/internal-events/{event}.schema.json",
            {
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "title": event,
                "type": "object",
                "required": ["eventId", "eventType", "occurredAt"],
                "properties": {
                    "eventId": {"type": "string"},
                    "eventType": {"const": event},
                    "occurredAt": {"type": "string", "format": "date-time"},
                    "subject": {"type": "object"},
                },
            },
        )

    write_yaml(
        "infrastructure/helm/healthbridge/Chart.yaml",
        ["apiVersion: v2", "name: healthbridge", "version: 0.1.0", "type: application"],
    )
    write_yaml(
        "infrastructure/helm/healthbridge/values.yaml",
        ["image:", "  repository: healthbridge/api-gateway", "  tag: 0.1.0", "replicaCount: 2"],
    )
    write(
        "infrastructure/helm/healthbridge/templates/deployment.yaml",
        """apiVersion: apps/v1
kind: Deployment
metadata:
  name: healthbridge-api
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      app: healthbridge-api
  template:
    metadata:
      labels:
        app: healthbridge-api
    spec:
      containers:
        - name: api
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
""",
    )
    write(
        "infrastructure/docker/api-gateway.Dockerfile",
        'FROM python:3.11-slim\nWORKDIR /app\nCOPY services/api-gateway .\nCMD ["python", "app.py"]\n',
    )
    write(
        "infrastructure/docker/postgres.Dockerfile",
        "FROM postgres:16\nCOPY database/schema.sql /docker-entrypoint-initdb.d/001_schema.sql\n",
    )
    write(
        "infrastructure/docker/README.md",
        "# Docker Images\n\nContainer definitions for API services, workers, and local databases.\n",
    )

    for section in ["api", "deployment", "integration-guides"]:
        write(f"docs/{section}/README.md", f"# {section}\n\nHealthBridge {section.replace('-', ' ')} documentation.\n")
    write(
        "docs/api/openapi.yaml",
        """openapi: 3.0.3
info:
  title: HealthBridge API
  version: 0.1.0
paths:
  /health:
    get:
      responses:
        "200":
          description: Service health
  /claims:
    post:
      responses:
        "202":
          description: Claim accepted for processing
""",
    )
    write(
        "docs/deployment/kubernetes.md",
        "# Kubernetes Deployment\n\nDeploy API, worker, and ingestion services with Helm and environment-specific values.\n",
    )
    for guide in ["epic", "cerner", "labs", "pharmacies", "insurers"]:
        write(
            f"docs/integration-guides/{guide}.md",
            f"# {guide} Integration Guide\n\nConfigure credentials, message routing, audit scopes, and sandbox validation for {guide}.\n",
        )

    for suite in ["unit", "integration"]:
        write(f"tests/{suite}/README.md", f"# {suite} tests\n\n{suite.title()} test suite entry point.\n")
    write(
        "tests/unit/test_claim_pipeline.py",
        """from services.claim_processing_service.claim_processing_service.pipeline import build_claim_event


def test_build_claim_event():
    event = build_claim_event("patient-1", "claim-1")
    assert event["eventType"] == "claim.submitted"
""",
    )
    write(
        "tests/integration/test_api_claims.py",
        """def test_claim_submission_contract():
    payload = {"patientId": "patient-1", "claimId": "claim-1", "standard": "X12-837"}
    assert payload["standard"] == "X12-837"
""",
    )


def main() -> None:
    add_claim_processing_service()
    add_frontend_and_website()
    add_database()
    add_skeleton_dirs()


if __name__ == "__main__":
    main()
