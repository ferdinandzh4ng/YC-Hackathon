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
