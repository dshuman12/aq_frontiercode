FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir -e .

RUN pip install --no-cache-dir \
    pytest==8.3.5 \
    pytest-asyncio==0.24.0

CMD ["pytest", "-v"]
