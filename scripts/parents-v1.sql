-- Parents & Conferences v1 (2026-11-11). Only ADDS columns/tables; nothing is deleted or changed.
-- Safe to run more than once.

-- 1) Conferences: reminder, notice received, reschedule link
alter table public.parent_appointments add column if not exists reminder_sent_at timestamptz;
alter table public.parent_appointments add column if not exists notice_received boolean not null default false;
alter table public.parent_appointments add column if not exists rescheduled_from text;
create index if not exists parent_appointments_date_idx on public.parent_appointments (appointment_date);

-- 2) Parent's preferred days/times (used by Smart Scheduling)
alter table public.students add column if not exists parent_pref_days text;   -- e.g. 'Mon,Wed,Fri'
alter table public.students add column if not exists parent_pref_time text;   -- 'AM' | 'PM' | ''

-- 3) Contact log: every call, text and student call-out (append-only, like the audit trail)
create table if not exists public.contact_logs (
  id bigint generated always as identity primary key,
  case_code text,
  appointment_code text,
  student_name text,
  parent_name text,
  method text not null,          -- 'Call' | 'Text' | 'Student call-out' | 'Walk-in'
  result text not null,          -- 'Reached' | 'No answer' | 'Wrong number' | 'Will come' | 'Asked to reschedule'
  note text,
  actor text not null default 'Guidance Associate',
  created_at timestamptz not null default now()
);
alter table public.contact_logs enable row level security;
drop policy if exists allow_read_insert_contact_logs on public.contact_logs;
create policy allow_read_insert_contact_logs on public.contact_logs for all to anon, authenticated using (true) with check (true);
grant select, insert on public.contact_logs to anon, authenticated;
revoke update, delete, truncate on public.contact_logs from anon, authenticated;

-- 4) SMS / email log: what kind of message, for which conference, and why it failed
alter table public.sms_gmail_logs add column if not exists kind text;              -- 'notice' | 'reminder' | 'reschedule'
alter table public.sms_gmail_logs add column if not exists appointment_code text;
alter table public.sms_gmail_logs add column if not exists error text;

notify pgrst, 'reload schema';
