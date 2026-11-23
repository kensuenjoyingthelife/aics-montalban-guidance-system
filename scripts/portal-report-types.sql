-- Student portal report types come from the handbook offenses (Settings → Offenses & rules).
-- Each offense gets a simple "student word" and a switch "Show in student portal".
-- Non-destructive: adds columns and fills them for the current 15 offenses.

alter table offense_policies add column if not exists portal_show boolean not null default false;
alter table offense_policies add column if not exists portal_word_en text;
alter table offense_policies add column if not exists portal_word_tl text;

update offense_policies set portal_show = true, portal_word_en = v.en, portal_word_tl = v.tl
from (values
  ('MIN-01', 'Always late', 'Laging late'),
  ('MIN-02', 'Uniform or dress code', 'Uniporme o gupit'),
  ('MIN-03', 'School ID', 'School ID'),
  ('MIN-04', 'Noise in class', 'Ingay sa klase'),
  ('MIN-05', 'Littering', 'Pagkakalat'),
  ('MIN-06', 'Phone use in class', 'Cellphone sa klase'),
  ('MAJ-01', 'Bullying or fighting', 'Bullying o away'),
  ('MAJ-02', 'Cyberbullying', 'Cyberbullying'),
  ('MAJ-03', 'Vaping or smoking', 'Vape o sigarilyo'),
  ('MAJ-04', 'Asking for money or threats', 'Panghihingi ng pera o pananakot'),
  ('MAJ-05', 'Weapons or dangerous items', 'Matalim o delikadong gamit'),
  ('MAJ-06', 'Damage to school property', 'Pagsira ng gamit ng school'),
  ('LSR-01', 'Cutting classes', 'Pag-cutting'),
  ('GRV-01', 'Fake signature or records', 'Pekeng pirma o records')
) as v(code, en, tl)
where offense_policies.policy_code = v.code;

-- SER-01 (Classroom Disruption & Disrespect to Faculty) stays hidden from students (portal_show = false).

notify pgrst, 'reload schema';
