# Builds scripts/handbook-2024-offenses.sql from the AICS Student Handbook (Revised 2024),
# "Summary of Offenses and Maximum Penalties" (page 44-45).
# Type: MO = Minor Offense, LSO = Less Serious Offense, SO = Serious Offense, GO = Grave Offense.
# The 3 penalty columns (Warning, Suspension, Dismissal) become the 1st / 2nd / 3rd offense sanctions in order.
# Non-destructive: the old offenses are set inactive (old cases keep their offense name), the handbook list is added.
import os

LEVEL = {'MO': 'Minor', 'LSO': 'Less Serious', 'SO': 'Serious', 'GO': 'Grave'}
W = 'Written warning'
# (title, type, warning, suspension, dismissal, portal word EN, portal word TL)  -- '' = no penalty in that column
ROWS = [
    ('Acts of lasciviousness', 'GO', '', '', 'X', '', ''),
    ('Allowing classmates to copy during exams', 'SO', W + ' and zero in exam', 'Suspension 3-5 days and zero in exam', 'X', '', ''),
    ('Assaulting a teacher/person in authority', 'GO', '', '', 'X', '', ''),
    ('Bringing/using of cell phone/other electronic gadgets', 'MO', W + ' and confiscation', 'Suspension 1-2 days', '', 'Phone use in class', 'Cellphone sa klase'),
    ('Bribery', 'GO', '', '', 'X', '', ''),
    ('Bullying', 'SO', W, 'Suspension 3-5 days', 'X', 'Bullying', 'Bullying'),
    ('Cheating', 'SO', W + ' and zero in exam', 'Suspension 3-5 days and zero in exam', 'X', 'Cheating', 'Pandaraya sa exam'),
    ('Class cut', 'LSO', W, 'Suspension 1-3 days', '', 'Cutting classes', 'Pag-cutting'),
    ('Conspiracy to harm', 'SO', '', 'Suspension 1-5 days', 'X', '', ''),
    ('Deliberate damage of school property (e.g. books, chairs, tables, equipment, etc.)', 'SO', W + ' and payment of the damaged item', 'Suspension 3-5 days and payment of the damaged item', 'X', 'Damage to school property', 'Pagsira ng gamit ng school'),
    ('Disregard to return report cards, important correspondence', 'MO', W, 'Suspension 1-2 days', 'X', '', ''),
    ('Disrespect of person in authority', 'SO', '', 'Suspension 3-5 days', 'X', 'Disrespect to a teacher or staff', 'Kawalang-galang sa guro o staff'),
    ('Eating/drinking/playing inside the Computer Lab/AVR/Speech Lab/Library', 'MO', W, 'Suspension 1-2 days', 'X', '', ''),
    ('Extortion', 'SO', '', 'Suspension 3-5 days', 'X', 'Asking for money or threats', 'Panghihingi ng pera o pananakot'),
    ('Forgery or misrepresentation', 'SO', '', 'Suspension 3-5 days', 'X', 'Fake signature or records', 'Pekeng pirma o records'),
    ('Gambling', 'SO', '', 'Suspension 3-5 days', 'X', 'Gambling', 'Sugal'),
    ('Hazing', 'GO', '', '', 'X', 'Hazing', 'Hazing'),
    ('Immorality', 'GO', '', '', 'X', '', ''),
    ('Improper or not wearing of ID', 'MO', W + ' and non-admittance at the gate', '', 'X', 'School ID', 'School ID'),
    ('Improper hairstyle', 'MO', W + ' and non-admittance at the gate', '', 'X', 'Hairstyle', 'Gupit o buhok'),
    ('Improper/incomplete uniform', 'MO', W + ' and non-admittance at the gate', '', 'X', 'Uniform', 'Uniporme'),
    ('Improper use of AVR facilities', 'MO', W, 'Suspension 1-2 days', 'X', '', ''),
    ('Installing programs and applications without permission', 'SO', W, 'Suspension 3-5 days', 'X', '', ''),
    ('Littering', 'LSO', W, 'Suspension 1-3 days', '', 'Littering', 'Pagkakalat'),
    ('Loitering', 'LSO', W, 'Suspension 1-3 days', '', '', ''),
    ('Lying', 'SO', W, 'Suspension 3-5 days', 'X', '', ''),
    ('Misbehavior during an in/off-campus activity', 'SO', W, 'Suspension 3-5 days', 'X', '', ''),
    ('Making unnecessary noise', 'MO', W, 'Suspension 1-2 days', '', 'Noise in class', 'Ingay sa klase'),
    ('Non-attendance in flag ceremony', 'LSO', W, 'Suspension 1-3 days', '', '', ''),
    ('Non-verbal assault', 'LSO', W, 'Suspension 1-3 days', '', '', ''),
    ('Objectionable behavior', 'SO', '', 'Suspension 3-5 days', 'X', '', ''),
    ('Organizing or joining boycotts, assemblies or gatherings that tend to disrupt classes', 'GO', '', '', 'X', '', ''),
    ('Physical assault', 'SO', '', 'Suspension 3-5 days', 'X', 'Fighting or hitting someone', 'Away o pananakit'),
    ('Planning, organizing membership or participation to any group or fraternity activity that can inflict harm', 'GO', '', '', 'X', '', ''),
    ('Plagiarism', 'SO', '', 'Suspension 3-5 days', 'X', '', ''),
    ('Providing false information to or about the school', 'SO', '', 'Suspension 3-5 days', 'X', '', ''),
    ('Possession of deadly weapons', 'GO', '', '', 'X', 'Weapons or dangerous items', 'Matalim o delikadong gamit'),
    ('Possession of explosive objects', 'GO', '', '', 'X', 'Explosives', 'Pampasabog'),
    ('Possession of pornographic materials / accessing prohibited websites', 'SO', '', 'Suspension 3-5 days', 'X', '', ''),
    ('Possession, using, giving or selling prohibited drugs', 'GO', '', '', 'X', 'Drugs', 'Droga'),
    ('Possession/drinking of alcoholic beverages', 'SO', '', 'Suspension 3-5 days', 'X', 'Alcohol', 'Alak'),
    ('Refusing to identify a student who violated a school policy', 'SO', '', 'Suspension 3-5 days', 'X', '', ''),
    # The handbook row has no type and no penalty: Serious until the Guidance Office sets it in Settings.
    ('Smoking/possession of cigarettes and/or e-cigarettes', 'SO', '', 'As decided by the Guidance Office (not set in the handbook)', '', 'Vaping or smoking', 'Vape o sigarilyo'),
]

