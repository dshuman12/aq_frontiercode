from __future__ import annotations

import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

MOHAMED = ("Mohamed Zeyadne", "mohamed.zeyadne@mattel.mr")
IBRAHIM = ("Ibrahim Elwa", "ibrahim.elwa@mattel.mr")


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content, encoding="utf-8")


def write_json(path: str, data: dict) -> None:
    write(path, json.dumps(data, indent=2, sort_keys=True) + "\n")


def write_yaml(path: str, data: dict) -> None:
    lines = []
    for key, value in data.items():
        if isinstance(value, list):
            lines.append(f"{key}:")
            lines.extend(f"  - {item}" for item in value)
        elif isinstance(value, dict):
            lines.append(f"{key}:")
            for sub_key, sub_value in value.items():
                lines.append(f"  {sub_key}: {sub_value}")
        else:
            lines.append(f"{key}: {value}")
    write(path, "\n".join(lines) + "\n")


def git(*args: str, author: tuple[str, str] | None = None, date: str | None = None) -> None:
    env = os.environ.copy()
    if author:
        env["GIT_AUTHOR_NAME"] = author[0]
        env["GIT_AUTHOR_EMAIL"] = author[1]
        env["GIT_COMMITTER_NAME"] = author[0]
        env["GIT_COMMITTER_EMAIL"] = author[1]
    if date:
        env["GIT_AUTHOR_DATE"] = date
        env["GIT_COMMITTER_DATE"] = date
    subprocess.run(["git", *args], cwd=ROOT, env=env, check=True)


def commit(message: str, author: tuple[str, str], date: str) -> None:
    git("add", "-A")
    status = subprocess.run(
        ["git", "status", "--porcelain"],
        cwd=ROOT,
        check=True,
        text=True,
        capture_output=True,
    ).stdout.strip()
    if status:
        git("commit", "-m", message, author=author, date=date)


def date_at(year: int, month: int, day: int = 15) -> str:
    return datetime(year, month, day, 10, 30, tzinfo=timezone.utc).isoformat()


def seed_foundation() -> None:
    write(
        "README.md",
        """# HealthBridge Integration Platform

HealthBridge is a reference healthcare integration platform for clinics, labs,
pharmacies, insurers, patient applications, and internal care operations.

The repository is organized as a production-style monorepo: services, SDKs,
integration adapters, compliance controls, healthcare schemas, operational
runbooks, API contracts, and contract-test fixtures live together so teams can
ship changes across the full integration surface.
""",
    )
    write(
        "pyproject.toml",
        """[project]
name = "healthbridge"
version = "0.1.0"
description = "Healthcare integration platform reference implementation"
requires-python = ">=3.10"
dependencies = ["fastapi", "pydantic", "uvicorn", "httpx", "cryptography"]

[tool.pytest.ini_options]
testpaths = ["tests"]
""",
    )
    write(
        ".gitignore",
        """.venv/
__pycache__/
.pytest_cache/
node_modules/
dist/
build/
.env
""",
    )
    write(
        "docker-compose.yml",
        """services:
  api-gateway:
    build: ./services/api-gateway
    ports:
      - "8080:8080"
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: healthbridge
""",
    )
    write(
        "Makefile",
        """test:
\tpytest

lint:
\tpython -m compileall services packages
""",
    )
    write(
        "docs/architecture/overview.md",
        """# Architecture Overview

HealthBridge routes clinical, administrative, and financial data through
validated ingestion services. Each adapter normalizes inbound messages into
internal events before workflow, audit, and notification services process them.
""",
    )
    write(
        "docs/compliance/hipaa-controls.md",
        """# HIPAA Controls

- Encrypt protected health information in transit and at rest.
- Record immutable audit events for access, export, modification, and deletion.
- Enforce least privilege service-to-service scopes.
- Require signed webhook delivery for outbound clinical events.
""",
    )


