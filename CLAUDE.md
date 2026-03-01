# YC Marketing Agent

AI-powered competitive intelligence platform. Users enter their business + market, the system discovers competitors, scrapes their websites/reviews/socials through AI browser agents, analyzes everything through multiple personas, and delivers a market analysis dashboard.

## Stack

- **Backend:** FastAPI (Python) on port 8000
- **Frontend:** Next.js 16 / React 19 / Tailwind 4 on port 3000
- **Database:** Supabase (Postgres + Auth + RLS)
- **Scraping:** Browser Use Cloud SDK (AI-controlled headless browsers)

## Project Structure

```
backend/
  main.py                      # FastAPI app — scraping endpoints + company CRUD + cron
  db.py                        # Supabase client (service role) + JWT auth (HS256 + JWKS)
  agents/
    base.py                    # Browser Use Cloud: create_session() + run_task()
    reviews.py                 # Google Maps + Yelp scrapers
    social.py                  # X, Reddit, LinkedIn, Instagram scrapers
    websites.py                # Competitor discovery + 4-persona site analysis
  services/
    company_service.py         # Orchestration: persona runs, social runs, rankings, aggregation
  schemas/
    requests.py                # Pydantic request models
    responses.py               # Pydantic response models (includes metadata on ScrapeRunResponse)
frontend/
  src/app/                     # App router: login, signup, companies list, company/[id] detail
  src/components/              # AnalyticsTab, ScrapersTab, RankingTable, carousels, Sidebar
  src/lib/api.ts               # apiFetch wrapper + TypeScript interfaces
  src/lib/supabase.ts          # Supabase browser client
  src/middleware.ts             # Supabase auth middleware (deprecated — Next.js 16 wants "proxy")
supabase/migrations/           # 2 migrations: initial schema + add location column
scripts/                       # Standalone PoC scraper scripts (Google, Reddit, X)
data/                          # Sample scraped data (cake shops SF)
```

## Database Schema (Supabase)

6 tables, all with RLS:

| Table | Purpose |
|---|---|
| `companies` | User's business entries (name, market, website, location) |
| `competitors` | Discovered competitor URLs per company |
| `scrape_runs` | One row per agent run: type (`site`/`social`/`reviews_google`/`reviews_yelp`), status, live_url, metadata (JSONB) |
| `site_feedback` | Per-persona per-competitor: rating, summary, pros[], cons[] |
| `review_items` | Google/Yelp reviews stored per company (source, place_name, rating, review_text) |
| `social_items` | Social posts per company (source, handle_or_author, display_name, text, url) |

## Backend Agents

All agents use Browser Use Cloud via `agents/base.py` — each gets a natural-language task + Pydantic output schema, returns structured JSON + live_url for watching.

- **reviews.py** — `run_google_reviews()`, `run_yelp_reviews()` — accept `session_id`/`live_url` for streaming
- **social.py** — `run_x()`, `run_instagram()`, `run_facebook()` — all accept `session_id`/`live_url`
- **websites.py** — `run_competitor_search()` (Google/Bing discovery), `run_competitor_scrape()` (visit specific URLs), `run_competitor_scrape_single_persona()` (4 personas: elderly, new_user, frustrated, enthusiast)

## Company Creation Pipeline

`POST /companies` flow:
1. Insert company row
2. `run_competitor_search()` — discover up to 5 competitors (await)
3. Insert competitor rows
4. Background: `run_all_competitor_site_scrapes_parallel()` — runs 4 persona scrapes per competitor, all competitors in parallel
5. Background: `run_social_for_company()` — runs X/LinkedIn/Instagram/Reddit in parallel, persists to `social_items`

## API Endpoints

**Public scraping (no auth):**
- `POST /scrape/social` — parallel social scrapes, returns results + live_urls
- `POST /scrape/reviews` — parallel review scrapes
- `POST /scrape/reviews/stream` — NDJSON streaming (live_urls first, then results)
- `POST /scrape/websites` — competitor discovery or URL scraping

**Authenticated (Bearer JWT):**
- `POST /companies` — create + discover competitors + enqueue scrapes
- `GET /companies` — list user's companies
- `GET /companies/{id}` — full detail (competitors, feedback, rankings, reviews, socials)
- `GET /companies/{id}/runs` — scrape run statuses + `agents_running_count`
- `POST /companies/rescrape-all` — rescrape all user's companies
- `POST /cron/daily-rescrape` — cron endpoint (X-Cron-Secret header)

