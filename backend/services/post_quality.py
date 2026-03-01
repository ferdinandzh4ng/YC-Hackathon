"""
Post quality analysis from the Social Post Quality Framework rubric.
Scores each post on: Hook Strength, Emotion Match, Format Fit, Timing, CTA Clarity.
Stores results in post_quality_analyses for AI drafting agents.
"""
import re
import logging
from typing import Any

from db import get_supabase_admin

logger = logging.getLogger(__name__)

# Rubric: Hook 25, Emotion 20, Format 20, Timing 20, CTA 15 = 100
HOOK_MAX = 25
EMOTION_MAX = 20
FORMAT_MAX = 20
TIMING_MAX = 20
CTA_MAX = 15

POWER_WORDS = frozenset([
    "secret", "free", "new", "proven", "easy", "instant", "guaranteed", "best", "ultimate",
    "simple", "powerful", "discover", "essential", "exclusive", "limited", "quick", "real",
    "shocking", "surprising", "honest", "complete", "exact", "critical", "must", "top",
])
QUESTION_STARTERS = ("how", "what", "why", "when", "where", "who", "which", "can", "do", "is", "are", "will")
CTA_PATTERNS = [
    (re.compile(r"\b(save this|bookmark|screenshot|share this)\b", re.I), "save"),
    (re.compile(r"\b(comment below|drop a comment|tell me|what do you think)\b", re.I), "comment"),
    (re.compile(r"\b(share|tag someone|tag a friend)\b", re.I), "share"),
    (re.compile(r"\b(link in bio|link below|click the link|dm me)\b", re.I), "link"),
    (re.compile(r"\b(follow|subscribe)\b", re.I), "follow"),
]
MULTI_CTA_PATTERN = re.compile(r"\b(save|share|comment|follow|link|dm|click)\b", re.I)

POST_TYPE_KEYWORDS = {
    "educational": ["tip", "how to", "ways to", "step", "guide", "learn", "tutorial", "framework", "breakdown"],
    "opinion": ["think", "believe", "hot take", "unpopular", "controversial", "actually", "truth is"],
    "personal": ["i ", "my ", "we ", "story", "journey", "behind the scenes", "lesson learned"],
    "product": ["launch", "new product", "check out", "available", "get it", "limited", "offer"],
    "meme": ["lol", "😂", "tag someone", "relatable", "when you", "me:", "nobody:"],
    "data": ["%", "stat", "study", "research", "data shows", "according to", "survey", "found that"],
}


def _first_n_words(text: str, n: int = 5) -> list[str]:
    words = text.strip().split()
    return [w.lower().strip(".,!?") for w in words[:n]]


def _classify_post_type(text: str) -> str:
    lower = text.lower()
    scores: dict[str, int] = {}
    for ptype, keywords in POST_TYPE_KEYWORDS.items():
        scores[ptype] = sum(1 for k in keywords if k in lower)
    if not scores:
        return "general"
    return max(scores, key=scores.get)


def _score_hook(text: str) -> tuple[int, dict[str, Any]]:
    """Hook Strength 0-25: number +5, question +5, power word +5, under 80 chars +5, format +5."""
    first125 = (text or "")[:125]
    first5 = _first_n_words(first125, 5)
    signals: dict[str, Any] = {}
    score = 0
    if any(w.replace(",", "").replace(".", "").isdigit() for w in first5):
        score += 5
        signals["number_in_hook"] = True
    if first5 and first5[0] in QUESTION_STARTERS:
        score += 5
        signals["question_hook"] = True
    if any(w in POWER_WORDS for w in first5):
        score += 5
        signals["power_word_in_hook"] = True
    if len(first125) <= 80:
        score += 5
        signals["hook_under_80_chars"] = True
    signals["format_match"] = True  # assume text post is acceptable
    score += 5
    return min(score, HOOK_MAX), signals


