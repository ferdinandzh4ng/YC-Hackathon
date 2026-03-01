"""
Browser Use task to publish a draft to Instagram, X, or Facebook.
Opens the platform, creates a new post with caption and image, and publishes.
"""
import logging
from pydantic import BaseModel

from .base import run_task

logger = logging.getLogger(__name__)


class PublishResult(BaseModel):
    success: bool = True


def _start_url(platform: str) -> str:
    if platform == "x":
        return "https://x.com"
    if platform == "instagram":
        return "https://www.instagram.com"
    if platform == "facebook":
        return "https://www.facebook.com"
    return "https://www.instagram.com"


def _allowed_domains(platform: str) -> list[str]:
    if platform == "x":
        return ["x.com", "twitter.com"]
    if platform == "instagram":
        return ["instagram.com", "www.instagram.com"]
    if platform == "facebook":
        return ["facebook.com", "www.facebook.com", "m.facebook.com"]
    return ["instagram.com", "www.instagram.com"]


async def run_publish_task(
    platform: str,
    caption: str,
    image_url: str | None,
    video_url: str | None = None,
    profile_id: str | None = None,
) -> bool:
    """
    Run Browser Use task to publish a post. Returns True if the task completed without exception.
    Requires a logged-in profile for the target platform.
    If image_url or video_url is provided, the agent must open/download that URL and upload it as the post media.
    """
    start = _start_url(platform)
    domains = _allowed_domains(platform)
    # Allow the media URL to be opened (same-origin or common image hosts)
    media_url = video_url or image_url
    task = f"""Go to {start}. You should be logged in to this platform.
Create a new post (click new post / compose / create post).
"""
    if media_url:
        task += f"""
To add media: open this URL in a new tab — {media_url}
Download the image or video to your machine (or take a screenshot if it's an image), then in the post composer upload that file as the post media.
If the platform lets you paste an image URL or add from link, you may use that instead.
"""
    task += f"""
Set the caption to exactly: {caption[:500]}
Publish or submit the post. When the post is published, return {{"success": true}}."""

    try:
        out, _ = await run_task(
            task,
            PublishResult,
            start_url=start,
            allowed_domains=domains,
            profile_id=profile_id,
        )
        return out is not None
    except Exception as e:
        logger.warning("run_publish_task failed: %s", e)
        return False
