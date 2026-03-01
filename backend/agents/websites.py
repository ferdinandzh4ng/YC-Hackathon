"""
Website agents: competitor discovery (Anthropic) and scraping competitor sites.
Returns structured summary, rating (compelled to buy), pros/cons + live_url.
"""
import json
import logging
import os

from pydantic import BaseModel

logger = logging.getLogger(__name__)

from .base import run_task


class CompetitorSiteItem(BaseModel):
    url: str
    summary: str
    rating_compelled_to_buy: str  # e.g. "7/10" or "high"
    pros: list[str]
    cons: list[str]
    name: str | None = None  # business name (for OpenAI competitor search)


class CompetitorSiteResults(BaseModel):
    results: list[CompetitorSiteItem]


# ----- Competitor discovery (Anthropic) -----

ANTHROPIC_COMPETITOR_SYSTEM = """You are a research assistant. Given a business name, market, and optional location, return a JSON array of direct competitors that are on the SAME SCALE as the business.

Critical: Match the business size and type. If the business is a local shop, cafe, or small business, return only other local or similarly small competitors in that area—do NOT include national chains (e.g. no Starbucks, McDonald's, or big brands when the company is a local cafe). If the business is a regional chain, return other regional players. If it is national, then national competitors are fine.

Each item must have: "name" (business or brand name) and "url" (official website URL, must start with http:// or https://).
Return up to 4 competitors. Use your knowledge; if you are unsure of a URL, use a plausible one or omit that competitor.
Reply with only valid JSON, no markdown or explanation: [{"name": "...", "url": "..."}, ...]"""


def _extract_competitor_list(raw: list | dict) -> list[dict]:
    """Normalize API response to a list of {name, url} dicts. Handles array or object with competitors/results/items."""
    if isinstance(raw, list):
        return raw
    if not isinstance(raw, dict):
        return []
    for key in ("competitors", "results", "items"):
        val = raw.get(key)
        if isinstance(val, list):
            return val
    return []


async def run_competitor_search(query: str, location: str = "", profile_id: str | None = None) -> tuple[CompetitorSiteResults | None, str | None]:
    """Find competitors via Anthropic Claude (no browser). Returns names and URLs."""
    logger.info("run_competitor_search: starting Anthropic call query=%r location=%r", query, location)
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning(
            "run_competitor_search: ANTHROPIC_API_KEY not set. Add it to backend/.env to enable competitor discovery."
        )
        return CompetitorSiteResults(results=[]), None

    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")

    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=api_key)
        user = f"Business/market: {query}. Location: {location}" if location else f"Business/market: {query}."
        resp = await client.messages.create(
            model=model,
            max_tokens=1024,
            system=ANTHROPIC_COMPETITOR_SYSTEM,
            messages=[{"role": "user", "content": user}],
        )
        content = ""
        for block in (resp.content or []):
            if hasattr(block, "text"):
                content = block.text or ""
                break
            if isinstance(block, dict) and block.get("type") == "text":
                content = block.get("text") or ""
                break
        content = content.strip()
        if not content:
            logger.warning("run_competitor_search: empty response from model")
            return CompetitorSiteResults(results=[]), None
        # Strip markdown code fence if present
        if "```" in content:
            content = content.split("```", 1)[-1].rsplit("```", 1)[0].strip()
            if content.startswith("json"):
                content = content[4:].strip()
        raw_parsed = json.loads(content)
        raw_list = _extract_competitor_list(raw_parsed)
        results: list[CompetitorSiteItem] = []
        for item in raw_list[:4]:
            if not isinstance(item, dict):
                continue
            url = (item.get("url") or "").strip()
            if not url or not (url.startswith("http://") or url.startswith("https://")):
                continue
            name = (item.get("name") or url).strip()
            results.append(CompetitorSiteItem(
                url=url,
                summary=name,
                rating_compelled_to_buy="",
                pros=[],
                cons=[],
                name=name,
            ))
        if not results and raw_list:
            logger.warning(
                "run_competitor_search: model returned %d items but none had valid url. Sample: %s",
                len(raw_list),
                content[:400],
            )
        elif not results:
            logger.warning(
                "run_competitor_search: no valid competitors parsed. Raw response (truncated): %s",
                content[:500],
            )
        out = CompetitorSiteResults(results=results)
        logger.info("run_competitor_search: finished, got %d results", len(results))
        return out, None
    except json.JSONDecodeError as e:
        logger.warning(
            "run_competitor_search: Anthropic JSON parse failed: %s. Content: %s",
            e,
            (content[:400] if content else ""),
        )
        return CompetitorSiteResults(results=[]), None
    except Exception as e:
        logger.warning("run_competitor_search: Anthropic call failed: %s", e, exc_info=True)
        return None, None


