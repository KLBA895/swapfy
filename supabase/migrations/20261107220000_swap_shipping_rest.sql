-- Proposal for a test project only. Do not run against production.
-- P15 rest: address share, problem, cancel-before-send, return flag.

alter table public.swap_requests
  add column if not exists owner_address text,
  add column if not exists requester_address text,
  add column if not exists problem boolean not null default false,
  add column if not exists owner_cancelled_at timestamptz,
  add column if not exists requester_cancelled_at timestamptz,
  add column if not exists owner_return_at timestamptz,
  add column if not exists requester_return_at timestamptz;

alter table public.swap_requests drop constraint if exists swap_requests_status_check;
alter table public.swap_requests
  add constraint swap_requests_status_check
  check (status in (
    'erstellt', 'angenommen', 'abgelehnt', 'zurueckgezogen',
    'abgeschlossen', 'streit', 'abgebrochen'
  ));
