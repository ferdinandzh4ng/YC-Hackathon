from pydantic import BaseModel, Field


class SocialScrapeRequest(BaseModel):
    sources: list[str] = Field(description="One or more of: x, linkedin, instagram, reddit")
    query: str = Field(description="Search query (e.g. 'cake shops', 'competitor name')")
    location: str = Field(default="", description="Location to narrow results (e.g. 'San Francisco')")
    profile_id: str | None = Field(default=None, description="Optional Browser Use profile ID for logged-in sessions")


class ReviewsScrapeRequest(BaseModel):
    sources: list[str] = Field(description="One or more of: google, yelp")
    query: str = Field(description="Search query (e.g. 'cake shops', 'bakery')")
    location: str = Field(default="", description="Location (e.g. 'San Francisco')")
    profile_id: str | None = Field(default=None, description="Optional Browser Use profile ID")


class WebsitesScrapeRequest(BaseModel):
    query: str = Field(description="Search query for competitor discovery")
    location: str = Field(default="", description="Location to narrow search")
    urls: list[str] | None = Field(default=None, description="Optional: specific competitor URLs to scrape (skips search)")
    profile_id: str | None = Field(default=None, description="Optional Browser Use profile ID")
