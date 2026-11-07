-- Proposal for a test project only. Do not run against production.
-- P16 Phase B: sandbox webhook inbox. No live carrier, no production keys.

create table if not exists public.provider_webhook_inbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_env text not null check (provider_env in ('sandbox', 'production')),
  delivery_id text not null,
  payload_hash text not null,
  carrier_status text,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_env, delivery_id)
);

alter table public.provider_webhook_inbox enable row level security;

-- No client policies: inbox is service/webhook only.

-- Production label RPC is intentionally not created here.
-- LABEL_API_ENABLED remains off until an explicit production wiring review.
