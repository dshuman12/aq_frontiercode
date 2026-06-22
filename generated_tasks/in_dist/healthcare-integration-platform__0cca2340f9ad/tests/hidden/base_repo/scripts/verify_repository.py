from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND_APPS = [
    "apps/admin-dashboard",
    "apps/patient-portal",
    "apps/provider-portal",
    "apps/integration-console",
    "apps/public-website",
]


def run(command: list[str], cwd: Path = ROOT) -> None:
    print("+", " ".join(command))
    subprocess.run(command, cwd=cwd, check=True)


def validate_json() -> None:
    count = 0
    for path in ROOT.rglob("*.json"):
        if "node_modules" in path.parts or "dist" in path.parts:
            continue
        with path.open(encoding="utf-8") as handle:
            json.load(handle)
        count += 1
    print(f"validated {count} json files")


def validate_yaml() -> None:
    try:
        import yaml
    except Exception as exc:
        print(f"skipping yaml validation: {exc}")
        return

    count = 0
    for pattern in ("*.yaml", "*.yml"):
        for path in ROOT.rglob(pattern):
            if "node_modules" in path.parts or "dist" in path.parts:
                continue
            if "infrastructure/helm" in path.as_posix() and "templates" in path.parts:
                continue
            with path.open(encoding="utf-8") as handle:
                yaml.safe_load(handle)
            count += 1
    print(f"validated {count} non-template yaml files")


def run_services() -> None:
    for app in sorted((ROOT / "services").glob("*/app.py")):
        run([sys.executable, str(app)])


def run_frontends() -> None:
    for app in FRONTEND_APPS:
        app_dir = ROOT / app
        run(["npm", "test"], cwd=app_dir)
        run(["npm", "run", "build"], cwd=app_dir)


def main() -> None:
    run([sys.executable, "-m", "compileall", "-q", "services", "packages", "scripts"])
    run([sys.executable, "-m", "pytest", "-q"])
    validate_json()
    validate_yaml()
    run_services()
    run_frontends()


if __name__ == "__main__":
    main()
