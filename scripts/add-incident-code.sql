-- Links cases that came from the same incident (e.g. a fight with 3 students).
-- Safe to run more than once. Adds one optional column; existing rows are not changed.
-- Run in: Supabase dashboard → SQL Editor → New query → paste → Run.

alter table public.discipline_cases
  add column if not exists incident_code text;

create index if not exists discipline_cases_incident_code_idx
  on public.discipline_cases (incident_code);

-- Tell the API about the new column right away
notify pgrst, 'reload schema';
