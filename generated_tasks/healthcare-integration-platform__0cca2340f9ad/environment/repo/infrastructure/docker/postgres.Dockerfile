FROM postgres:16
COPY database/schema.sql /docker-entrypoint-initdb.d/001_schema.sql
