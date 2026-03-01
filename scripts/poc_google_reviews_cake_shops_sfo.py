"""
PoC: Use Browser Use Cloud to scrape Google Reviews for cake shops / bakeries in San Francisco.
Outputs structured results to stdout and data/google_reviews_cake_shops_sfo.json.
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

# Optional: profile with synced cookies. Not required for public Google Maps/reviews.
BROWSER_USE_PROFILE_ID = os.getenv("BROWSER_USE_PROFILE_ID")

# Output schema: Google reviews for bakeries/cake shops in SF
class GoogleReviewResult(BaseModel):
    place_name: str
    rating: str  # e.g. "4.5" or "4.5 stars"
    review_text: str
    reviewer_name: str  # may be "A Google user" or similar
    url: str  # link to the place on Google Maps


class GoogleReviewResults(BaseModel):
    results: list[GoogleReviewResult]


TASK = """Go to Google Maps and search for "cake shops San Francisco" or "bakery San Francisco".
Open a few of the listed places (bakeries, cake shops, pastry shops) and extract reviews.
For each review, record: place name, rating, review text, reviewer name, and the URL to that place on Google Maps.
Return up to 15 reviews (they can be from different places)."""

START_URL = "https://www.google.com/maps/search/cake+shops+San+Francisco"
ALLOWED_DOMAINS = ["google.com", "www.google.com", "maps.google.com"]
OUTPUT_PATH = Path(__file__).resolve().parent.parent / "data" / "google_reviews_cake_shops_sfo.json"


async def main() -> None:
    from browser_use_sdk import AsyncBrowserUse

    client = AsyncBrowserUse()

    # Use a session with synced profile when profile_id is set (optional for Google)
    session_id = None
    if BROWSER_USE_PROFILE_ID:
        session = await client.sessions.create(profile_id=BROWSER_USE_PROFILE_ID)
        session_id = session.id
        print(f"Using profile session: {session_id}\n")

    run_kwargs = dict(
        output_schema=GoogleReviewResults,
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
