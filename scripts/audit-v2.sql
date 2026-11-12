-- Audit Trail v2 (2026-11-12): record WHO made each change (the signed-in staff email that the app
-- sends in the x-aics-actor header). Changes made outside the app show as "System". Adds only.
alter table public.audit_changes add column if not exists actor text;

create or replace function public.audit_row_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  old_j jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end;
  new_j jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) else null end;
  k text;
  key_col text := tg_argv[0];
  who text;
begin
  if tg_op = 'UPDATE' and (old_j - 'updated_at') = (new_j - 'updated_at') then
    return new;
  end if;
  begin
    who := nullif(left(current_setting('request.headers', true)::json ->> 'x-aics-actor', 120), '');
  exception when others then
    who := null;
  end;
  k := coalesce(new_j ->> key_col, old_j ->> key_col, coalesce(new_j, old_j) ->> 'id');
  insert into public.audit_changes(table_name, row_key, action, before, after, actor)
  values (tg_table_name, coalesce(k, ''), lower(tg_op), old_j, new_j, who);
  return coalesce(new, old);
end $$;
notify pgrst, 'reload schema';
