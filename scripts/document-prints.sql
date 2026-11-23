-- Print log for official documents (reports + forms): shows "Printed" in the app and warns before reprinting.
-- Staff can read and add; nobody can edit or delete (it is a record, like the audit trail). Non-destructive.
create table if not exists public.document_prints (
  id bigserial primary key,
  doc_key text not null,          -- e.g. monthly:2026-11 · quarterly:Q4 2026 · slip:CASE-2026-104 · form:CASE-2026-104:callSlip
  doc_type text not null,         -- monthly | quarterly | slip | audit | form
  title text not null,
  printed_by text not null,
  printed_at timestamptz not null default now()
);
create index if not exists document_prints_key_idx on public.document_prints (doc_key, printed_at desc);
alter table public.document_prints enable row level security;
drop policy if exists staff_read on public.document_prints;
drop policy if exists staff_add on public.document_prints;
create policy staff_read on public.document_prints for select to authenticated using (public.is_staff());
create policy staff_add on public.document_prints for insert to authenticated with check (public.is_staff());
-- no update / delete policy on purpose
notify pgrst, 'reload schema';
