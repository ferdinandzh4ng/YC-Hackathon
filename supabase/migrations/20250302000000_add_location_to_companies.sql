-- Add any missing columns to companies (if table was created with a subset of columns)
alter table public.companies add column if not exists market text;
alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists location text;
