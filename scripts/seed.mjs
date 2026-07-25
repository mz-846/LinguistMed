// Re-seeds the Supabase demo data from supabase/seed.sql over the REST API.
// The tables must already exist (run supabase/seed.sql or schema.sql once in
// the dashboard SQL editor first — REST cannot create tables).
//
// Usage: node --env-file=.env.local scripts/seed.mjs
import { readFile } from 'fs/promises'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!url || !anonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY.')
  console.error('Run with: node --env-file=.env.local scripts/seed.mjs')
  process.exit(1)
}

const sql = await readFile(new URL('../supabase/seed.sql', import.meta.url), 'utf8')

// Rows in seed.sql look like:
//   ('id', 'surgery', 'address', 'date', 'time', false),
const rowPattern =
  /\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(true|false)\s*\)/g

const rows = []
for (const match of sql.matchAll(rowPattern)) {
  rows.push({
    id: match[1],
    surgery: match[2],
    address: match[3],
    slot_date: match[4],
    slot_time: match[5],
    is_booked: match[6] === 'true',
  })
}

if (rows.length === 0) {
  console.error('No rows parsed from supabase/seed.sql — has its format changed?')
  process.exit(1)
}

const supabase = createClient(url, anonKey)

const { error } = await supabase.from('appointment_slots').upsert(rows)
if (error) {
  console.error('Upsert failed:', error.message)
  if (error.code === '42501') {
    console.error(
      'Row-level security is blocking the anon key. Disable RLS on appointment_slots ' +
        'and bookings (demo only), or run seed.sql in the dashboard SQL editor instead.',
    )
  }
  process.exit(1)
}

const { data, error: readError } = await supabase
  .from('appointment_slots')
  .select('surgery, is_booked')
if (readError) {
  console.error('Count check failed:', readError.message)
  process.exit(1)
}

const booked = data.filter((row) => row.is_booked).length
const surgeries = new Set(data.map((row) => row.surgery)).size
console.log(`Seeded ${rows.length} slots.`)
console.log(
  `Table now has: ${data.length} total, ${booked} booked, ${data.length - booked} available, ${surgeries} surgeries.`,
)
