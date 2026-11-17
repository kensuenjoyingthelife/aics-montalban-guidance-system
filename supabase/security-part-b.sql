-- Security Part B (2026-11-17) — "paraang B": Edge Function + RLS, no Supabase Auth (requirements lock).
-- B1: server-side staff login (PIN + OTP) with expiring sessions. Only the Edge Function (service role) touches these.

create table if not exists public.staff_sessions (
  token_hash text primary key,
  email text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create table if not exists public.staff_login_state (
  k text primary key,                 -- 'pin' (office PIN tries) or an email (OTP)
  fails int not null default 0,
  locked_until timestamptz,
  otp_hash text,
  otp_expires_at timestamptz,
  otp_tries int not null default 0
);
alter table public.staff_sessions enable row level security;
alter table public.staff_login_state enable row level security;
revoke all on public.staff_sessions, public.staff_login_state from anon, authenticated;

-- portal sign-up only needs to know a student number exists (no parent phone, no email)
create or replace function public.portal_find_student(p_number text)
returns table (student_number text, full_name text, grade_section text)
language sql security definer set search_path = public as $$
  select s.student_number, s.full_name, s.grade_section from public.students s where s.student_number = trim(p_number) limit 1;
$$;
grant execute on function public.portal_find_student(text) to anon;

notify pgrst, 'reload schema';
