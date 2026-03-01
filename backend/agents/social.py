"""
Social media agents: X (Twitter), LinkedIn, Instagram, Reddit.
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

async def run_x(query: str, location: str = "", profile_id: str | None = None) -> tuple[SocialPostResults | None, str | None]:
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
    out, live_url = await run_task(task, XResults, start_url=start_url, allowed_domains=["twitter.com", "x.com"], profile_id=profile_id)
    if out is None:
        return None, live_url
    mapped = SocialPostResults(results=[SocialPostItem(handle_or_author=r.handle, display_name=r.display_name, text=r.tweet_text, url=r.url) for r in out.results])
    return mapped, live_url


# ----- Reddit -----

REDDIT_TASK_TEMPLATE = """Go to Reddit and search for "{query}" (add "{location}" if relevant).
From the search results, extract a list of relevant posts: subreddit, title, author, post text (or a short excerpt), and post url.
Return up to 15 items."""

def _reddit_task(query: str, location: str) -> str:
    return REDDIT_TASK_TEMPLATE.format(query=query, location=location or "the specified area")

def _reddit_start_url(query: str, location: str) -> str:
    from urllib.parse import quote_plus
    q = f"{query} {location}".strip() if location else query
    return f"https://www.reddit.com/search/?q={quote_plus(q)}"

class RedditResult(BaseModel):
    subreddit: str
    title: str
    author: str
    post_text: str
    url: str

class RedditResults(BaseModel):
    results: list[RedditResult]

async def run_reddit(query: str, location: str = "", profile_id: str | None = None) -> tuple[SocialPostResults | None, str | None]:
    task = _reddit_task(query, location)
    start_url = _reddit_start_url(query, location)
    out, live_url = await run_task(task, RedditResults, start_url=start_url, allowed_domains=["reddit.com", "www.reddit.com", "old.reddit.com"], profile_id=profile_id)
    if out is None:
        return None, live_url
    mapped = SocialPostResults(results=[SocialPostItem(handle_or_author=r.author, display_name=r.subreddit, text=r.post_text or r.title, url=r.url) for r in out.results])
    return mapped, live_url


# ----- LinkedIn -----

LINKEDIN_TASK_TEMPLATE = """Go to LinkedIn and search for "{query}" (add "{location}" if relevant).
From the search results (posts or company pages), extract a list: handle/author, display name, post or page text snippet, and link.
Return up to 15 items."""

def _linkedin_task(query: str, location: str) -> str:
    return LINKEDIN_TASK_TEMPLATE.format(query=query, location=location or "the specified area")

def _linkedin_start_url(query: str, location: str) -> str:
    from urllib.parse import quote_plus
    q = f"{query} {location}".strip() if location else query
    return f"https://www.linkedin.com/search/results/all/?keywords={quote_plus(q)}"

async def run_linkedin(query: str, location: str = "", profile_id: str | None = None) -> tuple[SocialPostResults | None, str | None]:
    task = _linkedin_task(query, location)
    start_url = _linkedin_start_url(query, location)
    out, live_url = await run_task(task, SocialPostResults, start_url=start_url, allowed_domains=["linkedin.com", "www.linkedin.com"], profile_id=profile_id)
    return out, live_url


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

async def run_instagram(query: str, location: str = "", profile_id: str | None = None) -> tuple[SocialPostResults | None, str | None]:
    task = _instagram_task(query, location)
    start_url = _instagram_start_url(query, location)
    out, live_url = await run_task(task, SocialPostResults, start_url=start_url, allowed_domains=["instagram.com", "www.instagram.com"], profile_id=profile_id)
    return out, live_url


# ----- Dispatcher -----

SOCIAL_SOURCES = {"x", "linkedin", "instagram", "reddit"}
RUNNERS = {
    "x": run_x,
    "linkedin": run_linkedin,
    "instagram": run_instagram,
    "reddit": run_reddit,
}
