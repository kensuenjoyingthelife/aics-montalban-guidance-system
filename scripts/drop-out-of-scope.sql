-- removed-forever features (CLAUDE.md, 2026-11-12): both tables were empty when dropped (2026-11-17)
drop table if exists public.community_service_logs;
drop table if exists public.confiscated_ids;
notify pgrst, 'reload schema';
