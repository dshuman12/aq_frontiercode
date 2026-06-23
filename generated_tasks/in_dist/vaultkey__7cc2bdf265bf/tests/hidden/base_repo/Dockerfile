FROM python:3.12-slim
WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir pytest==8.2.2 pytest-cov==5.0.0
COPY . .
ENV PYTHONPATH=/app/src
CMD ["python3", "-m", "pytest", "tests/", "-v"]
