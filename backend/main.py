"""
FastAPI backend: social, review, and website scraping via Browser Use Cloud.
Runs multiple browser instances concurrently per endpoint and returns live_urls for each.
"""
import asyncio
import os
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse


from agents.base import create_session
from agents.reviews import REVIEW_SOURCES, RUNNERS as REVIEW_RUNNERS
from agents.social import RUNNERS as SOCIAL_RUNNERS, SOCIAL_SOURCES
from agents.websites import run_competitor_scrape, run_competitor_search
from schemas.requests import ReviewsScrapeRequest, SocialScrapeRequest, WebsitesScrapeRequest
from schemas.responses import (
    ReviewsScrapeResponse,
    SocialScrapeResponse,
    WebsitesScrapeResponse,
)

load_dotenv()

app = FastAPI(
    title="YC Marketing Agent API",
    description="Scrape social (X, LinkedIn, Instagram, Reddit), reviews (Google, Yelp), and competitor websites via Browser Use Cloud. All endpoints return live_urls to watch runs.",
    version="0.1.0",
)

BROWSER_USE_API_KEY = os.getenv("BROWSER_USE_API_KEY")
DEFAULT_PROFILE_ID = os.getenv("BROWSER_USE_PROFILE_ID")


@app.on_event("startup")
async def check_config():
    if not BROWSER_USE_API_KEY:
        raise RuntimeError("Set BROWSER_USE_API_KEY in .env (see backend/.env.example)")


def _profile_id(request_value: str | None) -> str | None:
    return request_value or DEFAULT_PROFILE_ID


@app.get("/")
async def root():
    return {"message": "YC Marketing Agent API", "docs": "/docs", "endpoints": ["/scrape/social", "/scrape/reviews", "/scrape/websites"]}


@app.post("/scrape/social", response_model=SocialScrapeResponse)
async def scrape_social(body: SocialScrapeRequest) -> SocialScrapeResponse:
    """Run social media scraping (X, LinkedIn, Instagram, Reddit) in parallel. Returns results and a live_url per source."""
    invalid = set(body.sources) - SOCIAL_SOURCES
    if invalid:
        raise HTTPException(422, detail=f"Invalid sources: {invalid}. Allowed: {list(SOCIAL_SOURCES)}")
    if not body.sources:
        raise HTTPException(422, detail="At least one source required")

    profile = _profile_id(body.profile_id)
    query, location = body.query, body.location or ""

    async def run_one(source: str):
        runner = SOCIAL_RUNNERS[source]
        try:
            out, live_url = await runner(query, location=location, profile_id=profile)
            results = out.model_dump()["results"] if out else []
            return source, results, live_url or "", None
        except Exception as e:
            return source, [], "", str(e)

    tasks = [run_one(s) for s in body.sources]
    outcomes = await asyncio.gather(*tasks, return_exceptions=True)

    results: dict[str, list[dict[str, Any]]] = {}
    live_urls: dict[str, str] = {}
    errors: dict[str, str] = {}

    for item in outcomes:
        if isinstance(item, Exception):
            errors["_"] = str(item)
            continue
        source, res, live, err = item
        results[source] = res
        if live:
            live_urls[source] = live
        if err:
            errors[source] = err

    return SocialScrapeResponse(results=results, live_urls=live_urls, errors=errors)


@app.post("/scrape/reviews", response_model=ReviewsScrapeResponse)
async def scrape_reviews(body: ReviewsScrapeRequest) -> ReviewsScrapeResponse:
    """Run review scraping (Google, Yelp) in parallel. Returns results and a live_url per source."""
    print(f"[reviews] Request received: sources={body.sources} query={body.query!r}", flush=True)
    invalid = set(body.sources) - REVIEW_SOURCES
    if invalid:
        raise HTTPException(422, detail=f"Invalid sources: {invalid}. Allowed: {list(REVIEW_SOURCES)}")
    if not body.sources:
        raise HTTPException(422, detail="At least one source required")

    profile = _profile_id(body.profile_id)
    query, location = body.query, body.location or ""

    async def run_one(source: str):
        runner = REVIEW_RUNNERS[source]
        try:
            out, live_url = await runner(query, location=location, profile_id=profile)
            results = out.model_dump()["results"] if out else []
            return source, results, live_url or "", None
        except Exception as e:
            return source, [], "", str(e)

    tasks = [run_one(s) for s in body.sources]
    print(f"[reviews] Running {len(tasks)} agent(s)...", flush=True)
    outcomes = await asyncio.gather(*tasks, return_exceptions=True)
    print("[reviews] Agents finished.", flush=True)

    results = {}
    live_urls = {}
    errors = {}
    for item in outcomes:
        if isinstance(item, Exception):
            errors["_"] = str(item)
            continue
        source, res, live, err = item
        results[source] = res
        if live:
            live_urls[source] = live
        if err:
            errors[source] = err

    return ReviewsScrapeResponse(results=results, live_urls=live_urls, errors=errors)


