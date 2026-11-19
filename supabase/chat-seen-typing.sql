-- Chat: real "Seen" + "typing..." (no new service; plain tables + RPC)
-- Safe to run more than once. Undo is at the bottom.

-- 1. when the other side read a message
alter table public.concern_messages add column if not exists seen_at timestamptz;

-- 2. who is typing right now (separate small table so the audit trail is not flooded)
create table if not exists public.chat_typing (
  concern_id bigint not null,
  who text not null check (who in ('office', 'student')),
  at timestamptz not null default now(),
  primary key (concern_id, who)
);
alter table public.chat_typing enable row level security;
-- no direct access; only the functions below touch it

-- 3. mark the other side's messages as seen
create or replace function public.chat_mark_seen(p_concern bigint, p_reader text)
returns void language sql security definer set search_path = public as $$
  update public.concern_messages
     set seen_at = now()
   where concern_id = p_concern
     and sender <> p_reader
     and seen_at is null;
$$;

-- 4. "I am typing"
create or replace function public.chat_set_typing(p_concern bigint, p_who text)
returns void language sql security definer set search_path = public as $$
  insert into public.chat_typing (concern_id, who, at)
  values (p_concern, p_who, now())
  on conflict (concern_id, who) do update set at = excluded.at;
$$;

-- 5. one light call per check: who is typing + last seen message of each side
create or replace function public.chat_state(p_concern bigint)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'office_typing',  exists (select 1 from public.chat_typing where concern_id = p_concern and who = 'office'  and at > now() - interval '5 seconds'),
    'student_typing', exists (select 1 from public.chat_typing where concern_id = p_concern and who = 'student' and at > now() - interval '5 seconds'),
    'office_seen_upto',  coalesce((select max(id) from public.concern_messages where concern_id = p_concern and sender = 'office'  and seen_at is not null), 0),
    'student_seen_upto', coalesce((select max(id) from public.concern_messages where concern_id = p_concern and sender = 'student' and seen_at is not null), 0)
  );
$$;

grant execute on function public.chat_mark_seen(bigint, text) to anon, authenticated;
grant execute on function public.chat_set_typing(bigint, text) to anon, authenticated;
grant execute on function public.chat_state(bigint) to anon, authenticated;

notify pgrst, 'reload schema';

-- UNDO (only if needed):
-- drop function if exists public.chat_state(bigint);
-- drop function if exists public.chat_set_typing(bigint, text);
-- drop function if exists public.chat_mark_seen(bigint, text);
-- drop table if exists public.chat_typing;
-- alter table public.concern_messages drop column if exists seen_at;
