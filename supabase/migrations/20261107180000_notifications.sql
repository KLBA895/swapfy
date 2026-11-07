-- Proposal for a test project only. Do not run against production.
-- P11 complete: in-app notices, opt-in sandbox mail prefs, report/block.

create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  notify_in_app boolean not null default true,
  notify_email boolean not null default false,
  notify_push boolean not null default false,
  email_invalid boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  swap_request_id uuid references public.swap_requests (id) on delete cascade,
  message_id uuid references public.swap_messages (id) on delete set null,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.user_blocks (
  id uuid primary key default gen_random_uuid(),
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.swap_messages add column if not exists reported boolean not null default false;

alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.user_blocks enable row level security;

create policy notification_preferences_own
  on public.notification_preferences for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notifications_select_own
  on public.notifications for select
  using (user_id = auth.uid());

create policy notifications_update_own
  on public.notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy user_blocks_own
  on public.user_blocks for all
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());
