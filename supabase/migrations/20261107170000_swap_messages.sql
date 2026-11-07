-- Proposal for a test project only. Do not run against production.
-- P11.1: in-app messages bound to a swap request

create table if not exists public.swap_messages (
  id uuid primary key default gen_random_uuid(),
  swap_request_id uuid not null references public.swap_requests (id) on delete cascade,
  sender_id uuid not null references auth.users (id),
  body text not null check (char_length(trim(body)) > 0 and char_length(body) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.swap_messages enable row level security;

create policy swap_messages_select_parties
  on public.swap_messages for select
  using (
    exists (
      select 1 from public.swap_requests r
      where r.id = swap_request_id
        and (r.requester_id = auth.uid() or r.owner_id = auth.uid())
    )
  );

create policy swap_messages_insert_sender
  on public.swap_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.swap_requests r
      where r.id = swap_request_id
        and (r.requester_id = auth.uid() or r.owner_id = auth.uid())
        and r.status in ('erstellt', 'angenommen')
    )
  );
