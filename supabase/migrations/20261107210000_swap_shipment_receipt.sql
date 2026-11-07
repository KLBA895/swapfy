-- Proposal for a test project only. Do not run against production.
-- P15.1: per-direction sent + receipt; complete only when both confirm.

alter table public.swap_requests
  add column if not exists owner_marked_sent_at timestamptz,
  add column if not exists requester_marked_sent_at timestamptz,
  add column if not exists owner_received_at timestamptz,
  add column if not exists requester_received_at timestamptz;

alter table public.swap_requests drop constraint if exists swap_requests_status_check;
alter table public.swap_requests
  add constraint swap_requests_status_check
  check (status in ('erstellt', 'angenommen', 'abgelehnt', 'zurueckgezogen', 'abgeschlossen'));
