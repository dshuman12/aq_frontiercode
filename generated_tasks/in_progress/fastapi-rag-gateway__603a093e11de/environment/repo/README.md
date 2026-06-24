# FastAPI RAG Gateway

A production-ready Retrieval-Augmented Generation (RAG) API built with FastAPI, LangChain, and ChromaDB.

> ** Memory Optimized**: Uses OpenAI API embeddings for minimal memory footprint (~200MB). **Fully compatible with Render's 512MB free tier!**

## Features

- FastAPI-based REST API
- Multi-document retrieval using ChromaDB
- LLM integration via OpenRouter (DeepSeek)
- Async query processing
- Comprehensive testing with DeepEval
- **Memory-efficient**: OpenAI embeddings instead of local models (fits in 512MB RAM)

## Local Setup

1. **Clone the repository**
```bash
git clone https://github.com/DevaanshKathuria/FastAPI_RAG_Gateway.git
cd FastAPI_RAG_Gateway
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
Create a `.env` file:
```env
OPENAI_API_KEY=your_openai_api_key
OPENROUTER_API_KEY=your_openrouter_api_key
RAG_LLM_MODEL=deepseek/deepseek-chat
RAG_LLM_BASE_URL=https://openrouter.ai/api/v1
UVICORN_PORT=8000
```

5. **Index documents**
```bash
python indexing.py
```

6. **Run the server**
```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Usage

### Query Endpoint

**POST** `/query`

```bash
curl -X POST "http://localhost:8000/query" \
 -H "Content-Type: application/json" \
 -d '{"question": "What is machine learning?"}'
```

**Response:**
```json
{
 "answer": "Machine learning is...",
 "context": ["Retrieved document chunk 1", "Retrieved document chunk 2"]
}
```

## Deployment

> **See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment guides and [MEMORY_OPTIMIZATION.md](MEMORY_OPTIMIZATION.md) for memory optimization details.**

### Deploy to Render (Free Tier - 512MB RAM)

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click "New +" → "Web Service"
4. Connect your GitHub repository
5. Render will auto-detect the `render.yaml` configuration
6. Add your environment variables:
 - `OPENAI_API_KEY` (required for embeddings)
 - `OPENROUTER_API_KEY` (required for LLM)
7. Click "Create Web Service"
8. Wait 5-10 minutes for deployment

### Deploy to Railway

1. Install Railway CLI: `npm i -g @railway/cli`
2. Login: `railway login`
3. Initialize: `railway init`
4. Add environment variables: `railway variables set OPENAI_API_KEY=your_key`
5. Deploy: `railway up`

### Deploy to Fly.io

See `fly.toml` for configuration. Run:
```bash
fly launch
fly secrets set OPENAI_API_KEY=your_key
fly deploy
```

## Project Structure

```
├── main.py # FastAPI application
├── rag_core.py # RAG logic and LLM integration
├── indexing.py # Document loading and vector store
├── requirements.txt # Python dependencies
├── data/ # Source documents
├── eval/ # Testing suite
└── chroma_store/ # Vector database (gitignored)
```

## Testing

Run tests with pytest:
```bash
pytest eval/test_rag.py -v
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for embeddings | Yes |
| `OPENROUTER_API_KEY` | OpenRouter API key for LLM | Yes |
| `RAG_LLM_MODEL` | Model name (e.g., deepseek/deepseek-chat) | Yes |
| `RAG_LLM_BASE_URL` | OpenRouter base URL | Yes |
| `UVICORN_PORT` | Server port (default: 8000) | No |

## License

MIT