def _score_emotion(text: str, post_type: str) -> int:
    """Emotion Match 0-20: simplified - curiosity for educational, etc."""
    lower = text.lower()
    if post_type == "educational" and ("?" in text or "how" in lower or "why" in lower):
        return 16
    if post_type == "opinion" and ("think" in lower or "believe" in lower):
        return 16
    if post_type == "personal" and ("i " in lower or "my " in lower):
        return 16
    if post_type == "product" and ("new" in lower or "launch" in lower):
        return 14
    if post_type == "data" and ("%" in text or "stat" in lower):
        return 16
    return 10


def _score_cta(text: str) -> tuple[int, dict[str, Any]]:
    """CTA Clarity 0-15: one clear CTA=15, weak=5, multiple=3."""
    if not (text or "").strip():
        return 0, {}
    signals: dict[str, Any] = {}
    matches = list(MULTI_CTA_PATTERN.finditer(text))
    cta_count = len(matches)
    which = None
    for pat, name in CTA_PATTERNS:
        if pat.search(text):
            which = name
            break
    if cta_count == 0:
        return 5, {"cta_absent": True}
    if cta_count == 1 and which:
        signals["single_cta"] = which
        return 15, signals
    signals["multiple_ctas"] = True
    return 3, signals


def analyze_post(text: str, source: str) -> dict[str, Any]:
    """
    Score a single post per the rubric. Returns dict with post_type, hook_strength,
    emotion_match, format_fit, timing_score, cta_clarity, total_score, signals, raw_snippet.
    """
    text = (text or "").strip()
    if len(text) < 10:
        return {
            "post_type": "general",
            "hook_strength": 0,
            "emotion_match": 0,
            "format_fit": 10,
            "timing_score": 0,
            "cta_clarity": 0,
            "total_score": 0,
            "signals": {},
            "raw_snippet": text[:500],
        }
    post_type = _classify_post_type(text)
    hook_score, hook_signals = _score_hook(text)
    emotion_score = _score_emotion(text, post_type)
    format_fit = 10  # we don't have format from scrape; default text post
    timing_score = 0  # we don't have posted_at
    cta_score, cta_signals = _score_cta(text)
    signals = {**hook_signals, **cta_signals, "post_type": post_type}
    total = hook_score + emotion_score + format_fit + timing_score + cta_score
    return {
        "post_type": post_type,
        "hook_strength": hook_score,
        "emotion_match": emotion_score,
        "format_fit": format_fit,
        "timing_score": timing_score,
        "cta_clarity": cta_score,
        "total_score": min(100, total),
        "signals": signals,
        "raw_snippet": text[:500],
    }


def analyze_and_store_for_company(company_id: str) -> int:
    """
    Fetch all social_items for company, score each with analyze_post, upsert into post_quality_analyses.
    Returns number of analyses stored. Idempotent: replaces analyses for existing social_item_ids.
    """
    supabase = get_supabase_admin()
    rows = supabase.table("social_items").select("id, source, text").eq("company_id", company_id).execute()
    items = rows.data or []
    if not items:
        return 0
    stored = 0
    for item in items:
        social_id = item.get("id")
        source = (item.get("source") or "x").lower()
        text = item.get("text") or ""
        result = analyze_post(text, source)
        payload = {
            "company_id": company_id,
            "social_item_id": social_id,
            "source": source,
            "post_type": result["post_type"],
            "hook_strength": result["hook_strength"],
            "emotion_match": result["emotion_match"],
            "format_fit": result["format_fit"],
            "timing_score": result["timing_score"],
            "cta_clarity": result["cta_clarity"],
            "total_score": result["total_score"],
            "signals": result["signals"],
            "raw_snippet": result["raw_snippet"],
        }
        existing = supabase.table("post_quality_analyses").select("id").eq("social_item_id", social_id).execute()
        if existing.data and len(existing.data) > 0:
            supabase.table("post_quality_analyses").update(payload).eq("social_item_id", social_id).execute()
        else:
            supabase.table("post_quality_analyses").insert(payload).execute()
        stored += 1
    logger.info("post_quality: stored %d analyses for company_id=%s", stored, company_id)
    return stored


