-- Concerns v1 (2026-11-12): Submitted Reports (page 11) + Concern Chats (page 12). Adds only; deletes nothing.
alter table public.student_concerns
  add column if not exists student_number text,
  add column if not exists account_id bigint,
  add column if not exists concern_type text,
  add column if not exists what_happened text,
  add column if not exists happened_when text,
  add column if not exists happened_where text,
  add column if not exists who_involved text,
  add column if not exists witnesses text,
  add column if not exists is_confidential boolean not null default false,
  add column if not exists is_urgent boolean not null default false,
  add column if not exists truthful boolean not null default false,
  add column if not exists reject_reason text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists linked_case_code text,
  add column if not exists chat_status text not null default 'None',
  add column if not exists chat_closed_at timestamptz,
  add column if not exists is_practice boolean not null default false;

-- student portal accounts (the portal comes later; the office can block fake ones now)
create table if not exists public.portal_accounts (
  id bigint generated always as identity primary key,
  student_number text,
  full_name text not null,
  email text,
  status text not null default 'Active',          -- Active | Deactivated
  deactivated_reason text,
  deactivated_at timestamptz,
  is_practice boolean not null default false,
  created_at timestamptz not null default now()
);

-- one chat per approved concern; messages are kept forever (no edit, no delete)
create table if not exists public.concern_messages (
  id bigint generated always as identity primary key,
  concern_id bigint not null references public.student_concerns(id),
  sender text not null check (sender in ('office','student')),
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists concern_messages_concern_idx on public.concern_messages(concern_id, id);

grant select, insert, update on public.portal_accounts to anon, authenticated;
grant select, insert on public.concern_messages to anon, authenticated;
revoke update, delete, truncate on public.concern_messages from anon, authenticated;
revoke delete, truncate on public.portal_accounts from anon, authenticated;
alter table public.portal_accounts disable row level security;
alter table public.concern_messages disable row level security;
notify pgrst, 'reload schema';

-- status values for the flowchart (Approve / Reject); old values stay allowed
alter table public.student_concerns drop constraint if exists student_concerns_status_check;
alter table public.student_concerns add constraint student_concerns_status_check
  check (status in ('Pending','Approved','Rejected','Acknowledged','In Counseling','Resolved'));
alter table public.student_concerns add constraint student_concerns_chat_status_check
  check (chat_status in ('None','Open','Closed'));
alter table public.portal_accounts add constraint portal_accounts_status_check
  check (status in ('Active','Deactivated'));
notify pgrst, 'reload schema';

-- last message per chat (for the "new reply" dot) without downloading every message
create or replace view public.concern_last_messages with (security_invoker = true) as
  select distinct on (concern_id) id, concern_id, sender, body, created_at
  from public.concern_messages order by concern_id, id desc;
grant select on public.concern_last_messages to anon, authenticated;
notify pgrst, 'reload schema';
