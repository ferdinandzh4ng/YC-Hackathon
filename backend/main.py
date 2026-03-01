"""
FastAPI backend: social, review, and website scraping via Browser Use Cloud.
Runs multiple browser instances concurrently per endpoint and returns live_urls for each.
Authenticated company/competitor/runs APIs use Supabase.
"""
import asyncio
import logging
import os
from typing import Annotated, Any

logger = logging.getLogger(__name__)
# So add-company flow logs show up in terminal (competitor search, persona scrapes, etc.)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

from dotenv import load_dotenv
from postgrest.exceptions import APIError

# Load .env from backend dir first (before db etc. read env)
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env"))

from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from agents.base import create_session
from agents.reviews import REVIEW_SOURCES, RUNNERS as REVIEW_RUNNERS
from agents.social import RUNNERS as SOCIAL_RUNNERS, SOCIAL_SOURCES
from agents.websites import run_competitor_search
from db import get_current_user_id, get_supabase_admin
from schemas.requests import CompanyCreateRequest, ReviewsScrapeRequest, SocialScrapeRequest, WebsitesScrapeRequest
from schemas.responses import (
    AggregatedFeedback,
    CompanyDetailResponse,
    CompanyListResponse,
    CompanyResponse,
    CompetitorResponse,
    RankingItem,
    ReviewsScrapeResponse,
    ScrapeRunResponse,
    ScrapeRunsListResponse,
    SocialScrapeResponse,
    WebsitesScrapeResponse,
)
from services.company_service import (
    get_aggregated_feedback_for_company,
    get_rankings_for_company,
    run_company_scrapes_parallel,
    run_four_personas_for_competitor,
    run_reviews_for_all_places,
    run_social_for_company,
)

