-- Audit Trail v3 (2026-11-12): never keep the PIN (even hashed) in the history — record "(hidden)".
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
  -- secrets are not history: the PIN record shows only that it changed
  if tg_table_name = 'app_settings' and coalesce(new_j ->> 'key', old_j ->> 'key') = 'app_pin' then
    if old_j is not null then old_j := jsonb_set(old_j, '{value}', '"(hidden)"'); end if;
    if new_j is not null then new_j := jsonb_set(new_j, '{value}', '"(changed)"'); end if;
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

-- scrub the PIN hash from rows written before this fix
update public.audit_changes set
  before = case when before ? 'value' then jsonb_set(before, '{value}', '"(hidden)"') else before end,
  after = case when after ? 'value' then jsonb_set(after, '{value}', '"(changed)"') else after end
where table_name = 'app_settings' and row_key = 'app_pin';
notify pgrst, 'reload schema';
