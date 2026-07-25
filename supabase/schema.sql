-- MedLingo demo schema.
-- Run this in the Supabase dashboard SQL editor (https://supabase.com/dashboard
-- -> your project -> SQL Editor). Tables created here have RLS disabled by
-- default, which is fine for this anon-key demo — do not use in production.

create table if not exists appointment_slots (
  id text primary key,
  surgery text not null,
  address text,
  slot_date text,
  slot_time text,
  is_booked boolean not null default false
);

create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null,
  slot_id text not null references appointment_slots (id),
  created_at timestamptz not null default now()
);

-- Seed the demo slot used by the chat's booking card and the /booking page.
-- Re-running this resets the slot to "free" so the demo can be repeated.
insert into appointment_slots (id, surgery, address, slot_date, slot_time, is_booked)
values (
  'demo-slot-1',
  'Riverside Medical Practice',
  '42 Riverside Road, London, E1 4QT',
  'Monday, 3 August 2026',
  '10:30 AM',
  false
)
on conflict (id) do update set is_booked = false;