def build_posting_guide(supabase: Any, company_id: str, company_name: str, market: str) -> dict[str, Any]:
    """
    Build a posting guide from post_quality_analyses: best post types, sources, rubric tips, best times.
    Returns a dict suitable for PostingGuideResponse.
    """
    rows = (
        supabase.table("post_quality_analyses")
        .select("source, post_type, total_score, hook_strength, emotion_match, cta_clarity, signals")
        .eq("company_id", company_id)
        .execute()
    )
    data = rows.data or []
    if not data:
        return {
            "company_name": company_name or "",
            "market": market or "",
            "total_posts_analyzed": 0,
            "best_post_types": [],
            "best_sources": [],
            "rubric_tips": [
                "Start with a number or question in the first line (e.g. \"3 ways to…\", \"Why does…\").",
                "Keep the hook under 80 characters to stop the scroll.",
                "Use one clear CTA: \"Save this\", \"Comment below\", \"Link in bio\", or \"Follow for more\".",
                "Match emotion to content: curiosity for educational, excitement for product.",
            ],
            "best_times": "Post Tue–Thu 9–11 AM or 7–9 PM for most engagement. Weekend mornings work for lifestyle brands.",
            "average_score": 0.0,
        }
    scores = [r.get("total_score") or 0 for r in data]
    avg = sum(scores) / len(scores) if scores else 0
    # Best post types by average score
    by_type: dict[str, list[int]] = {}
    for r in data:
        pt = (r.get("post_type") or "general").strip() or "general"
        if pt not in by_type:
            by_type[pt] = []
        by_type[pt].append(r.get("total_score") or 0)
    type_avg = {t: sum(s) / len(s) for t, s in by_type.items() if s}
    best_post_types = [t for t, _ in sorted(type_avg.items(), key=lambda x: -x[1])[:5]]
    # Best sources
    by_source: dict[str, list[int]] = {}
    for r in data:
        src = (r.get("source") or "x").strip().lower()
        if src not in by_source:
            by_source[src] = []
        by_source[src].append(r.get("total_score") or 0)
    source_avg = {s: sum(n) / len(n) for s, n in by_source.items() if n}
    best_sources = [s for s, _ in sorted(source_avg.items(), key=lambda x: -x[1])[:5]]
    # Rubric tips from high scorers
    high = [r for r in data if (r.get("total_score") or 0) >= 70]
    rubric_tips: list[str] = []
    if high:
        hook_high = sum(1 for r in high if (r.get("hook_strength") or 0) >= 15)
        if hook_high >= len(high) // 2:
            rubric_tips.append("Strong hooks (number, question, or power word in the first line) are common in top posts.")
        cta_high = sum(1 for r in high if (r.get("cta_clarity") or 0) >= 10)
        if cta_high >= len(high) // 2:
            rubric_tips.append("Top posts use one clear CTA (save, comment, link, or follow).")
        signals_question = sum(1 for r in high if (r.get("signals") or {}).get("question_hook"))
        if signals_question > 0:
            rubric_tips.append("Question hooks perform well in your market.")
        signals_short = sum(1 for r in high if (r.get("signals") or {}).get("hook_under_80_chars"))
        if signals_short > 0:
            rubric_tips.append("Keeping the first line under 80 characters helps stop the scroll.")
    if not rubric_tips:
        rubric_tips = [
            "Start with a number or question in the first line.",
            "Keep the hook under 80 characters.",
            "Use one clear CTA: Save this, Comment below, Link in bio, or Follow for more.",
            "Match emotion to content type (curiosity for educational, excitement for product).",
        ]
    return {
        "company_name": company_name or "",
        "market": market or "",
        "total_posts_analyzed": len(data),
        "best_post_types": best_post_types[:5],
        "best_sources": best_sources[:5],
        "rubric_tips": rubric_tips[:6],
        "best_times": "Post Tue–Thu 9–11 AM or 7–9 PM for most engagement. Weekend mornings work for lifestyle brands.",
        "average_score": round(avg, 1),
    }
