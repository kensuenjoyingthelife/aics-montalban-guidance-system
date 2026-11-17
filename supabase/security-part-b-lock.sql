-- Security Part B — LOCK (Supabase Auth + RLS). Run AFTER the staff app signs in with Supabase Auth.
-- Staff = a signed-in Supabase Auth user whose email is an ACTIVE guidance_staff row. All staff have full control.

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.guidance_staff g
    where g.is_active and lower(g.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
grant execute on function public.is_staff() to anon, authenticated;

do $$
declare
  t text;
  p record;
  -- staff-only: nobody without a staff session can read or write
  staff_only text[] := array['discipline_cases','students','parent_appointments','follow_up_tasks','contact_logs',
    'sms_gmail_logs','case_evidence','case_handover_notes','counselor_referrals','case_statements',
    'office_activity_logs','audit_changes','school_year_moves'];
  -- settings everyone may READ (office hours, offenses, staff emails for the login screen); only staff change them
  read_all text[] := array['offense_policies','people_schedules','school_closed_days','shs_sections','guidance_staff','app_settings'];
begin
  foreach t in array staff_only || read_all loop
    execute format('alter table public.%I enable row level security', t);
    for p in select polname from pg_policy where polrelid = format('public.%I', t)::regclass loop
      execute format('drop policy %I on public.%I', p.polname, t);
    end loop;
    execute format('revoke all on public.%I from anon', t);
    execute format('create policy staff_all on public.%I for all to authenticated using (public.is_staff()) with check (public.is_staff())', t);
    execute format('grant select, insert, update on public.%I to authenticated', t);
  end loop;

  foreach t in array read_all loop
    execute format('grant select on public.%I to anon', t);
    if t = 'app_settings' then
      -- the PIN hash is never readable without a staff session
      execute 'create policy read_settings on public.app_settings for select to anon using (key <> ''app_pin'')';
    else
      execute format('create policy read_all on public.%I for select to anon using (true)', t);
    end if;
  end loop;
end $$;

-- Part A rules stay: the audit trail is add/read only; cases, students and concerns are never deleted
revoke update, delete on public.office_activity_logs, public.audit_changes, public.case_statements from authenticated;
revoke delete on public.discipline_cases, public.students from authenticated;
grant delete on public.parent_appointments, public.follow_up_tasks, public.case_evidence, public.people_schedules,
  public.school_closed_days, public.offense_policies, public.guidance_staff, public.case_handover_notes to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- shared with the student portal (portal moves to Supabase Auth later): keep the portal working, and let staff in too
grant select, insert, update on public.student_concerns, public.concern_messages, public.portal_accounts to authenticated;
grant select on public.concern_last_messages to authenticated;
do $$ begin
  if not exists (select 1 from pg_policy where polname = 'staff_all' and polrelid = 'public.student_concerns'::regclass) then
    create policy staff_all on public.student_concerns for all to authenticated using (public.is_staff()) with check (public.is_staff());
  end if;
end $$;

notify pgrst, 'reload schema';

-- storage: case evidence is staff-only; the old ID bucket is private (ID feature removed)
drop policy if exists "case evidence upload" on storage.objects;
drop policy if exists "case evidence read" on storage.objects;
create policy "case evidence staff upload" on storage.objects for insert to authenticated with check (bucket_id = 'case-evidence' and public.is_staff());
create policy "case evidence staff read" on storage.objects for select to authenticated using (bucket_id = 'case-evidence' and public.is_staff());
drop policy if exists "Allow anon read student-ids" on storage.objects;
update storage.buckets set public = false where id = 'student-ids';
