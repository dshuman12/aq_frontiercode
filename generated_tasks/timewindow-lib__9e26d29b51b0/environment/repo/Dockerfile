FROM python:3.12.8-slim-bookworm

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir pip==24.3.1 setuptools==75.6.0 wheel==0.45.1 \
    && pip install --no-cache-dir -e ".[dev]"
