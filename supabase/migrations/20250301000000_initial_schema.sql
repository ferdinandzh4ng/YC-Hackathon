-- Companies: one per user entry (name, market, website, location from geolocation)
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  market text not null,
  website text,
  location text,
  created_at timestamptz default now()
);

alter table public.companies enable row level security;

create policy "Users can manage own companies"
  on public.companies for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Competitors: discovered from competitor search, stored for scraping
create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  url text not null,
  name text,
  created_at timestamptz default now()
);

alter table public.competitors enable row level security;

create policy "Users can manage competitors of own companies"
  on public.competitors for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

-- Scrape runs: one row per agent run (site/social/reviews), has live_url and status
create table if not exists public.scrape_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  type text not null check (type in ('site', 'social', 'reviews_google', 'reviews_yelp')),
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  live_url text,
  started_at timestamptz default now(),
  completed_at timestamptz,
  error_message text,
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.scrape_runs enable row level security;

create policy "Users can manage scrape_runs of own companies"
  on public.scrape_runs for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

-- Site feedback: one row per persona per competitor URL (4 personas per site)
create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.scrape_runs(id) on delete cascade,
  competitor_id uuid not null references public.competitors(id) on delete cascade,
  url text not null,
  persona text not null,
  rating_compelled_to_buy text,
  summary text,
  pros jsonb default '[]',
  cons jsonb default '[]',
  created_at timestamptz default now()
);

alter table public.site_feedback enable row level security;

create policy "Users can view site_feedback of own companies"
  on public.site_feedback for all
  using (exists (
    select 1 from public.scrape_runs sr
    join public.companies c on c.id = sr.company_id
    where sr.id = run_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.scrape_runs sr
    join public.companies c on c.id = sr.company_id
    where sr.id = run_id and c.user_id = auth.uid()
  ));

-- Review items: Google and Yelp reviews (for company or competitors)
create table if not exists public.review_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  source text not null check (source in ('google', 'yelp')),
  place_name text,
  rating text,
  review_text text,
  reviewer_name text,
  url text,
  created_at timestamptz default now()
);

alter table public.review_items enable row level security;

create policy "Users can manage review_items of own companies"
  on public.review_items for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

-- Social items: from social scrape (competitors' socials)
create table if not exists public.social_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  source text not null,
  handle_or_author text,
  display_name text,
  text text,
  url text,
  created_at timestamptz default now()
);

alter table public.social_items enable row level security;

create policy "Users can manage social_items of own companies"
  on public.social_items for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

-- Indexes for common lookups
create index if not exists idx_companies_user_id on public.companies(user_id);
create index if not exists idx_competitors_company_id on public.competitors(company_id);
create index if not exists idx_scrape_runs_company_status on public.scrape_runs(company_id, status);
create index if not exists idx_scrape_runs_competitor on public.scrape_runs(competitor_id);
create index if not exists idx_site_feedback_competitor on public.site_feedback(competitor_id);
create index if not exists idx_review_items_company_source on public.review_items(company_id, source);
create index if not exists idx_social_items_company on public.social_items(company_id);
