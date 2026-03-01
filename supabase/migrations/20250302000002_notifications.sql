-- Notifications: in-app alerts for scrape completion and draft approval
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('scrape_done', 'scrape_failed', 'draft_ready')),
  title text not null,
  body text,
  link text,
  company_id uuid references public.companies(id) on delete set null,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;

create policy "Users can manage own notifications"
  on public.notifications for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists idx_notifications_user_read on public.notifications(user_id, read_at);
create index if not exists idx_notifications_created_at on public.notifications(created_at desc);
