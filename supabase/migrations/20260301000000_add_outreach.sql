-- Outreach items: DMs sent to competitor followers
create table if not exists public.outreach_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  competitor_id uuid references public.competitors(id) on delete set null,
  source text not null,  -- 'x', 'instagram', 'facebook'
  competitor_handle text,
  username text,
  display_name text,
  bio text,
  dm_sent boolean default false,
  dm_text text,
  created_at timestamptz default now()
);

alter table public.outreach_items enable row level security;

create policy "Users can manage outreach_items of own companies"
  on public.outreach_items for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create index if not exists idx_outreach_items_company on public.outreach_items(company_id);

-- Allow 'outreach' as a scrape_runs type
alter table public.scrape_runs drop constraint if exists scrape_runs_type_check;
alter table public.scrape_runs add constraint scrape_runs_type_check
  check (type in ('site', 'social', 'reviews_google', 'reviews_yelp', 'outreach'));
