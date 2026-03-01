"""
Shared Browser Use Cloud client and session helpers.
Runs a single task with a dedicated session and returns output + live_url.
Supports optional pre-created session (for streaming: send live_url first, then run).
"""
import logging
from typing import Any, TypeVar
from urllib.parse import quote

logger = logging.getLogger(__name__)

from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)


def _live_url_from_session(session: Any) -> str | None:
    """Get live_url from session (attribute or dict), or build from session.id."""
    live_url = getattr(session, "live_url", None)
    if live_url and isinstance(live_url, str):
        return live_url
    if isinstance(session, dict):
        live_url = session.get("live_url") or session.get("liveUrl")
        if live_url and isinstance(live_url, str):
            return live_url
    session_id = getattr(session, "id", None) or (session.get("id") if isinstance(session, dict) else None)
    if session_id and isinstance(session_id, str):
        cdp_url = f"https://{session_id}.cdp0.browser-use.com"
        return f"https://live.browser-use.com?wss={quote(cdp_url, safe='')}"
    return None


async def create_session(profile_id: str | None = None) -> tuple[str, str | None]:
    """Create a Browser Use session (with optional profile_id). Returns (session_id, live_url)."""
    from browser_use_sdk import AsyncBrowserUse
    client = AsyncBrowserUse()
    kwargs: dict[str, Any] = {}
    if profile_id:
        kwargs["profile_id"] = profile_id
    session = await client.sessions.create(**kwargs)
    live_url = _live_url_from_session(session)
    if not live_url:
        logger.warning("create_session: no live_url on session id=%s", getattr(session, "id", None))
    return session.id, live_url


async def run_task(
    task: str,
    output_schema: type[T],
    *,
    start_url: str | None = None,
    allowed_domains: list[str] | None = None,
    profile_id: str | None = None,
    session_id: str | None = None,
    live_url: str | None = None,
) -> tuple[T | None, str | None]:
    """
    Run a Browser Use Cloud task with its own session (or use existing session_id).
    Returns (parsed output, live_url). Pass session_id+live_url when streaming so URL is known upfront.
    """
    from browser_use_sdk import AsyncBrowserUse

    client = AsyncBrowserUse()
    if session_id is None and profile_id:
        session = await client.sessions.create(profile_id=profile_id)
        session_id = session.id
        live_url = _live_url_from_session(session)

    run_kwargs: dict[str, Any] = dict(output_schema=output_schema)
    if start_url:
        run_kwargs["start_url"] = start_url
    if allowed_domains:
        run_kwargs["allowed_domains"] = allowed_domains
    if session_id is not None:
        run_kwargs["session_id"] = session_id

    logger.info("run_task: starting browser task (start_url=%s)", (start_url or "")[:80])
    run = client.run(task, **run_kwargs)
    async for _ in run:
        pass
    result = run.result
    logger.info("run_task: browser task finished")
    if not result:
        return None, live_url
    out = result.output
    if not live_url:
        live_url = getattr(result, "live_url", None)
    return out, live_url
