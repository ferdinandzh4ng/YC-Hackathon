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


class CompanyDetailResponse(BaseModel):
    company: CompanyResponse
    competitors: list[CompetitorResponse]
    aggregated_feedback: list[AggregatedFeedback]
    rankings: list[RankingItem]
    review_items: list[dict[str, Any]] = Field(default_factory=list)
    social_items: list[dict[str, Any]] = Field(default_factory=list)


class CompanyListResponse(BaseModel):
    companies: list[CompanyResponse]


class ScrapeRunsListResponse(BaseModel):
    runs: list[ScrapeRunResponse]
    agents_running_count: int
