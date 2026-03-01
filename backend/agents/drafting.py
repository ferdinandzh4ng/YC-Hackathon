"""
Post drafting agent via Browser Use Cloud.
Uses company + post-quality insights to produce a structured draft (platform, time, caption, image/video prompts).
Drafting is Browser Use only; image/video generation use Imagen/Veo separately.
"""
import json
import logging
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from .base import run_task

logger = logging.getLogger(__name__)

# ----- Output schema for Browser Use -----


class DraftOutput(BaseModel):
    """Structured draft returned by the Browser Use drafting task."""
    platform: str = Field(description="Target platform: instagram, x, or facebook")
    recommended_time_window: str = Field(description="When to post e.g. Tue-Thu 6-9 AM")
    post_type: str = Field(description="educational, opinion, product, personal, etc.")
    caption: str = Field(description="Full caption: hook + body + single CTA")
    image_prompt: str = Field(description="Prompt for image generation (Imagen)")
    video_prompt: str | None = Field(default=None, description="Prompt for video (Veo3), Instagram only")


def _build_draft_prompt(
    company_name: str,
    market: str,
    location: str,
    insights_summary: str,
    rubric_summary: str,
    platform_hint: str | None,
    current_iso: str,
) -> str:
    """Build the task prompt for the Browser Use agent."""
    platform_instruction = (
        f"Target platform: {platform_hint}."
        if platform_hint
        else "Pick the best platform (instagram, x, or facebook) for this business and content."
    )
    return f"""You are a social media strategist. Create one post draft for the following business.

Company: {company_name}
Market: {market}
Location: {location or "Not specified"}

Post-quality insights (what works for similar content):
{insights_summary}

Rubric summary (scores and timing):
{rubric_summary}

Current date and time (use for optimal timing): {current_iso}

{platform_instruction}
Using the insights above, choose the best time window to post (e.g. "Tue-Thu 6-9 AM" or "Weekday mornings") and write a single engaging post.

Output your response as JSON with exactly these keys (no other text):
- platform: one of instagram, x, facebook
- recommended_time_window: string e.g. "Tue-Thu 6-9 AM"
- post_type: one of educational, opinion, product, personal, meme, data, general
- caption: full caption text (hook + body + one clear CTA)
- image_prompt: short prompt for generating an image for this post (for Imagen)
- video_prompt: if platform is instagram and a short video fits, a prompt for Veo; otherwise null

Return only valid JSON matching the schema above."""


async def run_draft_task(
    company_name: str,
    market: str,
    location: str,
    insights_summary: str,
    rubric_summary: str,
    platform_hint: str | None = None,
    profile_id: str | None = None,
    session_id: str | None = None,
    live_url: str | None = None,
) -> tuple[DraftOutput | None, str | None]:
    """
    Run the Browser Use drafting task. Returns (DraftOutput, live_url or None).
    If session_id and live_url are provided, the run is watchable at live_url from the start.
    """
    current_iso = datetime.now(timezone.utc).isoformat()
    task = _build_draft_prompt(
        company_name=company_name,
        market=market or "",
        location=location or "",
        insights_summary=insights_summary or "No insights yet.",
        rubric_summary=rubric_summary or "No rubric data yet.",
        platform_hint=platform_hint,
        current_iso=current_iso,
    )
    out, final_live_url = await run_task(
        task,
        DraftOutput,
        start_url="https://example.com",
        profile_id=profile_id,
        session_id=session_id,
        live_url=live_url,
    )
    return out, final_live_url or live_url
