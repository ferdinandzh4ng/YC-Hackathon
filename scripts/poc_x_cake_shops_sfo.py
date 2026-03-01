"""
PoC: Use Browser Use Cloud to scrape X (Twitter) for cake shops in San Francisco.
Outputs structured results to stdout and data/x_cake_shops_sfo.json.
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

# Optional: profile with synced cookies (logged into X). Required for X search to avoid login wall.
BROWSER_USE_PROFILE_ID = os.getenv("BROWSER_USE_PROFILE_ID")

# Output schema: list of cake-shop–related results from X
class CakeShopResult(BaseModel):
    handle: str
    display_name: str
    tweet_text: str
    url: str


class CakeShopResults(BaseModel):
    results: list[CakeShopResult]


TASK = """Go to X (Twitter), search for "cake shops San Francisco" (or "cake shops SFO").
From the search results, extract a list of relevant posts or accounts: handle, display name, tweet/post text, and link.
Prefer results that look like businesses or recommendations.
Return up to 15 items."""

START_URL = "https://x.com/search?q=cake%20shops%20San%20Francisco"
ALLOWED_DOMAINS = ["twitter.com", "x.com"]
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "x_cake_shops_sfo.json"


async def main() -> None:
    from browser_use_sdk import AsyncBrowserUse

    client = AsyncBrowserUse()

    # Use a session with synced profile (logged into X) when profile_id is set
    session_id = None
    if BROWSER_USE_PROFILE_ID:
        session = await client.sessions.create(profile_id=BROWSER_USE_PROFILE_ID)
        session_id = session.id
        print(f"Using profile session: {session_id}")
        live_url = getattr(session, "live_url", None)
        if live_url:
            print(f"Watch live: {live_url}\n")
        else:
            print()

    run_kwargs = dict(
        output_schema=CakeShopResults,
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

    # If result has a live URL (e.g. when run used an auto-created session), print it
    result_live_url = getattr(result, "live_url", None)
    if result_live_url:
        print(f"\nSession replay / live: {result_live_url}")

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