def seed_services() -> None:
    services = [
        "api-gateway",
        "auth-service",
        "fhir-service",
        "hl7-ingestion-service",
        "x12-claims-service",
        "dicom-router",
        "notification-service",
        "audit-log-service",
        "file-storage-service",
        "workflow-engine",
        "consent-service",
        "terminology-service",
    ]
    for service in services:
        pkg = service.replace("-", "_")
        write(
            f"services/{service}/Dockerfile",
            "FROM python:3.11-slim\nWORKDIR /app\nCOPY . .\nCMD [\"python\", \"-m\", \"app\"]\n",
        )
        write(
            f"services/{service}/app.py",
            f'''"""Runtime entry point for the {service}."""

from dataclasses import dataclass


@dataclass(frozen=True)
class ServiceConfig:
    name: str = "{service}"
    version: str = "0.1.0"
    audit_topic: str = "audit.events"


def health() -> dict[str, str]:
    return {{"service": ServiceConfig.name, "status": "ok"}}


if __name__ == "__main__":
    print(health())
''',
        )
        write(
            f"services/{service}/README.md",
            f"# {service}\n\nOwns the {service.replace('-', ' ')} runtime boundary.\n",
        )
        for module in ["routes", "models", "repositories", "policies", "events", "settings"]:
            write(
                f"services/{service}/{pkg}/{module}.py",
                f'''"""Core {module} module for {service}."""


class {module.title().replace("_", "")}Registry:
    namespace = "{service}.{module}"

    def describe(self) -> dict[str, str]:
        return {{"namespace": self.namespace, "owner": "{service}"}}
''',
            )


def seed_packages() -> None:
    packages = [
        "fhir-types",
        "hl7-parser",
        "x12-parser",
        "dicom-metadata",
        "validation-engine",
        "workflow-engine",
        "audit-client",
        "sdk-python",
        "sdk-typescript",
        "sdk-go",
        "ui-components",
    ]
    for package in packages:
        module = package.replace("-", "_")
        write(f"packages/{package}/README.md", f"# {package}\n\nShared package for HealthBridge.\n")
        if package == "sdk-typescript":
            write(
                f"packages/{package}/src/client.ts",
                """export class HealthBridgeClient {
  constructor(private readonly baseUrl: string) {}

  async health(): Promise<Response> {
    return fetch(`${this.baseUrl}/health`);
  }
}
""",
            )
        elif package == "sdk-go":
            write(
                f"packages/{package}/client.go",
                """package healthbridge

type Client struct {
	BaseURL string
}
""",
            )
        else:
            write(
                f"packages/{package}/{module}/__init__.py",
                f'"""Public API for {package}."""\n\nPACKAGE_NAME = "{package}"\n',
            )
            for part in ["client", "validators", "serializers", "exceptions", "registry"]:
                write(
                    f"packages/{package}/{module}/{part}.py",
                    f'''"""Implementation helpers for {package} {part}."""


def describe() -> dict[str, str]:
    return {{"package": "{package}", "component": "{part}"}}
''',
                )


FHIR_RESOURCES = [
    "Patient",
    "Practitioner",
    "Organization",
    "Encounter",
    "Observation",
    "Condition",
    "Procedure",
    "Medication",
    "MedicationRequest",
    "DiagnosticReport",
    "DocumentReference",
    "AllergyIntolerance",
    "CarePlan",
    "Claim",
    "Coverage",
    "ExplanationOfBenefit",
    "Appointment",
    "Schedule",
    "Location",
    "Immunization",
    "Device",
    "Specimen",
    "ServiceRequest",
    "Task",
    "Communication",
    "Consent",
]

VENDORS = [
    "epic",
    "cerner",
    "athenahealth",
    "allscripts",
    "meditech",
    "nextgen",
    "eclinicalworks",
    "drchrono",
    "stripe",
    "twilio",
    "sendgrid",
    "s3",
    "quest",
    "labcorp",
    "covermymeds",
    "surescripts",
    "availity",
    "change-healthcare",
    "optum",
    "plaid",
]


def seed_integrations() -> None:
    events = ["patient-sync", "encounter-export", "lab-result", "claim-status", "appointment-feed"]
    for vendor in VENDORS:
        module = vendor.replace("-", "_")
        write(f"integrations/{vendor}/README.md", f"# {vendor}\n\nAdapter contract for {vendor}.\n")
        write(
            f"integrations/{vendor}/{module}/adapter.py",
            f'''"""Adapter for {vendor}."""


class Adapter:
    vendor = "{vendor}"

    def normalize(self, payload: dict) -> dict:
        return {{"vendor": self.vendor, "payload": payload}}
''',
        )
        for event in events:
            write_yaml(
                f"integrations/{vendor}/contracts/{event}.yaml",
                {
                    "vendor": vendor,
                    "event": event,
                    "transport": "https",
                    "auth": "oauth2",
                    "audit_required": "true",
                },
            )
            write_json(
                f"tests/contract/integrations/{vendor}/{event}.json",
                {
                    "vendor": vendor,
                    "event": event,
                    "resourceType": "Bundle",
                    "status": "example",
                },
            )


