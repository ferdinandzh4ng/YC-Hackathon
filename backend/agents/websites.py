"""
Website agents: general web search for competitors, and scraping competitor sites.
Returns structured summary, rating (compelled to buy), pros/cons + live_url.
"""
from pydantic import BaseModel

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
    task = _search_task(query, location)
    start_url = _search_start_url(query, location)
    return await run_task(task, CompetitorSiteResults, start_url=start_url, allowed_domains=["google.com", "www.google.com", "bing.com", "www.bing.com"], profile_id=profile_id)


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
