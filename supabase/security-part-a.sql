-- Security Part A (2026-11-17). Safe, additive hardening. Login is unchanged.
-- 1) Audit trail cannot be edited (manuscript anchor): logs are insert + read only.
-- 2) Records are never hard-deleted: no DELETE on cases, students, concerns
--    (a wrong case is "Withdrawn"; a student who left is marked not enrolled).
-- Undo: re-create the old "allow_all_*" policies (for all using (true) with check (true)).

do $$
declare r record;
begin
  for r in
    select policyname, tablename from pg_policies
    where schemaname = 'public'
      and tablename in ('office_activity_logs', 'audit_changes', 'discipline_cases', 'students', 'student_concerns')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- audit logs: read + add only
alter table public.office_activity_logs enable row level security;
alter table public.audit_changes enable row level security;
create policy logs_read on public.office_activity_logs for select to anon, authenticated using (true);
create policy logs_add on public.office_activity_logs for insert to anon, authenticated with check (true);
create policy audit_read on public.audit_changes for select to anon, authenticated using (true);
create policy audit_add on public.audit_changes for insert to anon, authenticated with check (true);
revoke update, delete, truncate on public.office_activity_logs, public.audit_changes from anon, authenticated;

-- records: read, add, change; never delete
alter table public.discipline_cases enable row level security;
alter table public.students enable row level security;
alter table public.student_concerns enable row level security;
create policy cases_read on public.discipline_cases for select to anon, authenticated using (true);
create policy cases_add on public.discipline_cases for insert to anon, authenticated with check (true);
create policy cases_change on public.discipline_cases for update to anon, authenticated using (true) with check (true);
create policy students_read on public.students for select to anon, authenticated using (true);
create policy students_add on public.students for insert to anon, authenticated with check (true);
create policy students_change on public.students for update to anon, authenticated using (true) with check (true);
create policy concerns_read on public.student_concerns for select to anon, authenticated using (true);
create policy concerns_add on public.student_concerns for insert to anon, authenticated with check (true);
create policy concerns_change on public.student_concerns for update to anon, authenticated using (true) with check (true);
revoke delete, truncate on public.discipline_cases, public.students, public.student_concerns from anon, authenticated;
