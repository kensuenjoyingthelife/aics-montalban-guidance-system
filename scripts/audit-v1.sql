-- Audit Trail v1 (2026-11-12) — features flowchart page 16: "Every change, before and after, cannot be edited."
-- The database itself records every insert / update / delete on the office tables, with the old and new
-- values, so no screen of the app can forget to log a change. Adds only.
create table if not exists public.audit_changes (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_key text not null,
  action text not null check (action in ('insert','update','delete')),
  before jsonb,
  after jsonb,
  changed_at timestamptz not null default now()
);
create index if not exists audit_changes_time_idx on public.audit_changes(changed_at desc, id desc);
create index if not exists audit_changes_table_idx on public.audit_changes(table_name, id desc);
create index if not exists audit_changes_key_idx on public.audit_changes(row_key);

create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_j jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  k text;
  key_col text := tg_argv[0];
begin
  -- nothing really changed (e.g. a save with the same values): do not log noise
  if tg_op = 'UPDATE' and (old_j - 'updated_at') = (new_j - 'updated_at') then
    return new;
  end if;
  k := coalesce(new_j ->> key_col, old_j ->> key_col, coalesce(new_j, old_j) ->> 'id');
  insert into public.audit_changes(table_name, row_key, action, before, after)
  values (tg_table_name, coalesce(k, ''), lower(tg_op), old_j, new_j);
  return coalesce(new, old);
end $$;

do $$
declare t record;
begin
  for t in select * from (values
    ('students', 'student_number'),
    ('discipline_cases', 'case_code'),
    ('parent_appointments', 'appointment_code'),
    ('follow_up_tasks', 'task_code'),
    ('student_concerns', 'referral_code'),
    ('portal_accounts', 'id'),
    ('counselor_referrals', 'student_number'),
    ('app_settings', 'key'),
    ('confiscated_ids', 'hold_code'),
    ('contact_logs', 'id'),
    ('shs_sections', 'section_code')
  ) as v(tbl, keycol)
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t.tbl);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I
                    for each row execute function public.audit_row_change(%2$L)', t.tbl, t.keycol);
  end loop;
end $$;

-- read-only for the app: nobody with the app key can change or delete history
grant select on public.audit_changes to anon, authenticated;
revoke insert, update, delete, truncate on public.audit_changes from anon, authenticated;
alter table public.audit_changes disable row level security;
notify pgrst, 'reload schema';
