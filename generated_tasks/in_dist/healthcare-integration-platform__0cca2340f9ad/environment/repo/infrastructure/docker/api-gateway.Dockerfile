FROM python:3.11-slim
WORKDIR /app
COPY services/api-gateway .
CMD ["python", "app.py"]
