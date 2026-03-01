"""
Website agents: general web search for competitors, and scraping competitor sites.
Returns structured summary, rating (compelled to buy), pros/cons + live_url.
"""
import logging

from pydantic import BaseModel

logger = logging.getLogger(__name__)

from .base import run_task


class CompetitorSiteItem(BaseModel):
    url: str
    summary: str
    rating_compelled_to_buy: str  # e.g. "7/10" or "high"
    pros: list[str]
    cons: list[str]


class CompetitorSiteResults(BaseModel):
    results: list[CompetitorSiteItem]


# ----- Web search for competitors -----

SEARCH_TASK_TEMPLATE = """Use a search engine (Google or Bing) to search for "{query}" in "{location}".
From the top results, identify competitor businesses or relevant sites. For each, extract: url, a short summary, a rating of how compelled a customer would be to buy (e.g. 1-10 or low/medium/high), pros (list), and cons (list).
Return up to 10 items."""

def _search_task(query: str, location: str) -> str:
    return SEARCH_TASK_TEMPLATE.format(query=query, location=location or "the specified area")

def _search_start_url(query: str, location: str) -> str:
    from urllib.parse import quote_plus
    q = f"{query} {location}".strip() if location else query
    return f"https://www.google.com/search?q={quote_plus(q)}"

async def run_competitor_search(query: str, location: str = "", profile_id: str | None = None) -> tuple[CompetitorSiteResults | None, str | None]:
    logger.info("run_competitor_search: starting query=%r location=%r", query, location)
    task = _search_task(query, location)
    start_url = _search_start_url(query, location)
    out, live_url = await run_task(task, CompetitorSiteResults, start_url=start_url, allowed_domains=["google.com", "www.google.com", "bing.com", "www.bing.com"], profile_id=profile_id)
    count = len(out.results) if out else 0
    logger.info("run_competitor_search: finished, got %d results", count)
    return out, live_url


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
