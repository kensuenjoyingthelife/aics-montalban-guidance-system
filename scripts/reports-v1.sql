-- Reports v1 (2026-11-12) — features flowchart page 14. Adds only.
-- 1) "Time to close" needs the day a case was closed: the database stamps it by itself.
create or replace function public.stamp_case_closed() returns trigger
language plpgsql as $$
begin
  if new.status = 'Resolved' and (tg_op = 'INSERT' or old.status is distinct from 'Resolved') then
    new.closed_at := coalesce(new.closed_at, now());
  elsif new.status <> 'Resolved' and tg_op = 'UPDATE' and old.status = 'Resolved' then
    new.closed_at := null; -- reopened
  end if;
  return new;
end $$;
drop trigger if exists discipline_cases_stamp_closed on public.discipline_cases;
create trigger discipline_cases_stamp_closed before insert or update of status on public.discipline_cases
  for each row execute function public.stamp_case_closed();

-- 2) Handover notes: short notes so another staff member can continue a case.
--    Kept forever (no edit / delete) — not counseling notes (out of scope, manuscript 1.6).
create table if not exists public.case_handover_notes (
  id bigint generated always as identity primary key,
  case_code text not null,
  note text not null check (length(note) between 3 and 1000),
  author text,
  created_at timestamptz not null default now()
);
create index if not exists case_handover_notes_case_idx on public.case_handover_notes(case_code, id desc);
grant select, insert on public.case_handover_notes to anon, authenticated;
revoke update, delete, truncate on public.case_handover_notes from anon, authenticated;
alter table public.case_handover_notes disable row level security;

-- every new note is also in the Audit Trail
drop trigger if exists audit_case_handover_notes on public.case_handover_notes;
create trigger audit_case_handover_notes after insert or update or delete on public.case_handover_notes
  for each row execute function public.audit_row_change('case_code');

notify pgrst, 'reload schema';