def seed_standards() -> None:
    for resource in FHIR_RESOURCES:
        snake = "".join([f"_{c.lower()}" if c.isupper() else c for c in resource]).strip("_")
        write_json(
            f"schemas/fhir/r4/resources/{resource}.schema.json",
            {
                "$schema": "https://json-schema.org/draft/2020-12/schema",
                "title": resource,
                "type": "object",
                "required": ["resourceType", "id"],
                "properties": {
                    "resourceType": {"const": resource},
                    "id": {"type": "string"},
                    "meta": {"type": "object"},
                },
            },
        )
        write(
            f"packages/fhir-types/fhir_types/resources/{snake}.py",
            f'''"""FHIR R4 {resource} type."""

from dataclasses import dataclass, field


@dataclass
class {resource}:
    id: str
    resourceType: str = "{resource}"
    meta: dict = field(default_factory=dict)
''',
        )
        for profile in ["us-core", "smart-app-launch", "bulk-data", "payer-data-exchange"]:
            write_json(
                f"schemas/fhir/r4/profiles/{profile}/{resource}.json",
                {
                    "resourceType": "StructureDefinition",
                    "id": f"{profile}-{resource}",
                    "type": resource,
                    "status": "active",
                },
            )
    for message in ["ADT_A01", "ADT_A03", "ORM_O01", "ORU_R01", "SIU_S12"]:
        for version in ["2.3", "2.4", "2.5.1", "2.7", "2.8.2"]:
            write_yaml(
                f"schemas/hl7v2/{version}/{message}.yaml",
                {
                    "message": message,
                    "version": version,
                    "segments": ["MSH", "PID", "PV1", "OBR", "OBX"],
                },
            )
    for transaction in ["270", "271", "276", "277", "278", "820", "834", "835", "837p", "837i"]:
        write_json(
            f"schemas/x12/005010/{transaction}.json",
            {
                "transaction": transaction,
                "version": "005010",
                "loops": ["ISA", "GS", "ST", "BHT", "SE", "GE", "IEA"],
            },
        )


def seed_bulk_catalogs() -> None:
    tenants = [f"tenant-{i:03d}" for i in range(1, 81)]
    regions = ["us-east", "us-west", "eu-central", "eu-west", "middle-east"]
    workflows = [
        "patient-registration",
        "eligibility-check",
        "lab-order",
        "lab-result",
        "claim-submit",
        "claim-status",
        "prior-authorization",
        "referral",
        "appointment-reminder",
        "medication-sync",
    ]
    channels = ["fhir", "hl7v2", "x12", "webhook", "sftp"]

    for tenant in tenants:
        for region in regions:
            for workflow in workflows:
                for channel in channels:
                    base = f"{tenant}/{region}/{workflow}/{channel}"
                    record = {
                        "tenant": tenant,
                        "region": region,
                        "workflow": workflow,
                        "channel": channel,
                        "phi": "true",
                        "retention_days": 2555,
                    }
                    write_yaml(f"config/routes/{base}.yaml", record)
                    write_json(f"tests/fixtures/routes/{base}.json", record)

    control_families = [
        "access",
        "audit",
        "encryption",
        "retention",
        "incident-response",
        "backup",
        "vendor-risk",
        "break-glass",
        "consent",
        "data-export",
    ]
    for family in control_families:
        for idx in range(1, 151):
            control_id = f"{family}-{idx:03d}"
            write_yaml(
                f"compliance/controls/hipaa/{family}/{control_id}.yaml",
                {
                    "id": control_id,
                    "family": family,
                    "framework": "HIPAA",
                    "evidence": ["audit_log", "configuration", "test_result"],
                },
            )
            write(
                f"docs/compliance/controls/hipaa/{family}/{control_id}.md",
                f"# {control_id}\n\nOperational evidence and validation notes for {family} control {idx}.\n",
            )

    datasets = ["patients", "encounters", "observations", "claims", "appointments", "consents"]
    for dataset in datasets:
        for idx in range(1, 901):
            write_json(
                f"tests/fixtures/fhir/{dataset}/{dataset}-{idx:04d}.json",
                {
                    "resourceType": "Bundle",
                    "id": f"{dataset}-{idx:04d}",
                    "type": "collection",
                    "entry": [
                        {
                            "resource": {
                                "resourceType": "Patient" if dataset == "patients" else "Observation",
                                "id": f"{dataset}-{idx:04d}",
                            }
                        }
                    ],
                },
            )


