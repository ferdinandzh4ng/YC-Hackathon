-- Post drafts: AI-generated post drafts for user approval; publish via Browser Use only
create table if not exists public.post_drafts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'x', 'facebook')),
  status text not null default 'draft' check (status in ('draft', 'approved', 'published', 'rejected')),
  caption text,
  image_url text,
  video_url text,
  recommended_time_window text,
  post_type text,
  created_at timestamptz default now(),
  published_at timestamptz
);

alter table public.post_drafts enable row level security;

create policy "Users can manage own post_drafts"
  on public.post_drafts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_post_drafts_company on public.post_drafts(company_id);
create index if not exists idx_post_drafts_user_status on public.post_drafts(user_id, status);
create index if not exists idx_post_drafts_created_at on public.post_drafts(created_at desc);
