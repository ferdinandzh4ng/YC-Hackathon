# YC Marketing Agent

Proof-of-concept: scrape X (Twitter), Reddit, and Google Reviews for cake shops / bakeries in San Francisco using [Browser Use Cloud](https://cloud.browser-use.com/) (AI Agent Tasks).

## Setup

1. **API key**  
   Get a key from [Browser Use Cloud](https://cloud.browser-use.com/) and set it in a `.env` file:

   ```bash
   cp .env.example .env
   # Edit .env and set BROWSER_USE_API_KEY=your_key
   ```

2. **Python**  
   Use Python 3.11+ (or 3.9+). Create a virtualenv and install dependencies:

   ```bash
   python -m venv .venv
   .venv\Scripts\activate   # Windows
   # source .venv/bin/activate  # macOS/Linux
   pip install -r requirements.txt
   ```

## Run the PoC

From the project root:

**X (Twitter)** — requires a synced profile (see below):

```bash
python scripts/poc_x_cake_shops_sfo.py
```

Output: `data/x_cake_shops_sfo.json` (handle, display name, tweet text, url per item).

**Reddit** — works without login; profile optional:

```bash
python scripts/poc_reddit_cake_shops_sfo.py
```

Output: `data/reddit_cake_shops_sfo.json` (subreddit, title, author, post_text, url per item).

**Google Reviews** — works without login; profile optional:

```bash
python scripts/poc_google_reviews_cake_shops_sfo.py
```

Output: `data/google_reviews_cake_shops_sfo.json` (place_name, rating, review_text, reviewer_name, url per review). The agent searches Google Maps for bakeries/cake shops in SF and extracts reviews from the listed places.

All scripts stream agent steps to stdout and print the structured output.

### X login wall (required for search)

X blocks unauthenticated search, so the PoC returns empty results unless you use a **synced profile** (cookies auth):

1. **Sync your local browser cookies to a Cloud profile**  
   In a terminal (with `BROWSER_USE_API_KEY` set):
   ```bash
   export BROWSER_USE_API_KEY=your_key && curl -fsSL https://browser-use.com/profile.sh | sh
   ```
   A browser opens; log into X (and any other sites you want). When syncing finishes, you get a `profile_id`.

2. **Add the profile to `.env`**  
   List your profiles at [cloud.browser-use.com/settings?tab=profiles](https://cloud.browser-use.com/settings?tab=profiles), copy the profile ID, then in `.env`:
   ```
   BROWSER_USE_PROFILE_ID=profile_xxxxx
   ```

3. **Run the script again**  
   The script will create a session with that profile and run the task logged in, so X search results are returned.

## Backend (FastAPI)

The **`backend/`** folder provides a FastAPI API with three scrape endpoints (social, reviews, websites). Multiple Browser Use Cloud instances run **concurrently**; each response includes **live_urls** so you can watch each run.

- **POST /scrape/social** — X, LinkedIn, Instagram, Reddit  
- **POST /scrape/reviews** — Google Reviews, Yelp  
- **POST /scrape/websites** — competitor web search and/or scrape given URLs  

See [backend/README.md](backend/README.md) for setup and examples.
