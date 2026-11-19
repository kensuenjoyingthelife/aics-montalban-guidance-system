-- Security (2026-11-19): a turned-off account is only reported AFTER the password is correct.
-- Before: "deactivated" (and its reason) was returned before the password check, so anyone could type
-- a Student ID with any password and read why that account was turned off.
-- "No account" and "wrong password" stay separate (chosen by the user).
-- Safe to run more than once. No data is changed.

create or replace function public.portal_login(p_number text, p_hash text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare a portal_accounts;
begin
  select * into a from portal_accounts where student_number = trim(p_number) limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_account');
  end if;
  if a.password_hash is not null and a.password_hash <> p_hash then
    return jsonb_build_object('ok', false, 'error', 'wrong_password');
  end if;
  if a.status = 'Deactivated' then
    return jsonb_build_object('ok', false, 'error', 'deactivated', 'reason', a.deactivated_reason);
  end if;
  return jsonb_build_object(
    'ok', true,
    'account', to_jsonb(a) - 'password_hash' - 'otp_code' - 'otp_expires_at' - 'quick_pin_hash',
    'has_pin', a.quick_pin_hash is not null
  );
end $$;

notify pgrst, 'reload schema';
