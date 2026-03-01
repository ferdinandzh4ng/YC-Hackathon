"""
Company + competitor + scrape run logic.
Starts 4 persona scrapes per competitor and stores results.
"""
import asyncio
import logging
import os
import re

logger = logging.getLogger(__name__)
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

from agents.base import create_session
from agents.reviews import RUNNERS as REVIEW_RUNNERS
from agents.social import RUNNERS as SOCIAL_RUNNERS
from agents.websites import PERSONAS, run_competitor_scrape_single_persona, run_competitor_search
from db import get_supabase_admin

SOCIAL_SOURCES_ORDERED = ["x", "instagram", "reddit"]
REVIEW_SOURCES_ORDERED = ["google", "yelp"]

DEFAULT_PROFILE_ID = os.getenv("BROWSER_USE_PROFILE_ID")


def _parse_rating(r: str) -> float:
    """Parse rating_compelled_to_buy to 1-10 number."""
    if not r:
        return 0.0
    r = r.strip().lower()
    # "7/10" or "7 out of 10"
    m = re.search(r"(\d+(?:\.\d+)?)\s*/\s*10", r)
    if m:
        return min(10.0, max(0.0, float(m.group(1))))
    m = re.search(r"(\d+(?:\.\d+)?)", r)
    if m:
        return min(10.0, max(0.0, float(m.group(1))))
    if "high" in r or "great" in r:
        return 8.0
    if "medium" in r or "mid" in r:
        return 5.0
    if "low" in r:
        return 2.0
    return 5.0


