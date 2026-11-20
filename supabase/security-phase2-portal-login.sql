-- PHASE 2 (Cloudflare): only the server may run the student login.
-- The website/APK now sign in through the aics-mailer Edge Function (type "portal-login"),
-- which checks Cloudflare Turnstile first and then calls portal_login with the service role.
-- After this, calling portal_login directly with the public (anon) key fails.
-- Old APKs that still call portal_login directly will show "Could not connect" -> students must update the APK.

revoke execute on function public.portal_login(text, text) from public;
revoke execute on function public.portal_login(text, text) from anon;
revoke execute on function public.portal_login(text, text) from authenticated;
grant execute on function public.portal_login(text, text) to service_role;

notify pgrst, 'reload schema';

-- UNDO (if students cannot sign in):
-- grant execute on function public.portal_login(text, text) to anon, authenticated;
-- notify pgrst, 'reload schema';
