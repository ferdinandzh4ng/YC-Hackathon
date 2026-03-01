"""
Post draft creation and storage. Uses Browser Use drafting agent.
Generates images (Gemini) and videos (Veo3) when prompts are present and uploads to Supabase Storage.
"""
import logging
import time
from typing import Any

from db import get_supabase_admin
from agents.base import close_session
from agents.drafting import run_draft_task, DraftOutput
from services.media_generation import generate_image, generate_video
from services.media_storage import upload_draft_media

logger = logging.getLogger(__name__)

DEFAULT_PROFILE_ID = __import__("os").environ.get("BROWSER_USE_PROFILE_ID")

VALID_PLATFORMS = frozenset({"instagram", "x", "facebook"})


def _insights_summary(analyses: list[dict], rubric_summary: dict) -> str:
    """Build a short text summary for the drafting prompt."""
    parts = []
    if analyses:
        top = analyses[:5]
        signals = []
        for a in top:
            if a.get("raw_snippet"):
                signals.append((a.get("raw_snippet") or "")[:200])
            if a.get("post_type"):
                signals.append(f"post_type: {a.get('post_type')}")
        if signals:
            parts.append("Top posts signals: " + " | ".join(signals[:5]))
    if rubric_summary:
        parts.append(f"Rubric: {rubric_summary.get('score_bands', {})}; average_score={rubric_summary.get('average_score', 0)}")
    return "\n".join(parts) if parts else "No analyses yet. Create engaging, platform-appropriate content with a clear hook and one CTA."


def _rubric_summary_str(rubric_summary: dict) -> str:
    """Format rubric for the prompt."""
    if not rubric_summary:
        return "No rubric data."
    return str(rubric_summary)


async def create_draft_for_company(
    company_id: str,
    user_id: str,
    platform_hint: str | None = None,
    session_id: str | None = None,
    live_url: str | None = None,
) -> tuple[dict[str, Any] | None, str | None]:
    """
    Load company + post-quality insights, run Browser Use draft task, save to post_drafts.
    Returns the draft row as dict or None on failure. Closes session when done.
    """
    try:
        return await _create_draft_for_company_impl(
            company_id, user_id, platform_hint, session_id, live_url
        )
    finally:
        if session_id:
            await close_session(session_id)


async def _create_draft_for_company_impl(
    company_id: str,
    user_id: str,
    platform_hint: str | None,
    session_id: str | None,
    live_url: str | None,
) -> tuple[dict[str, Any] | None, str | None]:
    supabase = get_supabase_admin()
    comp = supabase.table("companies").select("id, name, market, location, user_id").eq("id", company_id).eq("user_id", user_id).limit(1).execute()
    if not comp.data or len(comp.data) == 0:
        return None, None
    row = comp.data[0]
    company_name = (row.get("name") or "Company").strip()
    market = (row.get("market") or "").strip()
    location = (row.get("location") or "").strip()

    # Ensure we have post-quality analyses
    from services.post_quality import analyze_and_store_for_company
    analyze_and_store_for_company(company_id)

    # Load insights (same shape as get_post_quality_insights)
    analyses_rows = supabase.table("post_quality_analyses").select("*").eq("company_id", company_id).order("total_score", desc=True).execute()
    analyses_list = analyses_rows.data or []
    scores = [a.get("total_score") or 0 for a in analyses_list]
    rubric_summary = {
        "total_posts_analyzed": len(analyses_list),
        "average_score": round(sum(scores) / len(scores), 1) if scores else 0,
        "score_bands": {
            "excellent_80_100": sum(1 for s in scores if s >= 80),
            "good_60_79": sum(1 for s in scores if 60 <= s < 80),
            "average_40_59": sum(1 for s in scores if 40 <= s < 60),
            "weak_below_40": sum(1 for s in scores if s < 40),
        },
    }
    insights_summary = _insights_summary(analyses_list, rubric_summary)
    rubric_str = _rubric_summary_str(rubric_summary)

    draft_out, out_live_url = await run_draft_task(
        company_name=company_name,
        market=market,
        location=location,
        insights_summary=insights_summary,
        rubric_summary=rubric_str,
        platform_hint=platform_hint,
        profile_id=DEFAULT_PROFILE_ID,
        session_id=session_id,
        live_url=live_url,
    )

    if not draft_out:
        logger.warning("create_draft_for_company: draft agent returned nothing for company_id=%s; creating fallback draft", company_id)
        platform = (platform_hint or "instagram").strip().lower()
        if platform not in VALID_PLATFORMS:
            platform = "instagram"
        draft_out = DraftOutput(
            platform=platform,
            recommended_time_window="Weekday mornings",
            post_type="general",
            caption=f"Check out {company_name} — we're in {market or 'your area'}. Follow for more.",
            image_prompt="",
            video_prompt=None,
        )

    platform = (draft_out.platform or "instagram").strip().lower()
    if platform not in VALID_PLATFORMS:
        platform = "instagram"

    placeholder_image = "https://placehold.co/800x800/e5e5e5/737373?text=Post+image"
    ts = int(time.time())
    insert_row = {
        "company_id": company_id,
        "user_id": user_id,
        "platform": platform,
        "status": "draft",
        "caption": (draft_out.caption or "")[:10000],
        "image_url": placeholder_image,
        "video_url": None,
        "recommended_time_window": (draft_out.recommended_time_window or "")[:500],
        "post_type": (draft_out.post_type or "general")[:100],
    }
    ins = supabase.table("post_drafts").insert(insert_row).execute()
    if not ins.data or len(ins.data) == 0:
        return None, out_live_url
    draft_row = ins.data[0]
    draft_id = str(draft_row["id"])
    prefix = f"drafts/{company_id}/{ts}"

    # Generate image and/or video and upload to Supabase Storage
    image_url = placeholder_image
    if (draft_out.image_prompt or "").strip():
        img_bytes = await generate_image(draft_out.image_prompt.strip())
        if img_bytes:
            try:
                image_url = upload_draft_media(
                    supabase, f"{prefix}_{draft_id}_image.png", img_bytes, "image/png"
                )
            except Exception as e:
                logger.warning("upload_draft_media image failed: %s", e)

    video_url = None
    if platform == "instagram" and (draft_out.video_prompt or "").strip():
        vid_bytes = await generate_video(draft_out.video_prompt.strip(), aspect_ratio="9:16")
        if vid_bytes:
            try:
                video_url = upload_draft_media(
                    supabase, f"{prefix}_{draft_id}_video.mp4", vid_bytes, "video/mp4"
                )
            except Exception as e:
                logger.warning("upload_draft_media video failed: %s", e)

    if image_url != placeholder_image or video_url:
        supabase.table("post_drafts").update({
            "image_url": image_url,
            **({"video_url": video_url} if video_url is not None else {}),
        }).eq("id", draft_id).execute()
        draft_row["image_url"] = image_url
        if video_url is not None:
            draft_row["video_url"] = video_url

    logger.info("create_draft_for_company: created draft %s for company_id=%s", draft_id, company_id)
    return draft_row, out_live_url
