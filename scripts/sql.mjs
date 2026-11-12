// Run SQL on the AICS Supabase project (admin). Usage:
//   node scripts/sql.mjs "select 1"        or   node scripts/sql.mjs path/to/file.sql
// Reads SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF from .env.local (never printed).
import fs from 'node:fs';

const env = Object.fromEntries(
  fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim()])
);
const arg = process.argv[2] ?? '';
const query = fs.existsSync(arg) ? fs.readFileSync(arg, 'utf8') : arg;
if (!query) {
  console.error('Give SQL text or a .sql file.');
  process.exit(1);
}
const res = await fetch(
  `https://api.supabase.com/v1/projects/${env.SUPABASE_PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  }
);
const body = await res.text();
if (!res.ok) {
  console.error(`SQL failed (${res.status}): ${body.slice(0, 500)}`);
  process.exit(1);
}
const rows = JSON.parse(body);
if (Array.isArray(rows) && rows.length) console.table(rows);
else console.log('OK (no rows)');
