import fs from 'fs';

const ref = 'mfkudukapnvbmwcfhhzn';
const token = process.env.SUPABASE_ACCESS_TOKEN || '';
const students = JSON.parse(fs.readFileSync('scripts/generated_400_students.json', 'utf8'));

async function updateDb() {
  console.log('Truncating students table...');
  await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'TRUNCATE TABLE public.students CASCADE;' })
  });

  console.log('Inserting 400 students in batches...');
  for (let i = 0; i < students.length; i += 50) {
    const chunk = students.slice(i, i + 50);
    const values = chunk.map(s => {
      const num = s.student_number.replace(/'/g, "''");
      const name = s.full_name.replace(/'/g, "''");
      const sec = s.grade_section.replace(/'/g, "''");
      const secCode = (s.section_code || sec.split('-')[1]?.trim() || sec).replace(/'/g, "''");
      const init = (s.initials || name.split(' ').map(w => w[0]).join('').slice(0, 5)).replace(/'/g, "''");
      const pphone = (s.parent_phone || '09932642464').replace(/'/g, "''");
      const pemail = (s.parent_email || 'khentandreitenchavez@gmail.com').replace(/'/g, "''");
      const pname = (name.split(',')[0] + ' Parent/Guardian').replace(/'/g, "''");
      const extra = JSON.stringify({ student_phone: s.contact_number || '09932642464' }).replace(/'/g, "''");
      return `('${num}', '${name}', '${init}', '${sec}', '${secCode}', '${pname}', '${pphone}', '${pemail}', true, '${extra}'::jsonb)`;
    }).join(', ');

    const sql = `INSERT INTO public.students (student_number, full_name, initials, grade_section, section_code, parent_name, parent_phone, parent_email, enrolled, extra) VALUES ${values};`;

    const insRes = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: sql })
    });
    console.log(`Batch ${i / 50 + 1} inserted with status:`, insRes.status);
    if (!insRes.ok) {
      const text = await insRes.text();
      console.error('Insert error:', text);
    }
  }
  console.log('Finished updating 400 students in database!');
}

updateDb();