async def run_four_personas_for_competitor(
    company_id: str,
    competitor_id: str,
    url: str,
    profile_id: str | None,
) -> None:
    """Create 4 scrape_runs, run 4 persona tasks in parallel, store site_feedback and update runs."""
    logger.info("run_four_personas: starting for competitor url=%s (company_id=%s)", url[:60], company_id)
    supabase = get_supabase_admin()
    persona_keys = list(PERSONAS.keys())

    # Create 4 run rows (status=running) and get their ids
    rows_to_insert = [
        {"company_id": company_id, "competitor_id": competitor_id, "type": "site", "status": "running"}
        for _ in persona_keys
    ]
    insert_result = supabase.table("scrape_runs").insert(rows_to_insert).execute()
    run_ids = [r["id"] for r in (insert_result.data or [])] if insert_result.data else []
    if len(run_ids) != 4:
        logger.warning("run_four_personas: failed to create 4 run rows for %s", url[:60])
        return

    async def run_one(run_id: str, persona_key: str) -> None:
        logger.info("run_four_personas: persona %s starting for %s", persona_key, url[:50])
        session_id, live_url = await create_session(profile_id)
        supabase.table("scrape_runs").update({
            "live_url": live_url,
        }).eq("id", run_id).execute()

        try:
            result, _ = await run_competitor_scrape_single_persona(
                url, persona_key, profile_id=profile_id, session_id=session_id, live_url=live_url
            )
            if result:
                supabase.table("site_feedback").insert({
                    "run_id": run_id,
                    "competitor_id": competitor_id,
                    "url": result.url,
                    "persona": persona_key,
                    "rating_compelled_to_buy": result.rating_compelled_to_buy,
                    "summary": result.summary,
                    "pros": result.pros or [],
                    "cons": result.cons or [],
                }).execute()
            supabase.table("scrape_runs").update({
                "status": "done",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()
            logger.info("run_four_personas: persona %s done for %s", persona_key, url[:50])
        except Exception as e:
            logger.warning("run_four_personas: persona %s failed for %s: %s", persona_key, url[:50], e)
            supabase.table("scrape_runs").update({
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()

    await asyncio.gather(*[run_one(run_ids[i], persona_keys[i]) for i in range(4)])
    logger.info("run_four_personas: all 4 personas finished for %s", url[:60])


async def run_all_competitor_site_scrapes_parallel(
    company_id: str,
    competitors: list[tuple[str, str]],
    profile_id: str | None,
) -> None:
    """Run 4-persona site scrapes for all competitors in parallel (all 5 sites at once)."""
    if not competitors:
        return
    logger.info("run_all_competitor_site_scrapes_parallel: starting %d competitors at once", len(competitors))
    await asyncio.gather(*[
        run_four_personas_for_competitor(company_id, cid, url, profile_id)
        for cid, url in competitors
    ])
    logger.info("run_all_competitor_site_scrapes_parallel: all %d competitors finished", len(competitors))


async def run_company_scrapes_parallel(
    company_id: str,
    query: str,
    location: str,
    competitor_tuples: list[tuple[str, str]],
    social_competitors: list[tuple[str, str]],
    profile_id: str | None,
) -> None:
    """Run site scrapes, reviews, our-company social, and per-competitor social all at the same time (parallel)."""
    logger.info("run_company_scrapes_parallel: starting site + reviews + social (yours + %d competitors) for company_id=%s", len(social_competitors), company_id)
    site_task = (
        run_all_competitor_site_scrapes_parallel(company_id, competitor_tuples, profile_id)
        if competitor_tuples
        else asyncio.sleep(0)
    )
    social_competitors_task = (
        run_social_for_all_competitors(company_id, social_competitors, location, profile_id)
        if social_competitors
        else asyncio.sleep(0)
    )
    review_places = [query] + [name for _cid, name in social_competitors]
    reviews_task = (
        run_reviews_for_all_places(company_id, review_places, location, profile_id)
        if review_places
        else asyncio.sleep(0)
    )
    await asyncio.gather(
        site_task,
        reviews_task,
        run_social_for_company(company_id, query, location, profile_id),
        social_competitors_task,
    )
    logger.info("run_company_scrapes_parallel: all done for company_id=%s", company_id)


async def run_social_for_competitor(
    company_id: str,
    competitor_id: str,
    competitor_name: str,
    location: str,
    profile_id: str | None,
) -> None:
    """Run social scrapes (X, Instagram, Reddit) for one competitor; create scrape_runs with competitor_id and persist to social_items."""
    supabase = get_supabase_admin()
    n_social = len(SOCIAL_SOURCES_ORDERED)
    rows = [
        {"company_id": company_id, "competitor_id": competitor_id, "type": "social", "status": "running", "metadata": {"source": s}}
        for s in SOCIAL_SOURCES_ORDERED
    ]
    insert_result = supabase.table("scrape_runs").insert(rows).execute()
    run_ids = [r["id"] for r in (insert_result.data or [])] if insert_result.data else []
    if len(run_ids) != n_social:
        logger.warning("run_social_for_competitor: failed to create %d run rows for competitor_id=%s", n_social, competitor_id)
        return

    query = competitor_name

    async def run_one(run_id: str, source: str) -> None:
        logger.info("run_social_for_competitor: %s starting for %s", source, query[:50])
        session_id, live_url = await create_session(profile_id)
        supabase.table("scrape_runs").update({"live_url": live_url}).eq("id", run_id).execute()
        try:
            runner = SOCIAL_RUNNERS[source]
            out, _ = await runner(
                query, location=location,
                profile_id=profile_id, session_id=session_id, live_url=live_url,
            )
            if out and out.results:
                for item in out.results:
                    supabase.table("social_items").insert({
                        "company_id": company_id,
                        "competitor_id": competitor_id,
                        "source": source,
                        "handle_or_author": (item.handle_or_author or "")[:500],
                        "display_name": (item.display_name or "")[:500],
                        "text": (item.text or "")[:2000],
                        "url": (item.url or "")[:2000],
                    }).execute()
            supabase.table("scrape_runs").update({
                "status": "done",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()
            logger.info("run_social_for_competitor: %s done for %s", source, query[:50])
        except Exception as e:
            logger.warning("run_social_for_competitor: %s failed for %s: %s", source, query[:50], e)
            supabase.table("scrape_runs").update({
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()

    await asyncio.gather(*[run_one(run_ids[i], SOCIAL_SOURCES_ORDERED[i]) for i in range(n_social)])
    logger.info("run_social_for_competitor: all %d social sources finished for %s", n_social, query[:50])


async def run_social_for_all_competitors(
    company_id: str,
    social_competitors: list[tuple[str, str]],
    location: str,
    profile_id: str | None,
) -> None:
    """Run social scrapes for each competitor in parallel (4 competitors × 3 platforms at once)."""
    if not social_competitors:
        return
    logger.info("run_social_for_all_competitors: starting %d competitors", len(social_competitors))
    await asyncio.gather(*[
        run_social_for_competitor(company_id, cid, name, location, profile_id)
        for cid, name in social_competitors
    ])
    logger.info("run_social_for_all_competitors: all %d competitors finished", len(social_competitors))


async def run_social_for_company(
    company_id: str,
    query: str,
    location: str,
    profile_id: str | None,
) -> None:
    """Run social scrapes (X, Instagram, Reddit) for our company only; scrape_runs have competitor_id=null."""
    supabase = get_supabase_admin()
    n_social = len(SOCIAL_SOURCES_ORDERED)
    rows = [
        {"company_id": company_id, "type": "social", "status": "running", "metadata": {"source": s}}
        for s in SOCIAL_SOURCES_ORDERED
    ]
    insert_result = supabase.table("scrape_runs").insert(rows).execute()
    run_ids = [r["id"] for r in (insert_result.data or [])] if insert_result.data else []
    if len(run_ids) != n_social:
        logger.warning("run_social_for_company: failed to create %d run rows for company_id=%s", n_social, company_id)
        return

    async def run_one(run_id: str, source: str) -> None:
        logger.info("run_social_for_company: %s starting for company_id=%s", source, company_id)
        session_id, live_url = await create_session(profile_id)
        supabase.table("scrape_runs").update({"live_url": live_url}).eq("id", run_id).execute()
        try:
            runner = SOCIAL_RUNNERS[source]
            out, _ = await runner(
                query, location=location,
                profile_id=profile_id, session_id=session_id, live_url=live_url,
            )
            if out and out.results:
                for item in out.results:
                    supabase.table("social_items").insert({
                        "company_id": company_id,
                        "source": source,
                        "handle_or_author": (item.handle_or_author or "")[:500],
                        "display_name": (item.display_name or "")[:500],
                        "text": (item.text or "")[:2000],
                        "url": (item.url or "")[:2000],
                    }).execute()
            supabase.table("scrape_runs").update({
                "status": "done",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()
            logger.info("run_social_for_company: %s done for company_id=%s", source, company_id)
        except Exception as e:
            logger.warning("run_social_for_company: %s failed for company_id=%s: %s", source, company_id, e)
            supabase.table("scrape_runs").update({
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()

    await asyncio.gather(*[run_one(run_ids[i], SOCIAL_SOURCES_ORDERED[i]) for i in range(n_social)])
    logger.info("run_social_for_company: all %d social sources finished for company_id=%s", n_social, company_id)


async def run_reviews_for_place(
    company_id: str,
    place_query: str,
    location: str,
    profile_id: str | None,
) -> None:
    """Run one Google and one Yelp review scrape for a single company; only that company's reviews."""
    supabase = get_supabase_admin()
    rows = [
        {"company_id": company_id, "type": f"reviews_{source}", "status": "running"}
        for source in REVIEW_SOURCES_ORDERED
    ]
    insert_result = supabase.table("scrape_runs").insert(rows).execute()
    run_ids = [r["id"] for r in (insert_result.data or [])] if insert_result.data else []
    if len(run_ids) != 2:
        logger.warning("run_reviews_for_place: failed to create 2 run rows for place=%s", place_query[:50])
        return

    async def run_one(run_id: str, source: str) -> None:
        logger.info("run_reviews_for_place: %s starting for %s", source, place_query[:50])
        session_id, live_url = await create_session(profile_id)
        supabase.table("scrape_runs").update({"live_url": live_url}).eq("id", run_id).execute()
        try:
            runner = REVIEW_RUNNERS[source]
            out, _ = await runner(
                place_query, location=location,
                profile_id=profile_id, session_id=session_id, live_url=live_url,
            )
            if out and out.results:
                for item in out.results:
                    supabase.table("review_items").insert({
                        "company_id": company_id,
                        "source": source,
                        "place_name": (place_query or item.place_name or "")[:500],
                        "rating": (item.rating or "")[:100],
                        "review_text": (item.review_text or "")[:5000],
                        "reviewer_name": (item.reviewer_name or "")[:500],
                        "url": (item.url or "")[:2000],
                    }).execute()
            supabase.table("scrape_runs").update({
                "status": "done",
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()
            logger.info("run_reviews_for_place: %s done for %s", source, place_query[:50])
        except Exception as e:
            logger.warning("run_reviews_for_place: %s failed for %s: %s", source, place_query[:50], e)
            supabase.table("scrape_runs").update({
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()

    await asyncio.gather(*[run_one(run_ids[i], REVIEW_SOURCES_ORDERED[i]) for i in range(2)])
    logger.info("run_reviews_for_place: Google + Yelp finished for %s", place_query[:50])


async def run_reviews_for_all_places(
    company_id: str,
    place_queries: list[str],
    location: str,
    profile_id: str | None,
) -> None:
    """Run Google + Yelp reviews for each company (your company + all competitors); one run per company per source."""
    if not place_queries:
        return
    logger.info("run_reviews_for_all_places: starting %d places (Google + Yelp each)", len(place_queries))
    await asyncio.gather(*[
        run_reviews_for_place(company_id, q, location, profile_id)
        for q in place_queries
    ])
    logger.info("run_reviews_for_all_places: finished all %d places", len(place_queries))


def aggregate_most_frequent_pros_cons(pros_cons_list: list[list[str]], top_n: int = 5) -> list[str]:
    """From list of pro/con lists from each scraper, return the most frequently mentioned (top_n)."""
    combined: list[str] = []
    for lst in pros_cons_list:
        for item in lst:
            s = (item or "").strip()
            if s:
                combined.append(s)
    if not combined:
        return []
    counts = Counter(combined)
    return [x for x, _ in counts.most_common(top_n)]


def get_rankings_for_company(supabase, company_id: str) -> list[dict[str, Any]]:
    """Rank competitors by average of 4 persona ratings (from site_feedback)."""
    runs = supabase.table("scrape_runs").select("id").eq("company_id", company_id).eq("type", "site").execute()
    run_ids = [r["id"] for r in (runs.data or [])]
    if not run_ids:
        return []

    all_feedback = supabase.table("site_feedback").select("competitor_id, rating_compelled_to_buy").in_("run_id", run_ids).execute()
    data = all_feedback.data or []
    by_comp: dict[str, list[float]] = defaultdict(list)
    for row in data:
        comp_id = row["competitor_id"]
        rating = _parse_rating(row.get("rating_compelled_to_buy") or "")
        by_comp[comp_id].append(rating)
    averages = [(cid, sum(s) / len(s)) for cid, s in by_comp.items() if s]
    averages.sort(key=lambda x: -x[1])
    competitors = supabase.table("competitors").select("id, url, name").eq("company_id", company_id).execute()
    comp_map = {c["id"]: c for c in (competitors.data or [])}
    result = []
    for rank, (comp_id, avg) in enumerate(averages, 1):
        c = comp_map.get(comp_id, {})
        result.append({
            "competitor_id": str(comp_id),
            "url": c.get("url", ""),
            "name": c.get("name"),
            "average_rating": round(avg, 1),
            "rank": rank,
        })
    return result


def get_aggregated_feedback_for_company(supabase, company_id: str) -> list[dict[str, Any]]:
    """For each competitor, aggregate pros/cons from all site_feedback (most frequent)."""
    competitors = supabase.table("competitors").select("id, url, name").eq("company_id", company_id).execute()
    comp_list = competitors.data or []
    result = []
    for comp in comp_list:
        comp_id = comp["id"]
        runs = supabase.table("scrape_runs").select("id").eq("company_id", company_id).eq("competitor_id", comp_id).eq("type", "site").execute()
        run_ids = [r["id"] for r in (runs.data or [])]
        if not run_ids:
            result.append({
                "competitor_id": str(comp_id),
                "url": comp["url"],
                "competitor_name": comp.get("name"),
                "pros": [],
                "cons": [],
                "average_rating": 0.0,
                "run_count": 0,
            })
            continue
        feedback = supabase.table("site_feedback").select("pros, cons, rating_compelled_to_buy").in_("run_id", run_ids).execute()
        rows = feedback.data or []
        all_pros = [r.get("pros") or [] for r in rows]
        all_cons = [r.get("cons") or [] for r in rows]
        ratings = [_parse_rating(r.get("rating_compelled_to_buy") or "") for r in rows]
        avg = sum(ratings) / len(ratings) if ratings else 0.0
        result.append({
            "competitor_id": str(comp_id),
            "url": comp["url"],
            "competitor_name": comp.get("name"),
            "pros": aggregate_most_frequent_pros_cons(all_pros),
            "cons": aggregate_most_frequent_pros_cons(all_cons),
            "average_rating": round(avg, 1),
            "run_count": len(rows),
        })
    return result