## Known Bugs

1. **`run_reviews_for_company` still referenced in rescrape** — `main.py:441` calls it in `_enqueue_rescrape_for_companies` but it's not imported. The function exists in `company_service.py` (from earlier fix) but the import was reverted. Rescrape endpoints will crash.
2. **`run_competitor_scrape` not imported in `main.py`** — `scrape_websites` endpoint (line 253) calls it but only `run_competitor_search` is imported. Runtime crash on `/scrape/websites` with URLs.
3. **`run_four_personas_for_competitor` not imported in `main.py`** — used in `_enqueue_rescrape_for_companies` (line 447) but not in the current imports.
4. **`backend/requirements.txt` incomplete** — missing `supabase` and `httpx` (used in `db.py`). Has `PyJWT[crypto]` but no `supabase`.
5. **`schemas/__init__.py` only exports 3 scraping schemas** — company/detail response models not re-exported.
6. **Frontend needs `.env.local`** — `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` must be set or middleware crashes.
7. **CORS only allows port 3000** — if frontend runs on 3001 (port conflict), API calls will fail.
8. **Next.js 16 deprecation** — `middleware.ts` convention is deprecated, should migrate to `proxy`.

## Environment Variables

```
# backend/.env
BROWSER_USE_API_KEY=           # Browser Use Cloud API key (required)
BROWSER_USE_PROFILE_ID=        # Browser profile with logged-in sessions (X, LinkedIn, Insta)
SUPABASE_URL=                  # Supabase project URL
SUPABASE_ANON_KEY=             # Supabase anon key
SUPABASE_SERVICE_ROLE_KEY=     # Supabase service role key (bypasses RLS)
SUPABASE_JWT_SECRET=           # For HS256 JWT verification
CRON_SECRET=                   # Protects /cron/daily-rescrape

# frontend/.env.local
NEXT_PUBLIC_SUPABASE_URL=      # Same Supabase URL
NEXT_PUBLIC_SUPABASE_ANON_KEY= # Supabase anon key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Commands

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000

# Frontend
cd frontend && npm install && npm run dev

# PoC scripts (standalone)
python scripts/poc_google_reviews_cake_shops_sfo.py
```

---

## Roadmap

### Phase 1 — Fix & Stabilize
- [ ] Fix missing imports in `main.py`: `run_competitor_scrape`, `run_reviews_for_company`, `run_four_personas_for_competitor`
- [ ] Fix `backend/requirements.txt`: add `supabase`, `httpx`
- [ ] Fix `schemas/__init__.py`: export all models
- [ ] Add CORS for port 3001 (or dynamic)
- [ ] Wire review scraping into company creation pipeline
- [ ] Create `frontend/.env.example` with required vars

### Phase 2 — Market Analysis Engine
- [ ] Consolidation agent: synthesize reviews + social + site analysis into unified report
- [ ] Market positioning map (user vs competitors)
- [ ] Trend/sentiment analysis across all sources

### Phase 3 — Competitor Watching (Cron)
- [ ] Fix daily rescrape (needs working imports)
- [ ] Configurable scrape frequency
- [ ] Diff detection + alerts when competitors change
- [ ] Historical snapshots + trend dashboard

### Phase 4 — Social Intelligence
- [ ] Scrape follower counts, posting frequency, engagement rates
- [ ] Identify highest-engagement posts per competitor
- [ ] Analyze what makes top posts work (format, tone, timing)

### Phase 5 — Content Generation
- [ ] Generate posts using Google Nano/Banana + Veo3
- [ ] Posts informed by competitor analysis + engagement patterns
- [ ] Multi-platform output (Insta, LinkedIn, X)
- [ ] Image/video generation

### Phase 6 — User Site Optimization
- [ ] Run 4-persona analysis on user's own site
- [ ] Generate UX/copy recommendations from persona feedback
- [ ] Compare user scores vs competitor averages

### Phase 7 — Outreach
- [ ] Scrape competitor follower lists
- [ ] Generate personalized DM templates
- [ ] Campaign management with rate limiting + compliance
