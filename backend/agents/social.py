"""
Social media agents: X (Twitter), Instagram, Facebook.
Each runs a Browser Use Cloud task and returns structured results + live_url.
"""
from pydantic import BaseModel

from .base import run_task

# ----- Schemas (one per platform for consistent API) -----


class SocialPostItem(BaseModel):
    """Generic social post / account entry."""
    handle_or_author: str
    display_name: str
    text: str
    url: str


class SocialPostResults(BaseModel):
    results: list[SocialPostItem]


# ----- X (Twitter) -----

X_TASK_TEMPLATE = """Go to X (Twitter), search for "{query}" (add "{location}" if relevant).
From the search results, extract a list of relevant posts or accounts: handle, display name, tweet/post text, and link.
Prefer results that look like businesses or recommendations.
Return up to 15 items."""

def _x_task(query: str, location: str) -> str:
    return X_TASK_TEMPLATE.format(query=query, location=location or "the specified area")

def _x_start_url(query: str, location: str) -> str:
    from urllib.parse import quote_plus
    q = f"{query} {location}".strip() if location else query
    return f"https://x.com/search?q={quote_plus(q)}"

async def run_x(query: str, location: str = "", profile_id: str | None = None, session_id: str | None = None, live_url: str | None = None) -> tuple[SocialPostResults | None, str | None]:
    task = _x_task(query, location)
    start_url = _x_start_url(query, location)
    # Map X schema (handle, display_name, tweet_text, url) -> SocialPostItem
    class XResult(BaseModel):
        handle: str
        display_name: str
        tweet_text: str
        url: str
    class XResults(BaseModel):
        results: list[XResult]
    out, live_url = await run_task(task, XResults, start_url=start_url, allowed_domains=["twitter.com", "x.com"], profile_id=profile_id, session_id=session_id, live_url=live_url)
    if out is None:
        return None, live_url
    mapped = SocialPostResults(results=[SocialPostItem(handle_or_author=r.handle, display_name=r.display_name, text=r.tweet_text, url=r.url) for r in out.results])
    return mapped, live_url


# ----- Instagram -----

INSTAGRAM_TASK_TEMPLATE = """Go to Instagram and search for "{query}" (add "{location}" if relevant).
From the search results (posts, reels, or accounts), extract a list: handle or author, display name, caption or description snippet, and link.
Return up to 15 items."""

def _instagram_task(query: str, location: str) -> str:
    return INSTAGRAM_TASK_TEMPLATE.format(query=query, location=location or "the specified area")

def _instagram_start_url(query: str, location: str) -> str:
    from urllib.parse import quote_plus
    q = f"{query} {location}".strip() if location else query
    return f"https://www.instagram.com/explore/search/keyword/?query={quote_plus(q)}"

async def run_instagram(query: str, location: str = "", profile_id: str | None = None, session_id: str | None = None, live_url: str | None = None) -> tuple[SocialPostResults | None, str | None]:
    task = _instagram_task(query, location)
    start_url = _instagram_start_url(query, location)
    out, live_url = await run_task(task, SocialPostResults, start_url=start_url, allowed_domains=["instagram.com", "www.instagram.com"], profile_id=profile_id, session_id=session_id, live_url=live_url)
    return out, live_url


# ----- Facebook -----

FACEBOOK_TASK_TEMPLATE = """Go to Facebook and search for "{query}" (add "{location}" if relevant).
From the search results (posts, pages, or groups), extract a list: handle or author, display name, post or page text snippet, and link.
Return up to 15 items."""

def _facebook_task(query: str, location: str) -> str:
    return FACEBOOK_TASK_TEMPLATE.format(query=query, location=location or "the specified area")

def _facebook_start_url(query: str, location: str) -> str:
    from urllib.parse import quote_plus
    q = f"{query} {location}".strip() if location else query
    return f"https://www.facebook.com/search/posts/?q={quote_plus(q)}"

async def run_facebook(query: str, location: str = "", profile_id: str | None = None, session_id: str | None = None, live_url: str | None = None) -> tuple[SocialPostResults | None, str | None]:
    task = _facebook_task(query, location)
    start_url = _facebook_start_url(query, location)
    out, live_url = await run_task(task, SocialPostResults, start_url=start_url, allowed_domains=["facebook.com", "www.facebook.com", "m.facebook.com"], profile_id=profile_id, session_id=session_id, live_url=live_url)
    return out, live_url


# ----- Dispatcher -----

SOCIAL_SOURCES = {"x", "instagram", "facebook"}
RUNNERS = {
    "x": run_x,
    "instagram": run_instagram,
    "facebook": run_facebook,
}
