"""
Generate draft images (Gemini 2.5 Flash Image) and videos (Veo3) via Google GenAI.
Returns raw bytes for upload to Supabase Storage.
"""
import asyncio
import logging
import os
import tempfile
from typing import Any, cast

logger = logging.getLogger(__name__)

GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
IMAGE_MODEL = "gemini-2.0-flash-exp-image-generation"
VIDEO_MODEL = "veo-3.0-generate-001"


async def generate_image(prompt: str) -> bytes | None:
    """
    Generate an image from a text prompt using Gemini image generation.
    Returns PNG bytes or None on failure.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set; skipping image generation")
        return None
    try:
        from google import genai
        from google.genai import types
        client = genai.Client(api_key=GOOGLE_API_KEY)
        response = await client.aio.models.generate_content(
            model=IMAGE_MODEL,
            contents=prompt[:4000],
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
        )
        if not response or not getattr(response, "candidates", None) or not response.candidates:
            return None
        for part in getattr(response.candidates[0].content, "parts", []):
            inline = getattr(part, "inline_data", None)
            if inline and getattr(inline, "data", None):
                return inline.data
        return None
    except Exception as e:
        logger.warning("generate_image failed: %s", e)
        return None


def _generate_video_sync(prompt: str, aspect_ratio: str) -> bytes | None:
    """Sync Veo3 generation + download; returns MP4 bytes or None."""
    from google import genai
    client = genai.Client(api_key=GOOGLE_API_KEY)
    operation = client.models.generate_videos(
        model=VIDEO_MODEL,
        prompt=prompt[:2000],
        config=cast(Any, {"aspectRatio": aspect_ratio, "resolution": "720p"}),
    )
    while not operation.done:
        import time
        time.sleep(10)
        operation = client.operations.get(operation)
    if not operation.response or not getattr(operation.response, "generated_videos", None):
        return None
    video = operation.response.generated_videos[0]
    client.files.download(file=video.video)
    fd, path = tempfile.mkstemp(suffix=".mp4")
    try:
        os.close(fd)
        video.video.save(path)
        with open(path, "rb") as f:
            return f.read()
    finally:
        try:
            os.unlink(path)
        except OSError:
            pass


async def generate_video(prompt: str, aspect_ratio: str = "9:16") -> bytes | None:
    """
    Generate a short video from a text prompt using Veo3.
    Returns MP4 bytes or None on failure.
    """
    if not GOOGLE_API_KEY:
        logger.warning("GOOGLE_API_KEY not set; skipping video generation")
        return None
    try:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, _generate_video_sync, prompt, aspect_ratio)
    except Exception as e:
        logger.warning("generate_video failed: %s", e)
        return None
