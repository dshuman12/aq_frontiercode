#!/usr/bin/env bash
set -euo pipefail

cd server

if command -v python3 >/dev/null 2>&1; then
  PYTHON_CMD="python3"
elif command -v python >/dev/null 2>&1; then
  PYTHON_CMD="python"
else
  echo "Error: neither python3 nor python is installed." >&2
  exit 1
fi

"${PYTHON_CMD}" -m venv .venv

# shellcheck disable=SC1091
source .venv/bin/activate

pip install --upgrade pip
pip install -r requirements.txt

# cat > .env <<'EOF'
# FASTAPI_ENV=development
# SECRET_KEY=test-secret-key
# JWT_SECRET_KEY=test-jwt-secret
# EOF

docker-compose up --build
