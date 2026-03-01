"""
Company + competitor + scrape run logic.
Starts 4 persona scrapes per competitor and stores results.
"""
import asyncio
import os
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any

from agents.base import create_session
from agents.websites import PERSONAS, run_competitor_scrape_single_persona, run_competitor_search
from db import get_supabase_admin

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
        return

    async def run_one(run_id: str, persona_key: str) -> None:
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
        except Exception as e:
            supabase.table("scrape_runs").update({
                "status": "failed",
                "error_message": str(e),
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }).eq("id", run_id).execute()

    await asyncio.gather(*[run_one(run_ids[i], persona_keys[i]) for i in range(4)])


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
