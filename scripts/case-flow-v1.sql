-- Case flow v1 (2026-11-11): the 7 steps from the features flowchart + decision and sanction.
-- Only ADDS columns. Existing rows get a starting step from their current status.
alter table public.discipline_cases add column if not exists step text;                 -- Reported | Student Called | Explanation | Parent Notified | Decision | Follow-Up | Closed
alter table public.discipline_cases add column if not exists student_called_at timestamptz;
alter table public.discipline_cases add column if not exists explanation text;           -- the student's side, in short
alter table public.discipline_cases add column if not exists parent_notified_at timestamptz;
alter table public.discipline_cases add column if not exists parent_notified_how text;   -- Conference | Call | Walk-in | Letter
alter table public.discipline_cases add column if not exists decision text;              -- what the office decided
alter table public.discipline_cases add column if not exists sanction text;              -- the final sanction (staff decide)
alter table public.discipline_cases add column if not exists sanction_status text;       -- Pending parent notice | Active | Done
alter table public.discipline_cases add column if not exists decided_at timestamptz;
alter table public.discipline_cases add column if not exists closed_at timestamptz;

update public.discipline_cases
   set step = case when status = 'Resolved' then 'Closed' else 'Reported' end
 where step is null;

notify pgrst, 'reload schema';
