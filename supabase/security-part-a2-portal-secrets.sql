-- Security Part A2 (2026-11-17): student portal secrets never leave the database.
-- Before: the portal downloaded password_hash / otp_code / quick_pin_hash and compared them in the browser,
-- and wrote its own reset code, so anyone could read codes or reset another student's password.
-- After: checks run here (security definer functions); the reset code is made + emailed by the
-- aics-mailer cloud function (service role). The public key cannot read or write the secret columns.

create or replace function public.portal_login(p_number text, p_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a portal_accounts;
begin
  select * into a from portal_accounts where student_number = trim(p_number) limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'no_account'); end if;
  if a.status = 'Deactivated' then
    return jsonb_build_object('ok', false, 'error', 'deactivated', 'reason', a.deactivated_reason);
  end if;
  if a.password_hash is not null and a.password_hash <> p_hash then
    return jsonb_build_object('ok', false, 'error', 'wrong_password');
  end if;
  return jsonb_build_object(
    'ok', true,
    'account', to_jsonb(a) - 'password_hash' - 'otp_code' - 'otp_expires_at' - 'quick_pin_hash',
    'has_pin', a.quick_pin_hash is not null
  );
end $$;

create or replace function public.portal_check_pin(p_number text, p_pin_hash text)
returns boolean language sql security definer set search_path = public as $$
  select coalesce((select quick_pin_hash = p_pin_hash from portal_accounts
                   where student_number = trim(p_number) and status is distinct from 'Deactivated' limit 1), false);
$$;

create or replace function public.portal_reset_password(p_identifier text, p_code text, p_new_hash text)
returns text language plpgsql security definer set search_path = public as $$
declare a portal_accounts;
begin
  select * into a from portal_accounts
  where student_number = trim(p_identifier) or lower(email) = lower(trim(p_identifier)) limit 1;
  if not found then return 'no_account'; end if;
  if a.otp_code is null or upper(a.otp_code) <> upper(trim(p_code)) then return 'bad_code'; end if;
  if a.otp_expires_at is not null and a.otp_expires_at < now() then return 'expired'; end if;
  update portal_accounts set password_hash = p_new_hash, otp_code = null, otp_expires_at = null where id = a.id;
  return 'ok';
end $$;

grant execute on function public.portal_login(text, text), public.portal_check_pin(text, text),
  public.portal_reset_password(text, text, text) to anon, authenticated;

-- the public key may not read or change the secret columns (sign-up may still set them once)
revoke select, update on public.portal_accounts from anon, authenticated;
grant select (id, student_number, full_name, email, status, deactivated_reason, deactivated_at, is_practice,
  created_at, contact_number, student_id_image, national_id_image) on public.portal_accounts to anon, authenticated;
grant update (full_name, email, status, deactivated_reason, deactivated_at, contact_number, student_id_image,
  national_id_image) on public.portal_accounts to anon, authenticated;
