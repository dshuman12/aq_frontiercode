# Memory Optimization Guide

## Problem
The original implementation used `sentence-transformers` for embeddings, which required:
- **300MB+** for the ML model (`all-MiniLM-L6-v2`)
- **100MB+** for PyTorch/Transformers dependencies
- **Total: 600MB+** RAM usage → **Exceeded Render's 512MB free tier**

## Solution
Switched to **OpenAI API-based embeddings** (`text-embedding-3-small`):
- **<50MB** for embedding logic (API calls only, no local models)
- **~150-200MB** total memory footprint
- **Fits comfortably in 512MB free tier**

---

## What Changed

### 1. **Embeddings** (`indexing.py`)
```python
# OLD (300MB+ memory)
from langchain_community.embeddings import HuggingFaceEmbeddings
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

# NEW (<50MB memory)
from langchain_openai import OpenAIEmbeddings
embeddings = OpenAIEmbeddings(model="text-embedding-3-small")
```

### 2. **Dependencies** (`requirements.txt`)
Removed:
- `sentence-transformers<3.0.0` (200MB+)
- `transformers<4.41.0` (100MB+)
- `langchain-huggingface` (50MB+)

### 3. **Render Config** (`render.yaml`)
Added optimizations:
- `--no-cache-dir` during pip install (saves build memory)
- `--workers 1` for uvicorn (single worker = less memory)
- Explicit `plan: free` to ensure 512MB tier

---

## Cost Impact

### Embedding API Costs (OpenAI)
- **Model**: `text-embedding-3-small`
- **Pricing**: $0.02 per 1M tokens (~750k words)
- **Example**: 100 documents (500 words each) = ~67k tokens = **$0.0013** (one-time indexing cost)
- **Query cost**: Negligible (only retrieval, no re-embedding)

**Trade-off**: Pay ~$0.001-0.01 for embeddings vs $7/month for more RAM → **Massive savings!**

---

## Migration Steps

If you already deployed with the old version:

### 1. **Delete Old Vector Store**
The old ChromaDB used HuggingFace embeddings, incompatible with OpenAI embeddings.

```bash
# On Render dashboard or via SSH
rm -rf chroma_store/
```

Or add this to your deployment:
```yaml
# In render.yaml, add a preDeployCommand:
preDeployCommand: rm -rf chroma_store
```

### 2. **Redeploy**
- Push updated code to GitHub
- Render will auto-redeploy
- Documents will be re-indexed with OpenAI embeddings on first startup

### 3. **Verify**
Check logs for:
```
 Creating new Chroma database with X chunks...
 Document indexing complete. Chroma store saved successfully.
```

---

## Performance Comparison

| Metric | Old (HuggingFace) | New (OpenAI) |
|--------|-------------------|--------------|
| **Memory Usage** | 600MB+ | ~200MB |
| **Deployment** | Failed on free tier | Works on free tier |
| **Indexing Speed** | ~5-10s (local) | ~10-20s (API calls) |
| **Query Speed** | Fast (local) | Fast (cached vectors) |
| **Cost** | $0 (but needs $7/mo RAM) | ~$0.001 per 1000 docs |

---

## Troubleshooting

### "Embedding dimension mismatch" error
- **Cause**: Old ChromaDB has HuggingFace embeddings (384 dims), new uses OpenAI (1536 dims)
- **Fix**: Delete `chroma_store/` directory and restart

### "OPENAI_API_KEY not found"
- **Fix**: Set `OPENAI_API_KEY` in Render dashboard environment variables

### Still running out of memory
- Check you're using `--workers 1` in uvicorn command
- Ensure `--no-cache-dir` in pip install
- Verify no other heavy dependencies in `requirements.txt`

---

## Alternative: Keep HuggingFace (Paid Tier)

If you prefer local embeddings and can afford $7/month:

1. Revert `indexing.py`:
 ```python
 from langchain_community.embeddings import HuggingFaceEmbeddings
 embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
 ```

2. Restore `requirements.txt`:
 ```
 sentence-transformers<3.0.0
 transformers<4.41.0
 langchain-huggingface
 ```

3. Upgrade Render plan to **Starter ($7/mo)** with 512MB+ RAM

---

## Recommended: Stick with OpenAI Embeddings

**Why?**
- Free tier compatible
- Better embedding quality (`text-embedding-3-small` > `all-MiniLM-L6-v2`)
- No maintenance (no model updates needed)
- Negligible cost for small projects

**When to use local embeddings?**
- High-volume production (millions of documents)
- Strict data privacy requirements (can't send text to OpenAI)
- Already have infrastructure with sufficient RAM
