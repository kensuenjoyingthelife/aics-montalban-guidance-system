-- Case evidence v1 (2026-11-12): photos / PDFs attached to a case. PRIVATE bucket — files are opened
-- only through short-lived signed links. "Remove" hides a file; the file itself is kept for the record.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('case-evidence', 'case-evidence', false, 10485760, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "case evidence upload" on storage.objects;
create policy "case evidence upload" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'case-evidence');
drop policy if exists "case evidence read" on storage.objects;
create policy "case evidence read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'case-evidence');
-- no update / delete policy: evidence files cannot be changed or removed from the app

create table if not exists public.case_evidence (
  id bigint generated always as identity primary key,
  case_code text not null,
  path text not null unique,
  file_name text not null,
  mime text not null,
  size_bytes bigint not null,
  note text,
  uploaded_by text,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists case_evidence_case_idx on public.case_evidence(case_code, id desc);
grant select, insert on public.case_evidence to anon, authenticated;
grant update (hidden) on public.case_evidence to anon, authenticated;
revoke delete, truncate on public.case_evidence from anon, authenticated;
alter table public.case_evidence disable row level security;

drop trigger if exists audit_case_evidence on public.case_evidence;
create trigger audit_case_evidence after insert or update or delete on public.case_evidence
  for each row execute function public.audit_row_change('case_code');
notify pgrst, 'reload schema';
