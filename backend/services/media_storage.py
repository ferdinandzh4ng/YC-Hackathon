"""
Upload draft media (images, videos) to Supabase Storage and return public URLs.
"""
import logging
from typing import Any

logger = logging.getLogger(__name__)

BUCKET = "post-media"


def ensure_bucket(supabase: Any) -> None:
    """Create the bucket if it doesn't exist (idempotent)."""
    try:
        supabase.storage.get_bucket(BUCKET)
    except Exception:
        try:
            supabase.storage.create_bucket(BUCKET, options={"public": True})
            logger.info("Created storage bucket %s", BUCKET)
        except Exception as e:
            logger.warning("ensure_bucket: %s (bucket may already exist)", e)


def upload_draft_media(
    supabase: Any,
    path: str,
    data: bytes,
    content_type: str,
) -> str:
    """
    Upload bytes to Supabase Storage and return the public URL.
    path: e.g. "drafts/company_id/timestamp_image.png"
    """
    ensure_bucket(supabase)
    opts = {"content-type": content_type, "upsert": "true"}
    supabase.storage.from_(BUCKET).upload(file=data, path=path, file_options=opts)
    url = supabase.storage.from_(BUCKET).get_public_url(path)
    return url
