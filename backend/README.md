# YC Marketing Agent – Backend

FastAPI backend that runs **social**, **review**, and **website** scraping via [Browser Use Cloud](https://cloud.browser-use.com/). Multiple browser instances run **concurrently** per request; each source returns a **live_url** so you can watch the run in real time.

## Setup

1. **Env** (from project root or `backend/`):
   ```bash
   cp backend/.env.example backend/.env
   # Set BROWSER_USE_API_KEY=... (required)
   # Optionally BROWSER_USE_PROFILE_ID=... for X / LinkedIn / Instagram
   ```

2. **Install & run**:
   ```bash
   cd backend
   pip install -r requirements.txt
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
   Docs: http://localhost:8000/docs

## Endpoints

| Endpoint | Description | Live URLs |
|----------|-------------|-----------|
| **POST /scrape/social** | X, LinkedIn, Instagram, Reddit | One per source in `live_urls` |
| **POST /scrape/reviews** | Google Reviews, Yelp | One per source in `live_urls` |
| **POST /scrape/websites** | Competitor search and/or scrape given URLs | `search` or `scrape` in `live_urls` |

All responses include:
- **results**: structured data per source (or list for websites)
- **live_urls**: map of source → Browser Use Cloud session URL (open in browser to watch)
- **errors**: per-source error message if any

### Examples

**Social** (run X and Reddit in parallel):
```json
POST /scrape/social
{
  "sources": ["x", "instagram", "facebook"],
  "query": "cake shops",
  "location": "San Francisco"
}
```

**Reviews** (Google + Yelp in parallel):
```json
POST /scrape/reviews
{
  "sources": ["google", "yelp"],
  "query": "bakery",
  "location": "San Francisco"
}
```

**Websites** (competitor search, or scrape specific URLs):
```json
POST /scrape/websites
{
  "query": "competitor bakeries",
  "location": "San Francisco"
}
```
Or with URLs:
```json
POST /scrape/websites
{
  "query": "",
  "urls": ["https://example.com", "https://competitor.com"]
}
```

## Concurrency

- **Social** and **Reviews**: one Browser Use Cloud session per requested source; all run in parallel via `asyncio.gather`.
- **Websites**: one session per request (either search or scrape). For multiple URLs, a single agent visits each in sequence; for more parallelism you could call the endpoint multiple times or extend the backend to run one session per URL.

## Agents

- **Social**: `agents/social.py` (X, LinkedIn, Instagram, Reddit)
- **Reviews**: `agents/reviews.py` (Google Maps, Yelp)
- **Websites**: `agents/websites.py` (web search, competitor URL scraping)

Shared session/task logic: `agents/base.py` (creates a session per task and returns `live_url`).
