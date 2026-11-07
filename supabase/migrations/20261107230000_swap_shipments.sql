-- Proposal for a test project only. Do not run against production.
-- P16 Phase A: two shipment rows + append-only events. No label API, no webhooks.

create table if not exists public.swap_shipments (
  id uuid primary key default gen_random_uuid(),
  swap_request_id uuid not null references public.swap_requests (id) on delete cascade,
  direction text not null check (direction in ('owner_to_requester', 'requester_to_owner')),
  sender_id uuid not null references auth.users (id),
  recipient_id uuid not null references auth.users (id),
  status text not null default 'nicht_gestartet',
  recipient_address text,
  address_shared_at timestamptz,
  tracking_code text,
  carrier text,
  provider text,
  provider_env text,
  provider_shipment_id text,
  label_ref text,
  marked_sent_at timestamptz,
  carrier_first_scan_at timestamptz,
  received_at timestamptz,
  cancelled_at timestamptz,
  return_marked_at timestamptz,
  created_at timestamptz not null default now(),
  unique (swap_request_id, direction),
  check (provider_env is null or provider_env in ('sandbox', 'production')),
  check (tracking_code is null or char_length(tracking_code) <= 40),
  check (recipient_address is null or char_length(recipient_address) <= 500)
);

create table if not exists public.swap_shipment_events (
  id uuid primary key default gen_random_uuid(),
  shipment_id uuid not null references public.swap_shipments (id) on delete cascade,
  event text not null,
  actor_type text not null check (actor_type in ('user', 'carrier', 'system')),
  actor_id uuid,
  idempotency_key text unique,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.swap_shipments enable row level security;
alter table public.swap_shipment_events enable row level security;

create policy swap_shipments_select_parties
  on public.swap_shipments for select
  using (
    exists (
      select 1 from public.swap_requests r
      where r.id = swap_request_id
        and (r.requester_id = auth.uid() or r.owner_id = auth.uid())
    )
  );

create policy swap_shipment_events_select_parties
  on public.swap_shipment_events for select
  using (
    exists (
      select 1
      from public.swap_shipments s
      join public.swap_requests r on r.id = s.swap_request_id
      where s.id = shipment_id
        and (r.requester_id = auth.uid() or r.owner_id = auth.uid())
    )
  );

-- No client INSERT/UPDATE/DELETE. Mutations go through SECURITY DEFINER RPCs
-- (implemented in the local mock; not installed on production).
-- share_my_shipping_address, set_shipment_tracking, mark_shipment_sent,
-- confirm_shipment_received, cancel_shipment, mark_shipment_return,
-- report_swap_problem, remind_swap_peer.

alter table public.swap_messages drop constraint if exists swap_messages_insert_sender;
drop policy if exists swap_messages_insert_sender on public.swap_messages;
create policy swap_messages_insert_sender
  on public.swap_messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.swap_requests r
      where r.id = swap_request_id
        and (r.requester_id = auth.uid() or r.owner_id = auth.uid())
        and r.status in ('erstellt', 'angenommen', 'streit')
    )
  );
