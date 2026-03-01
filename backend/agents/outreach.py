"""
Outreach agents: scrape competitor followers and send personalized DMs.
Platforms: X (Twitter), Instagram, Facebook.
Each runs a Browser Use Cloud task that scrapes followers then DMs them.
"""
from pydantic import BaseModel

from .base import run_task

# ----- Schemas -----


class OutreachFollower(BaseModel):
    """A follower that was scraped and (optionally) DM'd."""
    username: str
    display_name: str
    bio: str
    dm_sent: bool
    dm_text: str


class OutreachResults(BaseModel):
    results: list[OutreachFollower]


# ----- X (Twitter) -----

X_OUTREACH_TEMPLATE = """Go to X (Twitter) profile "{competitor_handle}".
Open their followers list.
For each follower (up to {limit}):
  1. Note their username, display name, and bio
  2. Skip obvious bots (no bio, default/empty avatar, or spammy usernames)
  3. Try to open a DM conversation with them:
     - Click the message/envelope icon on their profile
     - If there is NO message option (the button is missing, greyed out, or says "You can't message this person"), SKIP this follower — set dm_sent=false and dm_text="" and move on to the next one
     - If an OTP / verification code / opcode prompt appears, enter: 1234
  4. Send them a personalized message:
     - You are reaching out on behalf of "{company_name}" ({company_market})
     - Write a short, friendly, personalized DM (2-3 sentences) that references something from their bio or profile
     - The DM should introduce {company_name} and what it offers, and invite them to check it out
     - Do NOT mention the competitor by name
  5. Record whether the DM was sent successfully

If a follower's DMs are closed or you cannot message them for any reason, just skip them and continue to the next follower. Do not get stuck on any single follower.

Return the list of followers you attempted (including skipped ones): username, display_name, bio, whether the DM was sent (dm_sent), and the DM text you used (dm_text — empty string if skipped)."""


def _x_outreach_task(competitor_handle: str, company_name: str, company_market: str, limit: int) -> str:
    return X_OUTREACH_TEMPLATE.format(
        competitor_handle=competitor_handle, company_name=company_name,
        company_market=company_market, limit=limit,
    )


async def run_x_outreach(
    competitor_handle: str, company_name: str, company_market: str, limit: int = 20,
    profile_id: str | None = None, session_id: str | None = None, live_url: str | None = None,
) -> tuple[OutreachResults | None, str | None]:
    task = _x_outreach_task(competitor_handle, company_name, company_market, limit)
    handle = competitor_handle.lstrip("@")
    start_url = f"https://x.com/{handle}"
    out, live_url = await run_task(
        task, OutreachResults, start_url=start_url,
        allowed_domains=["x.com", "twitter.com"],
        profile_id=profile_id, session_id=session_id, live_url=live_url,
    )
    return out, live_url


# ----- Instagram -----

INSTAGRAM_OUTREACH_TEMPLATE = """Go to Instagram profile "{competitor_handle}".
Open their followers list.
For each follower (up to {limit}):
  1. Note their username, display name, and bio
  2. Skip obvious bots (no bio, default/empty avatar, or spammy usernames)
  3. Open a DM conversation with them
  4. Send them a personalized message:
     - You are reaching out on behalf of "{company_name}" ({company_market})
     - Write a short, friendly, personalized DM (2-3 sentences) that references something from their bio or profile
     - The DM should introduce {company_name} and what it offers, and invite them to check it out
     - Do NOT mention the competitor by name
  5. Record whether the DM was sent successfully

Return the list of followers you messaged with: username, display_name, bio, whether the DM was sent (dm_sent), and the DM text you used (dm_text)."""


def _instagram_outreach_task(competitor_handle: str, company_name: str, company_market: str, limit: int) -> str:
    return INSTAGRAM_OUTREACH_TEMPLATE.format(
        competitor_handle=competitor_handle, company_name=company_name,
        company_market=company_market, limit=limit,
    )


async def run_instagram_outreach(
    competitor_handle: str, company_name: str, company_market: str, limit: int = 20,
    profile_id: str | None = None, session_id: str | None = None, live_url: str | None = None,
) -> tuple[OutreachResults | None, str | None]:
    task = _instagram_outreach_task(competitor_handle, company_name, company_market, limit)
    handle = competitor_handle.lstrip("@")
    start_url = f"https://www.instagram.com/{handle}/"
    out, live_url = await run_task(
        task, OutreachResults, start_url=start_url,
        allowed_domains=["instagram.com", "www.instagram.com"],
        profile_id=profile_id, session_id=session_id, live_url=live_url,
    )
    return out, live_url


# ----- Facebook -----

FACEBOOK_OUTREACH_TEMPLATE = """Go to Facebook page "{competitor_handle}".
Find their followers or people who like the page.
For each follower (up to {limit}):
  1. Note their username/name, display name, and bio or about info
  2. Skip obvious bots or inactive profiles (no bio, no profile picture)
  3. Open a Messenger conversation with them
  4. Send them a personalized message:
     - You are reaching out on behalf of "{company_name}" ({company_market})
     - Write a short, friendly, personalized DM (2-3 sentences) that references something from their profile
     - The DM should introduce {company_name} and what it offers, and invite them to check it out
     - Do NOT mention the competitor by name
  5. Record whether the DM was sent successfully

Return the list of followers you messaged with: username, display_name, bio, whether the DM was sent (dm_sent), and the DM text you used (dm_text)."""


def _facebook_outreach_task(competitor_handle: str, company_name: str, company_market: str, limit: int) -> str:
    return FACEBOOK_OUTREACH_TEMPLATE.format(
        competitor_handle=competitor_handle, company_name=company_name,
        company_market=company_market, limit=limit,
    )


async def run_facebook_outreach(
    competitor_handle: str, company_name: str, company_market: str, limit: int = 20,
    profile_id: str | None = None, session_id: str | None = None, live_url: str | None = None,
) -> tuple[OutreachResults | None, str | None]:
    task = _facebook_outreach_task(competitor_handle, company_name, company_market, limit)
    handle = competitor_handle.lstrip("@")
    start_url = f"https://www.facebook.com/{handle}"
    out, live_url = await run_task(
        task, OutreachResults, start_url=start_url,
        allowed_domains=["facebook.com", "www.facebook.com", "messenger.com", "www.messenger.com"],
        profile_id=profile_id, session_id=session_id, live_url=live_url,
    )
    return out, live_url


# ----- Dispatcher -----

OUTREACH_SOURCES = {"x", "instagram", "facebook"}
RUNNERS = {
    "x": run_x_outreach,
    "instagram": run_instagram_outreach,
    "facebook": run_facebook_outreach,
}