app = FastAPI(
    title="YC Marketing Agent API",
    description="Scrape social (X, Instagram, Facebook), reviews (Google, Yelp), and competitor websites via Browser Use Cloud. All endpoints return live_urls to watch runs.",
    version="0.1.0",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


# ---------- Authenticated company APIs ----------


def _company_to_response(row: dict[str, Any], last_updated: str | None = None) -> CompanyResponse:
    return CompanyResponse(
        id=str(row["id"]),
        name=row["name"],
        market=row.get("market", ""),
        website=row.get("website") or row.get("url"),
        location=row.get("location"),
        created_at=row.get("created_at", ""),
        last_updated=last_updated,
    )


@app.post("/companies", response_model=CompanyResponse)
async def create_company(
    body: CompanyCreateRequest,
    background_tasks: BackgroundTasks,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Create a company, run competitor search (query=name + ' ' + market, location), store competitors, start 4-persona site scrapes in background."""
    logger.info("create_company: starting for name=%r market=%r", body.name, body.market)
    supabase = get_supabase_admin()
    payload: dict[str, Any] = {
        "user_id": user_id,
        "name": body.name,
        "market": body.market,
        "website": body.website or None,
        "url": (body.website or "").strip() or "",  # some schemas have NOT NULL url
        "location": body.location or None,
    }
    try:
        ins = supabase.table("companies").insert(payload).execute()
    except APIError as e:
        err = str(e)
        if "PGRST204" not in err:
            raise
        # Schema missing columns: try without optional fields, then minimal (include url if NOT NULL)
        try:
            minimal = {"user_id": user_id, "name": body.name, "url": (body.website or "").strip() or ""}
            ins = supabase.table("companies").insert(minimal).execute()
        except APIError:
            ins = supabase.table("companies").insert({"user_id": user_id, "name": body.name}).execute()
    if not ins.data or len(ins.data) == 0:
        raise HTTPException(500, detail="Failed to create company")
    company = ins.data[0]
    company_id = str(company["id"])
    logger.info("create_company: company saved id=%s, searching for competitors next", company_id)

    query = f"{body.name} {body.market}".strip()
    location = body.location or ""
    try:
        out, _ = await run_competitor_search(query, location=location, profile_id=DEFAULT_PROFILE_ID)
    except Exception as e:
        logger.warning("create_company: competitor search failed: %s", e, exc_info=True)
        # Still return company; competitors can be added later
        return _company_to_response(company)

    results = out.model_dump()["results"] if out else []
    logger.info("create_company: competitor search done, found %d results", len(results))
    profile_id = DEFAULT_PROFILE_ID
    competitor_tuples: list[tuple[str, str]] = []
    social_competitors: list[tuple[str, str]] = []

    # Add user's own site first (so we scrape 5 sites total: your site + 4 competitors)
    company_website = (body.website or "").strip()
    if company_website:
        self_ins = supabase.table("competitors").insert({
            "company_id": company_id,
            "url": company_website,
            "name": body.name or "Your site",
        }).execute()
        if self_ins.data and len(self_ins.data) > 0:
            competitor_tuples.append((str(self_ins.data[0]["id"]), company_website))

    for item in results[:4]:  # cap at 4 competitors (5 sites total with your site)
        url = (item.get("url") or "").strip()
        if not url:
            continue
        name = item.get("name") or url
        comp_ins = supabase.table("competitors").insert({
            "company_id": company_id,
            "url": url,
            "name": name,
        }).execute()
        if not comp_ins.data or len(comp_ins.data) == 0:
            continue
        competitor_id = str(comp_ins.data[0]["id"])
        competitor_tuples.append((competitor_id, url))
        social_competitors.append((competitor_id, name))

    background_tasks.add_task(
        run_company_scrapes_parallel,
        company_id,
        query,
        location,
        competitor_tuples,
        social_competitors,
        profile_id,
    )
    logger.info("create_company: saved %d sites, queued site + reviews + social (yours + %d competitors, all at once). Returning.", len(competitor_tuples), len(social_competitors))
    return _company_to_response(company)


@app.get("/companies", response_model=CompanyListResponse)
async def list_companies(user_id: Annotated[str, Depends(get_current_user_id)]):
    """List companies for the current user, with last_updated from most recent scrape run."""
    supabase = get_supabase_admin()
    r = supabase.table("companies").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    rows = r.data or []
    if not rows:
        return CompanyListResponse(companies=[])
    company_ids = [str(c["id"]) for c in rows]
    runs = supabase.table("scrape_runs").select("company_id, completed_at").in_("company_id", company_ids).order("completed_at", desc=True).execute()
    last_updated_map: dict[str, str] = {}
    for run in (runs.data or []):
        cid = str(run.get("company_id", ""))
        if cid and cid not in last_updated_map and run.get("completed_at"):
            last_updated_map[cid] = str(run["completed_at"])
    companies = [_company_to_response(row, last_updated=last_updated_map.get(str(row["id"]))) for row in rows]
    return CompanyListResponse(companies=companies)


@app.delete("/companies/{company_id}", status_code=204)
async def delete_company(
    company_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Delete a company (and its competitors, runs, feedback, reviews, social items via cascade)."""
    supabase = get_supabase_admin()
    existing = supabase.table("companies").select("id").eq("id", company_id).eq("user_id", user_id).execute()
    if not existing.data or len(existing.data) == 0:
        raise HTTPException(404, detail="Company not found")
    supabase.table("companies").delete().eq("id", company_id).eq("user_id", user_id).execute()
    return None


@app.get("/companies/{company_id}", response_model=CompanyDetailResponse)
async def get_company(
    company_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Get company with competitors, aggregated feedback, rankings, review_items, social_items."""
    supabase = get_supabase_admin()
    comp = supabase.table("companies").select("*").eq("id", company_id).eq("user_id", user_id).execute()
    if not comp.data or len(comp.data) == 0:
        raise HTTPException(404, detail="Company not found")
    company = _company_to_response(comp.data[0])

    competitors = supabase.table("competitors").select("id, url, name").eq("company_id", company_id).execute()
    competitor_list = [{"id": str(c["id"]), "url": c["url"], "name": c.get("name")} for c in (competitors.data or [])]

    aggregated_feedback = get_aggregated_feedback_for_company(supabase, company_id)
    rankings = get_rankings_for_company(supabase, company_id)

    review_rows = supabase.table("review_items").select("*").eq("company_id", company_id).execute()
    review_items = [dict(r) for r in (review_rows.data or [])]

    social_rows = supabase.table("social_items").select("*").eq("company_id", company_id).execute()
    social_items = [dict(s) for s in (social_rows.data or [])]

    return CompanyDetailResponse(
        company=company,
        competitors=[CompetitorResponse(**c) for c in competitor_list],
        aggregated_feedback=[AggregatedFeedback(**f) for f in aggregated_feedback],
        rankings=[RankingItem(**r) for r in rankings],
        review_items=review_items,
        social_items=social_items,
    )


@app.post("/companies/{company_id}/scrape/social")
async def start_social_scrape(
    company_id: str,
    background_tasks: BackgroundTasks,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Queue social scrapes (X, LinkedIn, Instagram, Reddit) for this company. Runs in background; check Scrapers tab for runs and live_urls."""
    supabase = get_supabase_admin()
    comp = supabase.table("companies").select("id, name, market, location").eq("id", company_id).eq("user_id", user_id).execute()
    if not comp.data or len(comp.data) == 0:
        raise HTTPException(404, detail="Company not found")
    row = comp.data[0]
    query = f"{row.get('name') or ''} {row.get('market') or ''}".strip() or row.get("name") or "bakery"
    location = (row.get("location") or "").strip()
    profile_id = DEFAULT_PROFILE_ID
    background_tasks.add_task(run_social_for_company, company_id, query, location, profile_id)
    logger.info("start_social_scrape: queued social scrapes for company_id=%s", company_id)
    return {"message": "Social scrapes queued (X, Instagram, Facebook). Check the Scrapers tab to watch runs.", "company_id": company_id}


@app.get("/companies/{company_id}/runs", response_model=ScrapeRunsListResponse)
async def list_company_runs(
    company_id: str,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """List scrape runs for the company (for scrapers page): sites, status, live_url. agents_running_count = count where status=running."""
    supabase = get_supabase_admin()
    comp = supabase.table("companies").select("id").eq("id", company_id).eq("user_id", user_id).execute()
    if not comp.data or len(comp.data) == 0:
        raise HTTPException(404, detail="Company not found")

    runs = supabase.table("scrape_runs").select("id, competitor_id, type, status, live_url, started_at, completed_at, error_message, metadata").eq("company_id", company_id).order("started_at", desc=True).execute()
    run_list = runs.data or []
    agents_running = sum(1 for r in run_list if r.get("status") == "running")
    run_responses = [
        ScrapeRunResponse(
            id=str(r["id"]),
            competitor_id=str(r["competitor_id"]) if r.get("competitor_id") else None,
            type=r["type"],
            status=r["status"],
            live_url=r.get("live_url"),
            started_at=str(r.get("started_at", "")),
            completed_at=str(r["completed_at"]) if r.get("completed_at") else None,
            error_message=r.get("error_message"),
            metadata=r.get("metadata"),
        )
        for r in run_list
    ]
    return ScrapeRunsListResponse(runs=run_responses, agents_running_count=agents_running)


def _enqueue_rescrape_for_companies(
    background_tasks: BackgroundTasks,
    supabase,
    company_rows: list[dict],
    profile_id: str | None,
) -> None:
    """Queue review + site rescrape tasks for the given companies."""
    for row in company_rows:
        company_id = str(row["id"])
        name = (row.get("name") or "").strip()
        location = (row.get("location") or "").strip()
        comps = supabase.table("competitors").select("id, url, name").eq("company_id", company_id).execute()
        comp_list = comps.data or []
        review_places = [name] + [(c.get("name") or c.get("url") or "").strip() for c in comp_list if (c.get("name") or c.get("url") or "").strip()]
        background_tasks.add_task(run_reviews_for_all_places, company_id, review_places, location, profile_id)
        for c in comp_list:
            comp_id = str(c["id"])
            url = (c.get("url") or "").strip()
            if url:
                background_tasks.add_task(run_four_personas_for_competitor, company_id, comp_id, url, profile_id)


@app.post("/companies/rescrape-all")
async def rescrape_my_companies(
    background_tasks: BackgroundTasks,
    user_id: Annotated[str, Depends(get_current_user_id)],
):
    """Rescrape all of the current user's companies (reviews + site personas). Call from the site with Bearer token; no cron secret needed."""
    supabase = get_supabase_admin()
    companies = supabase.table("companies").select("id, name, location").eq("user_id", user_id).execute()
    rows = companies.data or []
    _enqueue_rescrape_for_companies(background_tasks, supabase, rows, DEFAULT_PROFILE_ID)
    return {"ok": True, "companies_queued": len(rows)}


@app.post("/cron/daily-rescrape")
async def daily_rescrape(
    background_tasks: BackgroundTasks,
    x_cron_secret: str | None = Header(None, alias="X-Cron-Secret"),
):
    """Rescrape all companies (all users). Use from cron with X-Cron-Secret. For UI, use POST /companies/rescrape-all with Bearer token instead."""
    secret = os.getenv("CRON_SECRET")
    if secret and x_cron_secret != secret:
        raise HTTPException(401, detail="Invalid or missing X-Cron-Secret")

    supabase = get_supabase_admin()
    companies = supabase.table("companies").select("id, name, location").execute()
    rows = companies.data or []
    _enqueue_rescrape_for_companies(background_tasks, supabase, rows, DEFAULT_PROFILE_ID)
    return {"ok": True, "companies_queued": len(rows)}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
