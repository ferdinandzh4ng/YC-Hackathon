from pydantic import BaseModel, Field


class SocialScrapeRequest(BaseModel):
    sources: list[str] = Field(description="One or more of: x, instagram, facebook")
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


class OutreachRequest(BaseModel):
    sources: list[str] = Field(description="One or more of: x, instagram, facebook")
    competitor_handle: str = Field(description="Competitor social handle (e.g. '@competitor' or 'competitor')")
    company_name: str = Field(description="Your company name")
    company_market: str = Field(description="Your company market / industry")
    limit: int = Field(default=20, description="Max followers to DM per platform")
    profile_id: str | None = Field(default=None, description="Optional Browser Use profile ID for logged-in sessions")


class CompanyCreateRequest(BaseModel):
    name: str = Field(description="Company name")
    market: str = Field(description="Market / industry (free text)")
    website: str = Field(default="", description="Company website URL")
    location: str = Field(default="", description="Location from geolocation")
