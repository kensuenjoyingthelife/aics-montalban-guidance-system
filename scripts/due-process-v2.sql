-- Due process v2 (2026-11-17)
-- 1) per-incident choice: wait for every student's parent before deciding
alter table public.discipline_cases add column if not exists wait_for_all boolean not null default false;

-- 2) statements of the reporter / affected student / witness (office only, never shown to students or parents)
create table if not exists public.case_statements (
  id uuid primary key default gen_random_uuid(),
  case_code text not null,
  incident_code text,
  person_name text not null,
  role text not null check (role in ('reporter', 'affected', 'witness')),
  statement text not null,
  created_at timestamptz not null default now()
);
create index if not exists case_statements_case_idx on public.case_statements (case_code);
create index if not exists case_statements_incident_idx on public.case_statements (incident_code);

alter table public.case_statements enable row level security;
drop policy if exists statements_read on public.case_statements;
drop policy if exists statements_add on public.case_statements;
create policy statements_read on public.case_statements for select to anon, authenticated using (true);
create policy statements_add on public.case_statements for insert to anon, authenticated with check (true);
-- statements are evidence: no edit, no delete (same as the audit trail)
revoke update, delete, truncate on public.case_statements from anon, authenticated;

notify pgrst, 'reload schema';

-- 3) the app marks a moved conference as 'Rescheduled' (it was rejected before, so the old slot stayed booked)
alter table public.parent_appointments drop constraint if exists parent_appointments_status_check;
alter table public.parent_appointments add constraint parent_appointments_status_check
  check (status in ('Scheduled', 'Attended', 'Did Not Attend', 'Rescheduled'));
notify pgrst, 'reload schema';

-- 4) due process: notice of the complaint, principal approval, appeal (2026-11-17)
alter table public.discipline_cases
  add column if not exists complaint_noticed_at timestamptz,
  add column if not exists principal_approved_by text,
  add column if not exists principal_approved_at timestamptz,
  add column if not exists appeal_requested_at timestamptz,
  add column if not exists appeal_by text,
  add column if not exists appeal_reason text,
  add column if not exists appeal_result text,
  add column if not exists appeal_note text;
notify pgrst, 'reload schema';
