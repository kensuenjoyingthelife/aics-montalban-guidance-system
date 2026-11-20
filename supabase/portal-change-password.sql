-- Student portal: change password (Me > Change password).
-- Checks the CURRENT password first. Only the server (aics-mailer, service role) may call it,
-- so nobody can use it with the public key to guess passwords.

create or replace function public.portal_change_password(p_number text, p_old_hash text, p_new_hash text)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare a portal_accounts;
begin
  if coalesce(length(p_new_hash), 0) < 32 then
    return jsonb_build_object('ok', false, 'error', 'bad_new');
  end if;
  select * into a from portal_accounts where student_number = trim(p_number) limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_account');
  end if;
  if a.status = 'Deactivated' then
    return jsonb_build_object('ok', false, 'error', 'deactivated');
  end if;
  if a.password_hash is null or a.password_hash <> p_old_hash then
    return jsonb_build_object('ok', false, 'error', 'wrong_password');
  end if;
  update portal_accounts set password_hash = p_new_hash where id = a.id;
  return jsonb_build_object('ok', true);
end $function$;

revoke execute on function public.portal_change_password(text, text, text) from public, anon, authenticated;
grant execute on function public.portal_change_password(text, text, text) to service_role;

notify pgrst, 'reload schema';

-- UNDO:
-- drop function if exists public.portal_change_password(text, text, text);
-- notify pgrst, 'reload schema';
