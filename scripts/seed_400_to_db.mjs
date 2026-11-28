import fs from 'fs';

const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const ref = 'mfkudukapnvbmwcfhhzn';

async function updateDb() {
  const students = JSON.parse(fs.readFileSync('scripts/generated_400_students.json', 'utf8'));

  console.log('Truncating students table...');
  const delRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'TRUNCATE TABLE public.students CASCADE;'
    })
  });
  console.log('Truncate status:', delRes.status);

  console.log('Inserting 400 students in batches...');
  for (let i = 0; i < students.length; i += 50) {
    const chunk = students.slice(i, i + 50);
    const values = chunk.map(s => {
      const fn = s.full_name.replace(/'/g, "''");
      const init = s.initials.replace(/'/g, "''");
      const gs = s.grade_section.replace(/'/g, "''");
      const sc = s.section_code.replace(/'/g, "''");
      const pn = s.parent_name.replace(/'/g, "''");
      const pr = s.parent_relationship.replace(/'/g, "''");
      return `('${s.student_number}', '${fn}', '${init}', '${gs}', '${sc}', '${pn}', '${pr}', '${s.parent_phone}', '${s.parent_email}', 0, 0, 'Cleared', true)`;
    }).join(', ');

    const sql = `INSERT INTO public.students (student_number, full_name, initials, grade_section, section_code, parent_name, parent_relationship, parent_phone, parent_email, minor_offense_count, major_offense_count, clearance_status, enrolled) VALUES ${values};`;

    const insRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });
    console.log(`Batch ${i/50 + 1} inserted, status:`, insRes.status);
  }

  const countRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'SELECT count(*) FROM public.students;' })
  });
  console.log('Final count:', await countRes.json());
}

updateDb().catch(console.error);
