FROM python:3.11-slim

WORKDIR /app

COPY . .

RUN pip install --no-cache-dir pytest==8.3.4

CMD ["python", "-m", "pytest", "tests/", "-x", "-q"]
