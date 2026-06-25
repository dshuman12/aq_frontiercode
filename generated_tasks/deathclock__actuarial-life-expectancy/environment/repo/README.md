# Death Clock — Backend API

FastAPI service that powers the longevity prediction engine.

## Setup

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run locally

```bash
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://127.0.0.1:8000`.
Interactive docs at `http://127.0.0.1:8000/docs`.

## Endpoints

| Method | Path       | Description                                                |
|--------|------------|------------------------------------------------------------|
| GET    | /health    | Liveness check                                             |
| POST   | /predict   | Full prediction from questionnaire answers                 |
| POST   | /explain   | Prediction + risk factor breakdown + retrieval queries     |
| POST   | /what-if   | Compare base answers vs hypothetical lifestyle changes     |

## Connecting to Expo

In `bruh/.env` (copy from `bruh/.env.example`):

```
# iOS Simulator (same machine)
EXPO_PUBLIC_API_URL=http://127.0.0.1:8000

# Physical device on same WiFi — use your laptop's LAN IP
EXPO_PUBLIC_API_URL=http://192.168.1.XX:8000
```

## Module structure

```
app/
  main.py          # FastAPI routes
  schemas.py       # Pydantic request/response models
  model/
    questionnaire.py  # Survey schema + answer score maps
    features.py       # Normalization + feature engineering
    baseline.py       # SSA 2022 life tables + actuarial functions
    vitality.py       # Vitality model parameters + prediction
    cox.py            # Cox PH adjustment (requires NHANES data)
    explain.py        # Risk factor identification + explanation assembly
```

## Adding the RAG / explanation pipeline

Section 9 of `death-clock-v2.ipynb` builds the ChromaDB vector store
from PubMed paper embeddings. Once that's running, the `/explain` endpoint
will automatically include `evidence_chunks` in its response.

See `app/model/explain.py` for the `retrieve_evidence` hook.