def sanctions(w, s, d):
    seq = [x for x in [w, s, 'Dismissal' if d == 'X' else ''] if x]
    while len(seq) < 3:
        seq.append(seq[-1])
    return seq[:3]

def q(v):
    return "'" + v.replace("'", "''") + "'"

lines = [
    '-- AICS Student Handbook (Revised 2024): Summary of Offenses and Maximum Penalties',
    '-- Generated by scripts/handbook-2024-offenses.py. Non-destructive: old offenses become inactive.',
    'begin;',
    'update offense_policies set is_active = false, portal_show = false where is_active = true;',
]
count = {}
for i, (title, t, w, s, d, pe, pt) in enumerate(ROWS, start=1):
    count[t] = count.get(t, 0) + 1
    code = f'{t}-{count[t]:02d}'
    lvl = LEVEL[t]
    s1, s2, s3 = sanctions(w, s, d)
    lines.append(
        'insert into offense_policies (policy_code, title_en, title_tl, classification, category, sanction_1st, sanction_1st_tl, sanction_2nd, sanction_2nd_tl, sanction_3rd, sanction_3rd_tl, is_active, sort_order, portal_show, portal_word_en, portal_word_tl) values ('
        + ', '.join([q(code), q(title), q(title), q(lvl), q('Minor' if lvl == 'Minor' else 'Major'), q(s1), q(s1), q(s2), q(s2), q(s3), q(s3), 'true', str(i), 'true' if pe else 'false', q(pe) if pe else 'null', q(pt) if pt else 'null'])
        + ') on conflict (policy_code) do update set title_en = excluded.title_en, title_tl = excluded.title_tl, classification = excluded.classification, category = excluded.category, sanction_1st = excluded.sanction_1st, sanction_1st_tl = excluded.sanction_1st_tl, sanction_2nd = excluded.sanction_2nd, sanction_2nd_tl = excluded.sanction_2nd_tl, sanction_3rd = excluded.sanction_3rd, sanction_3rd_tl = excluded.sanction_3rd_tl, is_active = true, sort_order = excluded.sort_order, portal_show = excluded.portal_show, portal_word_en = excluded.portal_word_en, portal_word_tl = excluded.portal_word_tl;'
    )
lines += ['commit;', "notify pgrst, 'reload schema';"]
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'handbook-2024-offenses.sql')
open(out, 'w', encoding='utf8').write('\n'.join(lines) + '\n')
print('rows', len(ROWS), count)
