-- Students v2 (2026-11-12): manual add/edit is back (Guidance Office request), plus
-- "not enrolled anymore" (graduated / transferred / stopped) and a one-click "Move up a school year".
-- Adds only. Cases and history of a student are never touched.
alter table public.students
  add column if not exists enrolled boolean not null default true,
  add column if not exists left_reason text,
  add column if not exists left_at date;

-- each "move up" is kept so it can be undone exactly
create table if not exists public.school_year_moves (
  id bigint generated always as identity primary key,
  moved_at timestamptz not null default now(),
  promoted text[] not null default '{}',   -- Grade 11 → Grade 12
  graduated text[] not null default '{}',  -- Grade 12 → not enrolled (Graduated)
  undone_at timestamptz
);
grant select on public.school_year_moves to anon, authenticated;

create or replace function public.move_up_school_year() returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  grad text[];
  prom text[];
  move_id bigint;
begin
  select coalesce(array_agg(student_number), '{}') into grad from students where enrolled and grade_section like 'Grade 12%';
  select coalesce(array_agg(student_number), '{}') into prom from students where enrolled and grade_section like 'Grade 11%';
  update students set enrolled = false, left_reason = 'Graduated', left_at = current_date where student_number = any(grad);
  update students set grade_section = regexp_replace(grade_section, '^Grade 11', 'Grade 12') where student_number = any(prom);
  insert into school_year_moves(promoted, graduated) values (prom, grad) returning id into move_id;
  return jsonb_build_object('id', move_id, 'promoted', coalesce(array_length(prom, 1), 0), 'graduated', coalesce(array_length(grad, 1), 0));
end $$;

create or replace function public.undo_school_year_move(p_id bigint) returns jsonb
language plpgsql security definer set search_path = public as $$
declare m record;
begin
  select * into m from school_year_moves where id = p_id and undone_at is null;
  if not found then
    return jsonb_build_object('ok', false);
  end if;
  update students set grade_section = regexp_replace(grade_section, '^Grade 12', 'Grade 11') where student_number = any(m.promoted);
  update students set enrolled = true, left_reason = null, left_at = null where student_number = any(m.graduated) and left_reason = 'Graduated';
  update school_year_moves set undone_at = now() where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

grant execute on function public.move_up_school_year() to anon, authenticated;
grant execute on function public.undo_school_year_move(bigint) to anon, authenticated;
notify pgrst, 'reload schema';

-- extra student information the office adds in Settings › Student fields (e.g. Adviser, Address)
alter table public.students add column if not exists extra jsonb not null default '{}'::jsonb;
insert into public.app_settings(key, value) values ('student_fields', '{"labels":{},"showEmail":true,"showRelationship":true,"custom":[]}'::jsonb)
  on conflict (key) do nothing;
notify pgrst, 'reload schema';
