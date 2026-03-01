-- Post quality analyses: rubric-based scores per social post for AI drafting agent
create table if not exists public.post_quality_analyses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  social_item_id uuid references public.social_items(id) on delete cascade,
  source text not null,
  post_type text,
  hook_strength int check (hook_strength >= 0 and hook_strength <= 25),
  emotion_match int check (emotion_match >= 0 and emotion_match <= 20),
  format_fit int check (format_fit >= 0 and format_fit <= 20),
  timing_score int check (timing_score >= 0 and timing_score <= 20),
  cta_clarity int check (cta_clarity >= 0 and cta_clarity <= 15),
  total_score int check (total_score >= 0 and total_score <= 100),
  signals jsonb default '{}',
  raw_snippet text,
  created_at timestamptz default now()
);

alter table public.post_quality_analyses enable row level security;

create policy "Users can view post_quality_analyses of own companies"
  on public.post_quality_analyses for all
  using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));

create index if not exists idx_post_quality_company on public.post_quality_analyses(company_id);
create index if not exists idx_post_quality_social_item on public.post_quality_analyses(social_item_id);
create index if not exists idx_post_quality_total_score on public.post_quality_analyses(company_id, total_score desc);
