-- Proposal for a test project only. Do not run against production.
-- P10.1: swap request MVP (erstellt / angenommen / abgelehnt / zurueckgezogen)

create table if not exists public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items (id) on delete cascade,
  requester_id uuid not null references auth.users (id),
  owner_id uuid not null references auth.users (id),
  status text not null default 'erstellt'
    check (status in ('erstellt', 'angenommen', 'abgelehnt', 'zurueckgezogen')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.swap_requests enable row level security;

create policy swap_requests_select_own
  on public.swap_requests for select
  using (auth.uid() = requester_id or auth.uid() = owner_id);

create policy swap_requests_insert_requester
  on public.swap_requests for insert
  with check (
    auth.uid() = requester_id
    and auth.uid() <> owner_id
    and status = 'erstellt'
  );

create policy swap_requests_update_parties
  on public.swap_requests for update
  using (auth.uid() = requester_id or auth.uid() = owner_id)
  with check (auth.uid() = requester_id or auth.uid() = owner_id);
