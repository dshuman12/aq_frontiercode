# Godhand

## Backend Quick Start

From the repository root:

```bash
chmod +x quick_setup.sh
./quick_setup.sh
```

## Run Again (After Initial Setup)

For subsequent runs, start the backend with:

```bash
cd server
docker-compose up
```

Rebuild only when dependencies change (for example, after editing `server/requirements.txt`):

```bash
cd server
docker-compose up --build
```
