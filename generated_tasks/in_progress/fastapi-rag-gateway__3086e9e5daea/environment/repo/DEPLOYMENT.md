# Deployment Guide

> ** Memory Optimized for Free Tier**: This project now uses OpenAI API embeddings instead of local sentence-transformers, reducing memory usage from 600MB+ to ~200MB. **Fully compatible with Render's 512MB free tier!**

## Quick Deploy Options

### Option 1: Render (Recommended - Free Tier)

**Steps:**
1. Go to [render.com](https://render.com) and sign up
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub account and select `FastAPI_RAG_Gateway`
4. Render will auto-detect `render.yaml`
5. Add environment variables in the dashboard:
 - `OPENAI_API_KEY` = your OpenAI key
 - `OPENROUTER_API_KEY` = your OpenRouter key
6. Click **"Create Web Service"**
7. Wait 5-10 minutes for deployment

**Your API will be live at:** `https://fastapi-rag-gateway.onrender.com`

**Note:** Free tier sleeps after 15 minutes of inactivity. First request after sleep takes ~30 seconds.

---

### Option 2: Railway (Easy, $5/month)

**Steps:**
1. Install Railway CLI:
 ```bash
 npm i -g @railway/cli
 ```

2. Login and initialize:
 ```bash
 railway login
 railway init
 ```

3. Set environment variables:
 ```bash
 railway variables set OPENAI_API_KEY="your_key"
 railway variables set OPENROUTER_API_KEY="your_key"
 railway variables set RAG_LLM_MODEL="deepseek/deepseek-chat"
 railway variables set RAG_LLM_BASE_URL="https://openrouter.ai/api/v1"
 ```

4. Deploy:
 ```bash
 railway up
 ```

5. Get your URL:
 ```bash
 railway domain
 ```

---

### Option 3: Fly.io (Free $5 credit)

**Steps:**
1. Install Fly CLI:
 ```bash
 curl -L https://fly.io/install.sh | sh
 ```

2. Login:
 ```bash
 fly auth login
 ```

3. Launch (from project directory):
 ```bash
 fly launch
 ```
 - Choose a unique app name
 - Select region closest to you
 - Don't deploy yet (say No)

4. Set secrets:
 ```bash
 fly secrets set OPENAI_API_KEY="your_key"
 fly secrets set OPENROUTER_API_KEY="your_key"
 ```

5. Deploy:
 ```bash
 fly deploy
 ```

**Your API will be live at:** `https://your-app-name.fly.dev`

---

### Option 4: Docker (Self-hosted)

**Build and run locally:**
```bash
docker build -t fastapi-rag-gateway .
docker run -p 8000:8000 \
 -e OPENAI_API_KEY="your_key" \
 -e OPENROUTER_API_KEY="your_key" \
 -e RAG_LLM_MODEL="deepseek/deepseek-chat" \
 -e RAG_LLM_BASE_URL="https://openrouter.ai/api/v1" \
 fastapi-rag-gateway
```

**Deploy to any cloud with Docker support** (AWS ECS, Google Cloud Run, Azure Container Instances, DigitalOcean App Platform)

---

## Testing Your Deployment

Once deployed, test with:

```bash
curl -X POST "https://your-deployment-url.com/query" \
 -H "Content-Type: application/json" \
 -d '{"question": "What is machine learning?"}'
```

Or visit `https://your-deployment-url.com/docs` for interactive API documentation.

---

## Cost Comparison

| Platform | Free Tier | Paid | Pros | Cons |
|----------|-----------|------|------|------|
| **Render** | 750hrs/mo | $7/mo | Easy, auto-deploy from GitHub | Sleeps after 15min inactivity |
| **Railway** | $5/mo | Fast, no sleep, great DX | No free tier |
| **Fly.io** | $5 credit | ~$3/mo | Fast, global edge network | Complex pricing |
| **Docker** | Self-hosted | Varies | Full control | Requires infrastructure |

---

## Important Notes

1. **API Keys Security**: Never commit `.env` to GitHub. Use platform secret managers.

2. **ChromaDB Persistence**:
 - On first deployment, documents will be indexed automatically
 - Vector store is ephemeral on free tiers (rebuilds on restart)
 - For production, use persistent volumes or external vector DB

3. **Cold Starts**:
 - Free tiers may have 30-60s cold start times
 - Paid tiers have instant wake-up

4. **Memory Requirements**:
 - **Optimized for 512MB RAM** (Render free tier compatible)
 - Uses OpenAI API embeddings instead of local models
 - Memory footprint: ~150-250MB (well within free tier limits)

---

## Troubleshooting

**Deployment fails with "Out of Memory":**
- **FIXED**: Now uses OpenAI embeddings (API-based, minimal memory)
- Previous issue: sentence-transformers used 300MB+ RAM
- Current solution: <50MB for embeddings, fits in 512MB free tier

**"OPENAI_API_KEY not found" error:**
- Ensure environment variables are set in platform dashboard
- Check spelling and no extra spaces

**Slow first query:**
- Normal on free tiers (cold start)
- Consider paid tier or keep-alive pings

---

## Next Steps

- Add authentication (API keys, OAuth)
- Implement rate limiting
- Add monitoring (Sentry, LogTail)
- Set up CI/CD with GitHub Actions
- Add more documents to `/data` folder
