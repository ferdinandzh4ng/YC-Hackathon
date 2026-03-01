"""
PoC: Use Browser Use Cloud to scrape Reddit for cake shops / bakeries in San Francisco.
Outputs structured results to stdout and data/reddit_cake_shops_sfo.json.
"""
import asyncio
import json
import os
from pathlib import Path

from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

# API key required for Browser Use Cloud
BROWSER_USE_API_KEY = os.getenv("BROWSER_USE_API_KEY")
if not BROWSER_USE_API_KEY:
    raise SystemExit("Set BROWSER_USE_API_KEY in .env (see .env.example)")

# Optional: profile with synced cookies (logged into Reddit). Not required for public search.
BROWSER_USE_PROFILE_ID = os.getenv("BROWSER_USE_PROFILE_ID")

# Output schema: Reddit posts about cake shops / bakeries in SF
class RedditPostResult(BaseModel):
    subreddit: str
    title: str
    author: str
    post_text: str  # body snippet or selftext excerpt
    url: str


class RedditPostResults(BaseModel):
    results: list[RedditPostResult]


TASK = """Go to Reddit and search for "cake shops San Francisco" or "bakery San Francisco".
From the search results, extract a list of relevant posts: subreddit, title, author, post text (or a short excerpt), and post url.
Prefer results that mention bakeries, cake shops, or pastry in San Francisco.
Return up to 15 items."""

START_URL = "https://www.reddit.com/search/?q=cake%20shops%20san%20francisco"
ALLOWED_DOMAINS = ["reddit.com", "www.reddit.com", "old.reddit.com"]
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "reddit_cake_shops_sfo.json"


async def main() -> None:
    from browser_use_sdk import AsyncBrowserUse

    client = AsyncBrowserUse()

    # Use a session with synced profile when profile_id is set (optional for Reddit)
    session_id = None
    if BROWSER_USE_PROFILE_ID:
        session = await client.sessions.create(profile_id=BROWSER_USE_PROFILE_ID)
        session_id = session.id
        print(f"Using profile session: {session_id}\n")

    run_kwargs = dict(
        output_schema=RedditPostResults,
        start_url=START_URL,
        allowed_domains=ALLOWED_DOMAINS,
    )
    if session_id is not None:
        run_kwargs["session_id"] = session_id

    run = client.run(TASK, **run_kwargs)

    # Stream steps for debugging
    async for step in run:
        print(f"Step {step.number}: {step.next_goal}")
        print(f"  URL: {step.url}")

    result = run.result
    if not result:
        raise RuntimeError("No result from task")

    print("\n--- Output ---")
    output = result.output
    if output is None:
        print("(no structured output)")
        return

    # stdout
    print(json.dumps(output.model_dump(), indent=2))

    # save to file
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(output.model_dump(), indent=2), encoding="utf-8")
    print(f"\nSaved to {OUTPUT_PATH}")


if __name__ == "__main__":
    asyncio.run(main())
