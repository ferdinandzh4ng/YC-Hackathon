"""
Future steps: Anthropic call to generate actionable recommendations from scraped data.
Each step has title, description, and evidence from the data.
"""
import json
import logging
import os
from typing import Any

logger = logging.getLogger(__name__)

FUTURE_STEPS_SYSTEM = """You are a growth consultant. Given structured data about a company and its competitors (rankings, site feedback pros/cons, reviews, social post insights, posting guide), output a JSON array of 5–8 concrete "future steps" the company should take to increase sales and performance.

Rules:
- Be specific and actionable. Each step should be something the company can do (e.g. "Improve homepage value proposition", "Respond to negative Yelp themes", "Post at recommended times").
- Cite evidence from the data. The "evidence" array must list 1–3 short quotes or facts from the provided data that support the recommendation (e.g. "3 competitors outrank you on 'ease of checkout'", "Reviewers mention 'slow service' 12 times", "Your best-performing posts use question hooks").
- Order steps by impact: highest-impact or quick wins first.
- Output only valid JSON: [{"title": "...", "description": "...", "evidence": ["...", "..."]}, ...]. No markdown, no explanation outside the JSON."""


def _build_context(detail: dict[str, Any], posting_guide: dict[str, Any] | None) -> str:
    """Build a text summary of company detail and posting guide for the LLM."""
    parts: list[str] = []
    company = detail.get("company") or {}
    parts.append(f"Company: {company.get('name') or 'Unknown'}. Market: {company.get('market') or 'N/A'}. Location: {company.get('location') or 'N/A'}.")
    rankings = detail.get("rankings") or []
    if rankings:
        parts.append("Competitor rankings (by average rating): " + ", ".join(
            f"{r.get('name') or r.get('url')} ({r.get('average_rating')})" for r in rankings[:10]
        ))
    feedback = detail.get("aggregated_feedback") or []
    for f in feedback[:8]:
        name = f.get("competitor_name") or f.get("url") or "Competitor"
        pros = f.get("pros") or []
        cons = f.get("cons") or []
        parts.append(f"Feedback for {name}: Pros: {', '.join(pros[:5])}. Cons: {', '.join(cons[:5])}.")
    review_items = detail.get("review_items") or []
    if review_items:
        by_place: dict[str, list[str]] = {}
        for r in review_items[:50]:
            place = r.get("place_name") or "Unknown"
            if place not in by_place:
                by_place[place] = []
            text = (r.get("review_text") or "").strip()
            if text and len(by_place[place]) < 3:
                by_place[place].append(text[:200])
        for place, texts in list(by_place.items())[:5]:
            parts.append(f"Reviews for {place}: " + " | ".join(texts))
    social_items = detail.get("social_items") or []
    if social_items:
        parts.append(f"Social: {len(social_items)} posts from X/Instagram/Facebook scrapes.")
    if posting_guide:
        parts.append(
            f"Posting guide: best times: {posting_guide.get('best_times') or 'N/A'}. "
            f"Best post types: {', '.join(posting_guide.get('best_post_types') or [])}. "
            f"Tips: {'; '.join((posting_guide.get('rubric_tips') or [])[:5])}."
        )
    return "\n\n".join(parts)


async def generate_future_steps(detail: dict[str, Any], posting_guide: dict[str, Any] | None) -> list[dict[str, Any]]:
    """Call Anthropic to get future steps. Returns list of {title, description, evidence[]}."""
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set, returning placeholder future steps")
        return [
            {"title": "Set ANTHROPIC_API_KEY", "description": "Configure your Anthropic API key to generate data-driven future steps.", "evidence": ["No API key configured."]},
        ]
    context = _build_context(detail, posting_guide)
    if not context.strip():
        return [
            {"title": "Collect more data", "description": "Run scrapers (sites, reviews, social) to get competitor and market data, then return here for tailored steps.", "evidence": ["No scraped data available yet."]},
        ]
    model = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=api_key)
        resp = await client.messages.create(
            model=model,
            max_tokens=2048,
            system=FUTURE_STEPS_SYSTEM,
            messages=[{"role": "user", "content": f"Data:\n{context}"}],
        )
        content = ""
        for block in (resp.content or []):
            if hasattr(block, "text"):
                content = block.text or ""
                break
            if isinstance(block, dict) and block.get("type") == "text":
                content = block.get("text") or ""
                break
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        raw = json.loads(content)
        if not isinstance(raw, list):
            return []
        steps: list[dict[str, Any]] = []
        for item in raw[:12]:
            if not isinstance(item, dict):
                continue
            title = (item.get("title") or "").strip() or "Next step"
            description = (item.get("description") or "").strip() or ""
            evidence = item.get("evidence")
            if isinstance(evidence, list):
                evidence = [str(e).strip() for e in evidence if str(e).strip()][:5]
            else:
                evidence = []
            steps.append({"title": title, "description": description, "evidence": evidence})
        return steps
    except json.JSONDecodeError as e:
        logger.warning("future_steps: JSON parse failed: %s", e)
        return []
    except Exception as e:
        logger.warning("future_steps: Anthropic call failed: %s", e, exc_info=True)
        return []
