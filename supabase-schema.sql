-- Daily Check-In — Supabase schema
-- Run this in your Supabase project: SQL Editor -> New query -> paste -> Run.

-- One row per person, per day. Re-saving the same day updates the row (upsert).
create table if not exists public.check_ins (
  id          uuid primary key default gen_random_uuid(),
  person      text not null,                       -- 'reid' or 'kaden'
  check_date  date not null,                       -- YYYY-MM-DD (local day)
  mood        text not null check (mood in ('good', 'okay', 'rough')),
  note        text default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (person, check_date)
);

-- Keep updated_at fresh on every update.
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_check_ins_updated_at on public.check_ins;
create trigger trg_check_ins_updated_at
  before update on public.check_ins
  for each row execute function public.set_updated_at();

-- Row Level Security.
alter table public.check_ins enable row level security;

-- This is a shared, no-login dashboard: allow the public (anon) key to
-- read and write check-ins. Anyone with your site URL + anon key can do this.
-- If you later add Supabase Auth, replace these with per-user policies.
drop policy if exists "public read"   on public.check_ins;
drop policy if exists "public insert" on public.check_ins;
drop policy if exists "public update" on public.check_ins;
drop policy if exists "public delete" on public.check_ins;

create policy "public read"   on public.check_ins for select using (true);
create policy "public insert" on public.check_ins for insert with check (true);
create policy "public update" on public.check_ins for update using (true) with check (true);
create policy "public delete" on public.check_ins for delete using (true);
