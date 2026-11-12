-- Security lock-down v1 (2026-11-10). No data is deleted; every line can be undone with GRANT.
-- The app (anon key) never deletes rows, so deleting is blocked everywhere.

-- 1) Nobody with the public anon key can delete anything
revoke delete on all tables in schema public from anon, authenticated;

-- 2) Audit trail + message log are append-only (manuscript: audit trail that cannot be edited)
revoke update, delete, truncate on public.office_activity_logs from anon, authenticated;
revoke update, delete, truncate on public.sms_gmail_logs from anon, authenticated;

-- 3) Staff list is not used by the app: close it to the public key
revoke all on public.guidance_staff from anon;

-- 4) Nobody with the public key can wipe a table
revoke truncate on all tables in schema public from anon, authenticated;

notify pgrst, 'reload schema';
