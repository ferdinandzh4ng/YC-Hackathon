from typing import Any

from pydantic import BaseModel, Field


class SocialScrapeResponse(BaseModel):
    results: dict[str, list[dict[str, Any]]] = Field(description="Per-source list of posts (handle_or_author, display_name, text, url)")
    live_urls: dict[str, str] = Field(description="Per-source Browser Use Cloud live session URL to watch the run")
    errors: dict[str, str] = Field(default_factory=dict, description="Per-source error message if any")


class ReviewsScrapeResponse(BaseModel):
    results: dict[str, list[dict[str, Any]]] = Field(description="Per-source list of reviews (place_name, rating, review_text, reviewer_name, url)")
    live_urls: dict[str, str] = Field(description="Per-source Browser Use Cloud live session URL")
    errors: dict[str, str] = Field(default_factory=dict, description="Per-source error message if any")


class WebsitesScrapeResponse(BaseModel):
    results: list[dict[str, Any]] = Field(description="List of competitor site items (url, summary, rating_compelled_to_buy, pros, cons)")
    live_urls: dict[str, str] = Field(description="Source key -> Browser Use Cloud live session URL (e.g. 'search' or 'scrape')")
    errors: dict[str, str] = Field(default_factory=dict, description="Per-source error if any")


class OutreachResponse(BaseModel):
    results: dict[str, list[dict[str, Any]]] = Field(description="Per-source list of follower+DM results")
    live_urls: dict[str, str] = Field(description="Per-source Browser Use Cloud live session URL")
    errors: dict[str, str] = Field(default_factory=dict, description="Per-source error message if any")


class CompanyResponse(BaseModel):
    id: str
    name: str
    market: str
    website: str | None
    location: str | None
    created_at: str
    last_updated: str | None = None


class CompetitorResponse(BaseModel):
    id: str
    url: str
    name: str | None


class ScrapeRunResponse(BaseModel):
    id: str
    competitor_id: str | None
    type: str
    status: str
    live_url: str | None
    started_at: str
    completed_at: str | None
    error_message: str | None
    metadata: dict[str, Any] | None = None


class AggregatedFeedback(BaseModel):
    competitor_id: str
    url: str
    competitor_name: str | None
    pros: list[str]
    cons: list[str]
    average_rating: float
    run_count: int


class RankingItem(BaseModel):
    competitor_id: str
    url: str
    name: str | None
    average_rating: float
    rank: int


class PersonaFeedbackResponse(BaseModel):
    competitor_id: str
    url: str
    competitor_name: str | None
    persona: str
    persona_description: str
    rating_raw: str
    rating_numeric: float
    summary: str
    pros: list[str]
    cons: list[str]
    derivation: list[str] = Field(default_factory=list)


class CompanyDetailResponse(BaseModel):
    company: CompanyResponse
    competitors: list[CompetitorResponse]
    aggregated_feedback: list[AggregatedFeedback]
    rankings: list[RankingItem]
    persona_feedback: list[PersonaFeedbackResponse] = Field(default_factory=list)
    review_items: list[dict[str, Any]] = Field(default_factory=list)
    social_items: list[dict[str, Any]] = Field(default_factory=list)
    outreach_items: list[dict[str, Any]] = Field(default_factory=list)


class CompanyListResponse(BaseModel):
    companies: list[CompanyResponse]


class ScrapeRunsListResponse(BaseModel):
    runs: list[ScrapeRunResponse]
    agents_running_count: int


class PostQualityAnalysisItem(BaseModel):
    id: str
    company_id: str
    social_item_id: str | None
    source: str
    post_type: str | None
    hook_strength: int | None
    emotion_match: int | None
    format_fit: int | None
    timing_score: int | None
    cta_clarity: int | None
    total_score: int | None
    signals: dict[str, Any] = Field(default_factory=dict)
    raw_snippet: str | None


class PostQualityInsightsResponse(BaseModel):
    """Stored rubric scores per post (Hook, Emotion, Format, Timing, CTA)."""
    analyses: list[PostQualityAnalysisItem]
    rubric_summary: dict[str, Any] = Field(default_factory=dict)


class PostingGuideResponse(BaseModel):
    """Guide for how to make a good post in the user's market, derived from post_quality_analyses."""
    company_name: str = ""
    market: str = ""
    total_posts_analyzed: int = 0
    best_post_types: list[str] = Field(default_factory=list, description="Post types that score best in your market")
    best_sources: list[str] = Field(default_factory=list, description="Platforms where your content scores highest")
    rubric_tips: list[str] = Field(default_factory=list, description="What works: hook, CTA, etc.")
    best_times: str = Field(default="", description="Recommended posting times")
    average_score: float = 0.0


class FutureStepItem(BaseModel):
    title: str = ""
    description: str = ""
    evidence: list[str] = Field(default_factory=list, description="Quotes or facts from scraped data supporting this step")


class FutureStepsResponse(BaseModel):
    steps: list[FutureStepItem] = Field(default_factory=list)
