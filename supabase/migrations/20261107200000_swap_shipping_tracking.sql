-- Proposal for a test project only. Do not run against production.
-- P14.1: Model A — each party stores their own tracking number after accept.

alter table public.swap_requests
  add column if not exists owner_tracking text,
  add column if not exists requester_tracking text;

alter table public.swap_requests
  drop constraint if exists swap_requests_owner_tracking_len,
  drop constraint if exists swap_requests_requester_tracking_len;

alter table public.swap_requests
  add constraint swap_requests_owner_tracking_len
    check (owner_tracking is null or char_length(owner_tracking) <= 40),
  add constraint swap_requests_requester_tracking_len
    check (requester_tracking is null or char_length(requester_tracking) <= 40);
