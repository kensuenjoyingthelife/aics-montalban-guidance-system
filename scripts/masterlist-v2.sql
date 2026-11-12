-- Masterlist v2 (2026-11-12): a new section in the imported masterlist is added by itself,
-- instead of the whole save failing on the section foreign key. Adds only.
create or replace function public.ensure_student_section() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.section_code is not null and new.section_code <> '' then
    insert into public.shs_sections(section_code, strand_name, grade_level, adviser_name,
                                    total_students, cleared_students, clearance_percent, open_cases_count, watch_count)
    values (new.section_code, new.section_code,
            coalesce(nullif(substring(new.grade_section from '(1[12])'), '')::int, 11), '',
            0, 0, 0, 0, 0)
    on conflict (section_code) do nothing;
  end if;
  return new;
end $$;
drop trigger if exists students_ensure_section on public.students;
create trigger students_ensure_section before insert or update of section_code on public.students
  for each row execute function public.ensure_student_section();