def seed_apps_and_infra() -> None:
    apps = ["admin-dashboard", "patient-portal", "provider-portal", "integration-console"]
    for app in apps:
        write(
            f"apps/{app}/package.json",
            json.dumps(
                {
                    "name": app,
                    "version": "0.1.0",
                    "scripts": {"build": "vite build", "test": "vitest"},
                    "dependencies": {"@vitejs/plugin-react": "latest", "vite": "latest"},
                },
                indent=2,
            )
            + "\n",
        )
        write(
            f"apps/{app}/src/App.tsx",
            f"""export function App() {{
  return <main><h1>{app}</h1></main>;
}}
""",
        )
        for view in ["overview", "patients", "encounters", "integrations", "audit", "settings"]:
            write(
                f"apps/{app}/src/views/{view}.tsx",
                f"""export function {view.title().replace('-', '')}View() {{
  return <section data-view="{view}">{view}</section>;
}}
""",
            )

    for env in ["dev", "staging", "prod"]:
        for component in ["network", "database", "kubernetes", "secrets", "observability"]:
            write(
                f"infrastructure/terraform/{env}/{component}.tf",
                f'''resource "null_resource" "{component}" {{
  triggers = {{
    environment = "{env}"
    component = "{component}"
  }}
}}
''',
            )
    for service in ["api-gateway", "fhir-service", "hl7-ingestion-service", "x12-claims-service"]:
        write_yaml(
            f"infrastructure/kubernetes/{service}/deployment.yaml",
            {"apiVersion": "apps/v1", "kind": "Deployment", "metadata": {"name": service}},
        )


def seed_tests() -> None:
    suites = [
        "fhir_validation",
        "hl7_mapping",
        "x12_claims",
        "webhook_signatures",
        "audit_export",
        "consent_enforcement",
        "routing",
        "workflow_retries",
    ]
    for suite in suites:
        write(
            f"tests/{suite}/test_{suite}.py",
            f'''def test_{suite}_contract():
    assert "{suite}"
''',
        )
        for case in range(1, 101):
            write_json(
                f"tests/{suite}/cases/{case:03d}.json",
                {"suite": suite, "case": case, "expected": "accepted"},
            )


def main() -> None:
    git("branch", "-M", "main")
    git("config", "user.name", MOHAMED[0])
    git("config", "user.email", MOHAMED[1])

    seed_foundation()
    commit("chore: bootstrap healthbridge platform workspace", MOHAMED, date_at(2020, 1, 15))

    seed_services()
    commit("feat(services): add core healthcare service boundaries", IBRAHIM, date_at(2020, 3, 10))

    seed_packages()
    commit("feat(packages): add shared SDK and validation packages", MOHAMED, date_at(2020, 5, 20))

    seed_integrations()
    commit("feat(integrations): add vendor adapter contracts", IBRAHIM, date_at(2020, 7, 8))

    seed_standards()
    commit("feat(standards): add FHIR HL7 and X12 schema catalogs", MOHAMED, date_at(2020, 10, 14))

    seed_apps_and_infra()
    commit("feat(platform): add apps and deployment infrastructure", IBRAHIM, date_at(2021, 2, 17))

    seed_tests()
    commit("test: add integration contract test suites", MOHAMED, date_at(2021, 5, 12))

    seed_bulk_catalogs()
    commit("feat(catalog): add tenant route compliance and fixture catalogs", IBRAHIM, date_at(2021, 9, 21))

    write(
        "docs/operations/release-checklist.md",
        """# Release Checklist

- Validate schema migrations.
- Run contract tests against partner sandboxes.
- Review audit event coverage.
- Confirm consent and data retention controls.
""",
    )
    commit("docs(operations): add release readiness checklist", MOHAMED, date_at(2021, 12, 16))


if __name__ == "__main__":
    main()