# ----- Scrape specific competitor URLs -----

SCRAPE_TASK_TEMPLATE = """Visit each of these competitor websites and analyze the experience:
{urls}

For each URL, extract: the same url, a short summary of the site and user experience, a rating of how compelled a customer would be to buy (1-10 or low/medium/high), a list of pros, and a list of cons.
Return one item per URL."""

def _scrape_task(urls: list[str]) -> str:
    url_list = "\n".join(f"- {u}" for u in urls[:10])
    return SCRAPE_TASK_TEMPLATE.format(urls=url_list)

async def run_competitor_scrape(urls: list[str], profile_id: str | None = None) -> tuple[CompetitorSiteResults | None, str | None]:
    if not urls:
        return CompetitorSiteResults(results=[]), None
    task = _scrape_task(urls)
    # Start at first URL; agent can navigate to others
    start_url = urls[0]
    # No domain restriction so agent can visit any competitor URL
    return await run_task(task, CompetitorSiteResults, start_url=start_url, profile_id=profile_id)


# ----- Single-URL scrape with persona (for 4 parallel personas per competitor) -----

PERSONA_TEMPLATE = """You are evaluating a website as this type of user: {persona_description}

Visit this URL and analyze the site from that user's perspective: {url}

Extract and return: the same url, a short summary of the site and user experience from this persona's view, a rating of how compelled this customer would be to buy (give a number 1-10), a list of pros, and a list of cons.
Return exactly one item."""

PERSONAS = {
    "elderly": "An elderly, cautious user who is less tech-savvy and values clarity, large text, simple navigation, and trust signals.",
    "new_user": "A first-time visitor who has never used this type of product before; curious but easily confused by jargon or complex flows.",
    "frustrated": "A user with little patience who gets annoyed by slow load times, too many steps, or unclear calls to action.",
    "enthusiast": "An enthusiastic power user who looks for advanced features, shortcuts, and polish; appreciates good UX and speed.",
}


class SingleSiteResult(BaseModel):
    """One competitor site result (for persona runs)."""
    url: str
    summary: str
    rating_compelled_to_buy: str
    pros: list[str]
    cons: list[str]


class SingleSiteResults(BaseModel):
    results: list[SingleSiteResult]


def _persona_task(url: str, persona_key: str) -> str:
    desc = PERSONAS.get(persona_key, persona_key)
    return PERSONA_TEMPLATE.format(persona_description=desc, url=url)


async def run_competitor_scrape_single_persona(
    url: str,
    persona_key: str,
    profile_id: str | None = None,
    session_id: str | None = None,
    live_url: str | None = None,
) -> tuple[SingleSiteResult | None, str | None]:
    """Scrape one URL as one persona. Returns (single result, live_url)."""
    task = _persona_task(url, persona_key)
    out, live_url = await run_task(
        task,
        SingleSiteResults,
        start_url=url,
        profile_id=profile_id,
        session_id=session_id,
        live_url=live_url,
    )
    if not out or not out.results:
        return None, live_url
    return out.results[0], live_url
