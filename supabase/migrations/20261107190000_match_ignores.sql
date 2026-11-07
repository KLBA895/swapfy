-- Proposal for a test project only. Do not run against production.
-- P12.1: per-user ignore list for explainable swap suggestions.

create table if not exists public.match_ignores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_item_id uuid not null references public.items (id) on delete cascade,
  candidate_item_id uuid not null references public.items (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, source_item_id, candidate_item_id)
);

alter table public.match_ignores enable row level security;

create policy match_ignores_own
  on public.match_ignores for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
