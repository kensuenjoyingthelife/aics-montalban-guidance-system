-- Settings v1 (2026-11-12) — features flowchart page 17 (PIN-protected). Adds / updates; deletes nothing.
-- Defaults are exactly what the app does today, so nothing changes until the office edits them.

-- 1) one-row settings (key → JSON)
insert into public.app_settings(key, value) values
  ('office_hours', '{"days":["Mon","Tue","Wed","Thu","Fri"],"start":"08:00","end":"16:00","lunchStart":"11:45","lunchEnd":"13:00","slotMinutes":45}'),
  ('case_rules', '{"escalateAfterMinors":2,"overdueDays":14}'),
  ('security', '{"autoSignOutMinutes":15,"pinMaxTries":5,"pinLockMinutes":5}'),
  ('sms_templates', '{"notice":"AICS Guidance Office: Magandang araw po. Inaanyayahan po kayo sa pag-uusap tungkol kay {student} sa {when}. Salamat po.","reminder":"AICS Guidance Office: Paalala po, bukas {when} ang ating pag-uusap tungkol kay {student}. Salamat po.","reschedule":"AICS Guidance Office: Inilipat po sa {when} ang ating pag-uusap tungkol kay {student}. Salamat po."}'),
  ('retention', '{"idImageDays":30}')
on conflict (key) do nothing;

-- the 6-digit PIN is stored only as a salted SHA-256 hash (default 123456 = today's PIN)
insert into public.app_settings(key, value)
select 'app_pin', jsonb_build_object('salt', s, 'hash', encode(extensions.digest(s || '123456', 'sha256'), 'hex'))
from (select encode(extensions.gen_random_bytes(12), 'hex') s) x
on conflict (key) do nothing;

-- 2) days the school is closed (holidays, no-class days): Smart Scheduling skips them
create table if not exists public.school_closed_days (
  id bigint generated always as identity primary key,
  day date not null unique,
  reason text not null check (length(reason) between 2 and 120),
  created_at timestamptz not null default now()
);

-- 3) other people's schedules (e.g. Principal, Discipline Officer) — when they are in school
create table if not exists public.people_schedules (
  id bigint generated always as identity primary key,
  role text not null check (length(role) between 2 and 60),
  name text not null check (length(name) between 2 and 80),
  days text[] not null default '{}',
  start_time text not null default '08:00',
  end_time text not null default '17:00',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) offenses (handbook rules) — edited by the office; "removed" = hidden, so old cases keep their name
alter table public.offense_policies
  add column if not exists classification text,
  add column if not exists sanction_1st_tl text,
  add column if not exists sanction_2nd_tl text,
  add column if not exists sanction_3rd_tl text,
  add column if not exists is_active boolean not null default true,
  add column if not exists sort_order int not null default 0;
insert into public.offense_policies(policy_code, title_en, title_tl, category, classification, sanction_1st, sanction_1st_tl, sanction_2nd, sanction_2nd_tl, sanction_3rd, sanction_3rd_tl, is_active, sort_order) values
 ('MIN-01','Habitual Tardiness & Late Gate Arrival','Madalas na Pagkahuli sa Klase at Gate','Minor','Minor','Verbal Reminder & Case Log Entry','Verbal Reminder at Tala sa Rekord','If the last offense was also minor: Serious offense + Parent Conference & Counseling','Kung minor din ang huli: Serious offense + Conference sa Magulang at Counseling','Serious offense + Mandatory Parent Conference','Serious offense + Mandatory Parent Conference',true,1),
 ('MIN-02','Improper Uniform / Dress Code & Haircut Violation','Paglabag sa Tamang Uniporme at Gupit','Minor','Minor','Temporary Gate Pass & Written Warning','Temporary Gate Pass at Written Warning','If the last offense was also minor: Serious offense + ID Hold + Parent Conference','Kung minor din ang huli: Serious offense + ID Hold + Conference sa Magulang','Serious offense + Parent Conference','Serious offense + Conference sa Magulang',true,2),
 ('MIN-03','Non-Wearing or Improper Use of School ID','Hindi Pagsusuot o Maling Paggamit ng School ID','Minor','Minor','24-Hour ID Hold at Guidance Office','24-Oras na ID Hold sa Guidance Office','If the last offense was also minor: Serious offense + Parent Conference','Kung minor din ang huli: Serious offense + Conference sa Magulang','Serious offense + Mandatory Parent Conference','Serious offense + Mandatory Parent Conference',true,3),
 ('LSR-01','Cutting Classes & Unauthorized Lab Absence','Pag-cutting Classes at Hindi Pagpasok sa Lab','Major','Less Serious','Parent Conference + Written Warning','Conference sa Magulang + Nakasulat na Babala','Behavioral Contract (Kasunduan) + Parent Conference','Kasunduan + Conference sa Magulang','Suspension Warning & Disciplinary Hearing','Babala sa Suspension at Disciplinary Hearing',true,4),
 ('SER-01','Classroom Disruption & Disrespect to Faculty','Kaguluhan sa Klase at Kawalan ng Galang sa Guro','Major','Serious','Mandatory Parent Conference + Written Apology & Kasunduan','Mandatory Parent Conference + Written Apology at Kasunduan','3-Day Preventive Suspension + Counseling Program','3-Araw na Suspension + Counseling Program','Disciplinary Board Evaluation','Disciplinary Board Evaluation',true,5),
 ('GRV-01','Tampering with School Records / Forging Parent Signature','Pamemeke ng Pirma ng Magulang o School Records','Major','Grave','Immediate Parent Summons + Behavioral Contract','Agarang Patawag sa Magulang + Kasunduan','Disciplinary Board Hearing & Suspension','Disciplinary Board Hearing at Suspension','Non-Readmission / Transfer Recommendation','Non-Readmission / Rekomendasyon sa Paglipat',true,6)
on conflict (policy_code) do update set
  title_en = excluded.title_en, title_tl = excluded.title_tl, category = excluded.category, classification = excluded.classification,
  sanction_1st = excluded.sanction_1st, sanction_1st_tl = excluded.sanction_1st_tl, sanction_2nd = excluded.sanction_2nd,
  sanction_2nd_tl = excluded.sanction_2nd_tl, sanction_3rd = excluded.sanction_3rd, sanction_3rd_tl = excluded.sanction_3rd_tl,
  is_active = true, sort_order = excluded.sort_order;
-- old sample rows that are not in the handbook any more: hide them (kept for history)
update public.offense_policies set is_active = false where policy_code in ('MAJ-01','MAJ-02');
update public.offense_policies set classification = coalesce(classification, case when category = 'Minor' then 'Minor' else 'Serious' end);

-- 5) staff accounts (who can sign in with email OTP); "removed" = turned off, never deleted
grant select, insert, update on public.guidance_staff to anon, authenticated;

grant select, insert, update, delete on public.school_closed_days to anon, authenticated;
grant select, insert, update, delete on public.people_schedules to anon, authenticated;
grant select, insert, update on public.offense_policies to anon, authenticated;
alter table public.school_closed_days disable row level security;
alter table public.people_schedules disable row level security;

-- every settings change is in the Audit Trail
do $$
declare t record;
begin
  for t in select * from (values ('school_closed_days','day'),('people_schedules','name'),('offense_policies','policy_code'),('guidance_staff','email')) as v(tbl, keycol)
  loop
    execute format('drop trigger if exists audit_%1$s on public.%1$I', t.tbl);
    execute format('create trigger audit_%1$s after insert or update or delete on public.%1$I
                    for each row execute function public.audit_row_change(%2$L)', t.tbl, t.keycol);
  end loop;
end $$;
notify pgrst, 'reload schema';
