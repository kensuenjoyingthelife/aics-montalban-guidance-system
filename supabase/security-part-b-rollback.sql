-- EMERGENCY ROLLBACK of security-part-b-lock.sql: reopens the staff tables to the public key (old behaviour).
do $$ declare t text; begin
  foreach t in array array['discipline_cases','students','parent_appointments','follow_up_tasks','contact_logs','sms_gmail_logs',
    'case_evidence','case_handover_notes','counselor_referrals','case_statements','office_activity_logs','audit_changes',
    'school_year_moves','offense_policies','people_schedules','school_closed_days','shs_sections','guidance_staff','app_settings'] loop
    execute format('grant select, insert, update on public.%I to anon', t);
    execute format('drop policy if exists rollback_anon on public.%I', t);
    execute format('create policy rollback_anon on public.%I for all to anon using (true) with check (true)', t);
  end loop;
end $$;
notify pgrst, 'reload schema';
