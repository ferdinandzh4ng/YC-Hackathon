"""
Review agents: Google Reviews, Yelp.
Each runs a Browser Use Cloud task and returns structured results + live_url.
"""
from pydantic import BaseModel

from .base import run_task


class ReviewItem(BaseModel):
    place_name: str
    rating: str
    review_text: str
    reviewer_name: str
    url: str


class ReviewResults(BaseModel):
    results: list[ReviewItem]


# ----- Google Reviews -----

GOOGLE_TASK_TEMPLATE = """Go to Google Maps and search for "{query}".
Find and open ONLY the listing for this specific business: "{query}". Do NOT open or collect reviews from any other business or place. IF THERE ARE MULTIPLE JUST USE THE FIRST ONE!
Extract reviews ONLY from that single company's Google Maps listing. Include a balanced mix: positive (4–5 stars), negative or critical (1–2 stars), and neutral/mixed (3 stars).
For each review, record: place name (use "{query}"), rating, review text, reviewer name, and the URL to that place on Google Maps.
Return up to 15 reviews, all from this one company only."""

def _google_task(query: str, location: str) -> str:
    return GOOGLE_TASK_TEMPLATE.format(query=query, location=location or "the specified area")

def _google_start_url(query: str, location: str) -> str:
    from urllib.parse import quote_plus
    q = f"{query} {location}".strip() if location else query
    return f"https://www.google.com/maps/search/{quote_plus(q)}"

async def run_google_reviews(
    query: str,
    location: str = "",
    profile_id: str | None = None,
    session_id: str | None = None,
    live_url: str | None = None,
) -> tuple[ReviewResults | None, str | None]:
    task = _google_task(query, location)
    start_url = _google_start_url(query, location)
    return await run_task(
        task, ReviewResults,
        start_url=start_url,
        allowed_domains=["google.com", "www.google.com", "maps.google.com"],
        profile_id=profile_id,
        session_id=session_id,
        live_url=live_url,
    )


# ----- Yelp -----

YELP_TASK_TEMPLATE = """Go to Yelp and search for "{query}" in "{location}".
Find and open ONLY the listing for this specific business: "{query}". Do NOT open or collect reviews from any other business or place.
Extract reviews ONLY from that single company's Yelp page. Include a balanced mix: positive (4–5 stars), negative or critical (1–2 stars), and neutral/mixed (3 stars).
For each review, record: place name (use "{query}"), rating, review text, reviewer name, and the URL to that business on Yelp.
Return up to 15 reviews, all from this one company only."""

def _yelp_task(query: str, location: str) -> str:
    return YELP_TASK_TEMPLATE.format(query=query, location=location or "the specified area")

def _yelp_start_url(query: str, location: str) -> str:
    from urllib.parse import quote_plus
    return f"https://www.yelp.com/search?find_desc={quote_plus(query)}&find_loc={quote_plus(location or '')}"

async def run_yelp_reviews(
    query: str,
    location: str = "",
    profile_id: str | None = None,
    session_id: str | None = None,
    live_url: str | None = None,
) -> tuple[ReviewResults | None, str | None]:
    task = _yelp_task(query, location)
    start_url = _yelp_start_url(query, location)
    return await run_task(
        task, ReviewResults,
        start_url=start_url,
        allowed_domains=["yelp.com", "www.yelp.com"],
        profile_id=profile_id,
        session_id=session_id,
        live_url=live_url,
    )


REVIEW_SOURCES = {"google", "yelp"}
RUNNERS = {
    "google": run_google_reviews,
    "yelp": run_yelp_reviews,
}
