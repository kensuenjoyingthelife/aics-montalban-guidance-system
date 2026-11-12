-- Counselor Referral Queue v1 (2026-11-12) — features flowchart page 10. Adds only.
-- One row per referral cycle of a student. Students enter the queue automatically (severe or repeated
-- cases, 2+ missed conferences); a row is written when the office acts (schedule / seen / remove / add).
create table if not exists public.counselor_referrals (
  id bigint generated always as identity primary key,
  student_number text not null,
  student_name text not null,
  status text not null default 'Waiting' check (status in ('Waiting','Scheduled','Seen','Removed')),
  scheduled_date date,
  seen_at timestamptz,
  added_manually boolean not null default false,
  manual_reason text,
  removed_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists counselor_referrals_student_idx on public.counselor_referrals(student_number, id desc);

-- small key/value settings (Settings page 17 will edit these)
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
insert into public.app_settings(key, value) values ('counselor_days', '["Tue","Thu"]'::jsonb)
  on conflict (key) do nothing;

grant select, insert, update on public.counselor_referrals to anon, authenticated;
grant select, insert, update on public.app_settings to anon, authenticated;
revoke delete, truncate on public.counselor_referrals from anon, authenticated;
revoke delete, truncate on public.app_settings from anon, authenticated;
alter table public.counselor_referrals disable row level security;
alter table public.app_settings disable row level security;
notify pgrst, 'reload schema';