@app.post("/scrape/reviews/stream")
async def scrape_reviews_stream(body: ReviewsScrapeRequest):
    """
    Same as POST /scrape/reviews but streams the response: first chunk is live_urls (so you can
    open and watch the run immediately), second chunk is the full results when the agent finishes.
    Consume as NDJSON (one JSON object per line).
    """
    invalid = set(body.sources) - REVIEW_SOURCES
    if invalid:
        raise HTTPException(422, detail=f"Invalid sources: {invalid}. Allowed: {list(REVIEW_SOURCES)}")
    if not body.sources:
        raise HTTPException(422, detail="At least one source required")

    profile = _profile_id(body.profile_id)
    query, location = body.query, body.location or ""

    async def stream():
        import json as _json
        # 1) Create one session per source so we get live_urls immediately
        session_ids: dict[str, str] = {}
        live_urls: dict[str, str] = {}
        for source in body.sources:
            sid, lurl = await create_session(profile)
            session_ids[source] = sid
            if lurl:
                live_urls[source] = lurl
        # 2) Send live_urls right away so client can open and watch
        yield _json.dumps({"live_urls": live_urls, "status": "running"}) + "\n"

        # 3) Run agents with those sessions
        async def run_one(source: str):
            runner = REVIEW_RUNNERS[source]
            try:
                out, _ = await runner(
                    query, location=location,
                    session_id=session_ids[source],
                    live_url=live_urls.get(source),
                )
                results = out.model_dump()["results"] if out else []
                return source, results, live_urls.get(source) or "", None
            except Exception as e:
                return source, [], live_urls.get(source) or "", str(e)

        tasks = [run_one(s) for s in body.sources]
        outcomes = await asyncio.gather(*tasks, return_exceptions=True)

        results = {}
        errors = {}
        for item in outcomes:
            if isinstance(item, Exception):
                errors["_"] = str(item)
                continue
            source, res, live, err = item
            results[source] = res
            if live and source not in live_urls:
                live_urls[source] = live
            if err:
                errors[source] = err

        # 4) Send full response
        yield _json.dumps({
            "results": results,
            "live_urls": live_urls,
            "errors": errors,
            "status": "done",
        }) + "\n"

    return StreamingResponse(
        stream(),
        media_type="application/x-ndjson",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.post("/scrape/websites", response_model=WebsitesScrapeResponse)
async def scrape_websites(body: WebsitesScrapeRequest) -> WebsitesScrapeResponse:
    """Run competitor discovery (web search) and/or scrape specific URLs. Returns results and live_url(s)."""
    profile = _profile_id(body.profile_id)
    results: list[dict[str, Any]] = []
    live_urls: dict[str, str] = {}
    errors: dict[str, str] = {}

    if body.urls:
        try:
            out, live_url = await run_competitor_scrape(body.urls, profile_id=profile)
            if out:
                results = out.model_dump()["results"]
            if live_url:
                live_urls["scrape"] = live_url
        except Exception as e:
            errors["scrape"] = str(e)
    else:
        try:
            out, live_url = await run_competitor_search(body.query, location=body.location or "", profile_id=profile)
            if out:
                results = out.model_dump()["results"]
            if live_url:
                live_urls["search"] = live_url
        except Exception as e:
            errors["search"] = str(e)

    return WebsitesScrapeResponse(results=results, live_urls=live_urls, errors=errors)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
