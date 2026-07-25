-- MedLingo — bulk demo seed data.
-- Run this in the Supabase dashboard SQL editor. Safe to re-run: every insert
-- upserts on the slot id, and re-running resets slots to their seeded
-- availability (including freeing the demo slot for repeat demos).
--
-- All surgery names and addresses are invented — none are real, currently
-- operating NHS practices.
--
-- Note: the schema stores the surgery directory inline on appointment_slots
-- (surgery + address columns). There is no separate surgeries table, no
-- languages-supported field and no appointment-type field, so those axes of
-- variety are intentionally not seeded.

-- Same table definitions as supabase/schema.sql, included so this file works
-- as a single paste on a fresh project.
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

-- The app talks to these tables with the anon key, so RLS must be off for
-- the demo (tables created via the dashboard enable it by default).
-- Do not ship this to production — use proper policies instead.
alter table appointment_slots disable row level security;
alter table bookings disable row level security;

insert into appointment_slots (id, surgery, address, slot_date, slot_time, is_booked) values
  -- Riverside Medical Practice, Whitechapel (the chat demo's surgery)
  ('demo-slot-1',            'Riverside Medical Practice', '42 Riverside Road, London, E1 4QT', 'Monday, 3 August 2026',    '10:30 AM', false),
  ('riverside-0728-0900',    'Riverside Medical Practice', '42 Riverside Road, London, E1 4QT', 'Tuesday, 28 July 2026',    '9:00 AM',  false),
  ('riverside-0730-1430',    'Riverside Medical Practice', '42 Riverside Road, London, E1 4QT', 'Thursday, 30 July 2026',   '2:30 PM',  true),
  ('riverside-0805-1115',    'Riverside Medical Practice', '42 Riverside Road, London, E1 4QT', 'Wednesday, 5 August 2026', '11:15 AM', false),
  ('riverside-0811-1545',    'Riverside Medical Practice', '42 Riverside Road, London, E1 4QT', 'Tuesday, 11 August 2026',  '3:45 PM',  false),
  ('riverside-0819-0830',    'Riverside Medical Practice', '42 Riverside Road, London, E1 4QT', 'Wednesday, 19 August 2026','8:30 AM',  false),

  -- Fieldgate Health Centre, Whitechapel
  ('fieldgate-0727-0830',    'Fieldgate Health Centre', '118 Fieldgate Lane, London, E1 1BS', 'Monday, 27 July 2026',      '8:30 AM',  false),
  ('fieldgate-0729-1400',    'Fieldgate Health Centre', '118 Fieldgate Lane, London, E1 1BS', 'Wednesday, 29 July 2026',   '2:00 PM',  false),
  ('fieldgate-0804-1000',    'Fieldgate Health Centre', '118 Fieldgate Lane, London, E1 1BS', 'Tuesday, 4 August 2026',    '10:00 AM', true),
  ('fieldgate-0807-1530',    'Fieldgate Health Centre', '118 Fieldgate Lane, London, E1 1BS', 'Friday, 7 August 2026',     '3:30 PM',  false),
  ('fieldgate-0812-0930',    'Fieldgate Health Centre', '118 Fieldgate Lane, London, E1 1BS', 'Wednesday, 12 August 2026', '9:30 AM',  false),
  ('fieldgate-0820-1345',    'Fieldgate Health Centre', '118 Fieldgate Lane, London, E1 1BS', 'Thursday, 20 August 2026',  '1:45 PM',  false),

  -- Hackney Wick Surgery, Hackney
  ('hackneywick-0728-1330',  'Hackney Wick Surgery', '7 Wallis Road, London, E9 5LH', 'Tuesday, 28 July 2026',    '1:30 PM',  false),
  ('hackneywick-0731-0900',  'Hackney Wick Surgery', '7 Wallis Road, London, E9 5LH', 'Friday, 31 July 2026',     '9:00 AM',  false),
  ('hackneywick-0805-1615',  'Hackney Wick Surgery', '7 Wallis Road, London, E9 5LH', 'Wednesday, 5 August 2026', '4:15 PM',  false),
  ('hackneywick-0810-1030',  'Hackney Wick Surgery', '7 Wallis Road, London, E9 5LH', 'Monday, 10 August 2026',   '10:30 AM', true),
  ('hackneywick-0814-0815',  'Hackney Wick Surgery', '7 Wallis Road, London, E9 5LH', 'Friday, 14 August 2026',   '8:15 AM',  false),
  ('hackneywick-0818-1500',  'Hackney Wick Surgery', '7 Wallis Road, London, E9 5LH', 'Tuesday, 18 August 2026',  '3:00 PM',  false),

  -- Bermondsey Spa Medical Centre, Bermondsey
  ('bermondsey-0727-1100',   'Bermondsey Spa Medical Centre', '24 Spa Road, London, SE16 3QU', 'Monday, 27 July 2026',     '11:00 AM', false),
  ('bermondsey-0730-0930',   'Bermondsey Spa Medical Centre', '24 Spa Road, London, SE16 3QU', 'Thursday, 30 July 2026',   '9:30 AM',  false),
  ('bermondsey-0803-1445',   'Bermondsey Spa Medical Centre', '24 Spa Road, London, SE16 3QU', 'Monday, 3 August 2026',    '2:45 PM',  false),
  ('bermondsey-0806-0845',   'Bermondsey Spa Medical Centre', '24 Spa Road, London, SE16 3QU', 'Thursday, 6 August 2026',  '8:45 AM',  true),
  ('bermondsey-0813-1615',   'Bermondsey Spa Medical Centre', '24 Spa Road, London, SE16 3QU', 'Thursday, 13 August 2026', '4:15 PM',  false),
  ('bermondsey-0821-1015',   'Bermondsey Spa Medical Centre', '24 Spa Road, London, SE16 3QU', 'Friday, 21 August 2026',   '10:15 AM', false),

  -- Peckham Rye Family Practice, Peckham
  ('peckham-0729-0845',      'Peckham Rye Family Practice', '89 Rye Lane, London, SE15 4ST', 'Wednesday, 29 July 2026',  '8:45 AM',  false),
  ('peckham-0731-1515',      'Peckham Rye Family Practice', '89 Rye Lane, London, SE15 4ST', 'Friday, 31 July 2026',     '3:15 PM',  true),
  ('peckham-0804-1130',      'Peckham Rye Family Practice', '89 Rye Lane, London, SE15 4ST', 'Tuesday, 4 August 2026',   '11:30 AM', false),
  ('peckham-0811-0900',      'Peckham Rye Family Practice', '89 Rye Lane, London, SE15 4ST', 'Tuesday, 11 August 2026',  '9:00 AM',  false),
  ('peckham-0817-1400',      'Peckham Rye Family Practice', '89 Rye Lane, London, SE15 4ST', 'Monday, 17 August 2026',   '2:00 PM',  false),
  ('peckham-0820-1045',      'Peckham Rye Family Practice', '89 Rye Lane, London, SE15 4ST', 'Thursday, 20 August 2026', '10:45 AM', false),

  -- Holloway Park Surgery, Islington
  ('holloway-0728-1030',     'Holloway Park Surgery', '156 Holloway Road, London, N7 8DD', 'Tuesday, 28 July 2026',     '10:30 AM', false),
  ('holloway-0803-0815',     'Holloway Park Surgery', '156 Holloway Road, London, N7 8DD', 'Monday, 3 August 2026',     '8:15 AM',  false),
  ('holloway-0806-1345',     'Holloway Park Surgery', '156 Holloway Road, London, N7 8DD', 'Thursday, 6 August 2026',   '1:45 PM',  false),
  ('holloway-0812-1600',     'Holloway Park Surgery', '156 Holloway Road, London, N7 8DD', 'Wednesday, 12 August 2026', '4:00 PM',  true),
  ('holloway-0818-0930',     'Holloway Park Surgery', '156 Holloway Road, London, N7 8DD', 'Tuesday, 18 August 2026',   '9:30 AM',  false),
  ('holloway-0821-1430',     'Holloway Park Surgery', '156 Holloway Road, London, N7 8DD', 'Friday, 21 August 2026',    '2:30 PM',  false),

  -- Finsbury Health Hub, Clerkenwell
  ('finsbury-0727-1445',     'Finsbury Health Hub', '33 Clerkenwell Close, London, EC1R 0AT', 'Monday, 27 July 2026',     '2:45 PM',  false),
  ('finsbury-0730-1015',     'Finsbury Health Hub', '33 Clerkenwell Close, London, EC1R 0AT', 'Thursday, 30 July 2026',   '10:15 AM', false),
  ('finsbury-0805-0830',     'Finsbury Health Hub', '33 Clerkenwell Close, London, EC1R 0AT', 'Wednesday, 5 August 2026', '8:30 AM',  true),
  ('finsbury-0810-1530',     'Finsbury Health Hub', '33 Clerkenwell Close, London, EC1R 0AT', 'Monday, 10 August 2026',   '3:30 PM',  false),
  ('finsbury-0814-1100',     'Finsbury Health Hub', '33 Clerkenwell Close, London, EC1R 0AT', 'Friday, 14 August 2026',   '11:00 AM', false),
  ('finsbury-0819-1345',     'Finsbury Health Hub', '33 Clerkenwell Close, London, EC1R 0AT', 'Wednesday, 19 August 2026','1:45 PM',  false),

  -- Tooting Broadway Medical Practice, Tooting
  ('tooting-0729-1130',      'Tooting Broadway Medical Practice', '61 Mitcham Road, London, SW17 9PB', 'Wednesday, 29 July 2026',  '11:30 AM', false),
  ('tooting-0731-1400',      'Tooting Broadway Medical Practice', '61 Mitcham Road, London, SW17 9PB', 'Friday, 31 July 2026',     '2:00 PM',  false),
  ('tooting-0804-0845',      'Tooting Broadway Medical Practice', '61 Mitcham Road, London, SW17 9PB', 'Tuesday, 4 August 2026',   '8:45 AM',  false),
  ('tooting-0807-1615',      'Tooting Broadway Medical Practice', '61 Mitcham Road, London, SW17 9PB', 'Friday, 7 August 2026',    '4:15 PM',  true),
  ('tooting-0813-0915',      'Tooting Broadway Medical Practice', '61 Mitcham Road, London, SW17 9PB', 'Thursday, 13 August 2026', '9:15 AM',  false),
  ('tooting-0817-1500',      'Tooting Broadway Medical Practice', '61 Mitcham Road, London, SW17 9PB', 'Monday, 17 August 2026',   '3:00 PM',  false),

  -- Acton Vale Surgery, Acton
  ('acton-0728-0915',        'Acton Vale Surgery', '12 The Vale, London, W3 7RQ', 'Tuesday, 28 July 2026',     '9:15 AM',  true),
  ('acton-0803-1330',        'Acton Vale Surgery', '12 The Vale, London, W3 7RQ', 'Monday, 3 August 2026',     '1:30 PM',  false),
  ('acton-0806-1045',        'Acton Vale Surgery', '12 The Vale, London, W3 7RQ', 'Thursday, 6 August 2026',   '10:45 AM', false),
  ('acton-0811-1445',        'Acton Vale Surgery', '12 The Vale, London, W3 7RQ', 'Tuesday, 11 August 2026',   '2:45 PM',  false),
  ('acton-0819-0900',        'Acton Vale Surgery', '12 The Vale, London, W3 7RQ', 'Wednesday, 19 August 2026', '9:00 AM',  false),
  ('acton-0821-1215',        'Acton Vale Surgery', '12 The Vale, London, W3 7RQ', 'Friday, 21 August 2026',    '12:15 PM', false),

  -- Harlesden Community Health Centre, Harlesden
  ('harlesden-0727-0945',    'Harlesden Community Health Centre', '204 High Street, London, NW10 4TE', 'Monday, 27 July 2026',     '9:45 AM',  false),
  ('harlesden-0730-1515',    'Harlesden Community Health Centre', '204 High Street, London, NW10 4TE', 'Thursday, 30 July 2026',   '3:15 PM',  false),
  ('harlesden-0805-1300',    'Harlesden Community Health Centre', '204 High Street, London, NW10 4TE', 'Wednesday, 5 August 2026', '1:00 PM',  false),
  ('harlesden-0812-0830',    'Harlesden Community Health Centre', '204 High Street, London, NW10 4TE', 'Wednesday, 12 August 2026','8:30 AM',  true),
  ('harlesden-0818-1130',    'Harlesden Community Health Centre', '204 High Street, London, NW10 4TE', 'Tuesday, 18 August 2026',  '11:30 AM', false),
  ('harlesden-0820-1545',    'Harlesden Community Health Centre', '204 High Street, London, NW10 4TE', 'Thursday, 20 August 2026', '3:45 PM',  false),

  -- Walthamstow Village Practice, Walthamstow
  ('walthamstow-0729-1015',  'Walthamstow Village Practice', '48 Orford Road, London, E17 9NJ', 'Wednesday, 29 July 2026',  '10:15 AM', false),
  ('walthamstow-0731-0830',  'Walthamstow Village Practice', '48 Orford Road, London, E17 9NJ', 'Friday, 31 July 2026',     '8:30 AM',  false),
  ('walthamstow-0804-1430',  'Walthamstow Village Practice', '48 Orford Road, London, E17 9NJ', 'Tuesday, 4 August 2026',   '2:30 PM',  false),
  ('walthamstow-0810-0945',  'Walthamstow Village Practice', '48 Orford Road, London, E17 9NJ', 'Monday, 10 August 2026',   '9:45 AM',  false),
  ('walthamstow-0813-1330',  'Walthamstow Village Practice', '48 Orford Road, London, E17 9NJ', 'Thursday, 13 August 2026', '1:30 PM',  true),
  ('walthamstow-0817-1100',  'Walthamstow Village Practice', '48 Orford Road, London, E17 9NJ', 'Monday, 17 August 2026',   '11:00 AM', false),

  -- Brixton Hill Group Practice, Brixton
  ('brixton-0727-1315',      'Brixton Hill Group Practice', '77 Brixton Hill, London, SW2 1QN', 'Monday, 27 July 2026',     '1:15 PM',  false),
  ('brixton-0729-0900',      'Brixton Hill Group Practice', '77 Brixton Hill, London, SW2 1QN', 'Wednesday, 29 July 2026',  '9:00 AM',  true),
  ('brixton-0806-1500',      'Brixton Hill Group Practice', '77 Brixton Hill, London, SW2 1QN', 'Thursday, 6 August 2026',  '3:00 PM',  false),
  ('brixton-0811-1030',      'Brixton Hill Group Practice', '77 Brixton Hill, London, SW2 1QN', 'Tuesday, 11 August 2026',  '10:30 AM', false),
  ('brixton-0814-1615',      'Brixton Hill Group Practice', '77 Brixton Hill, London, SW2 1QN', 'Friday, 14 August 2026',   '4:15 PM',  false),
  ('brixton-0818-0845',      'Brixton Hill Group Practice', '77 Brixton Hill, London, SW2 1QN', 'Tuesday, 18 August 2026',  '8:45 AM',  false)
on conflict (id) do update set
  surgery   = excluded.surgery,
  address   = excluded.address,
  slot_date = excluded.slot_date,
  slot_time = excluded.slot_time,
  is_booked = excluded.is_booked;

-- Summary so the SQL editor shows the result immediately.
select
  count(*)                                   as total_slots,
  count(*) filter (where is_booked)          as booked_slots,
  count(*) filter (where not is_booked)      as available_slots,
  count(distinct surgery)                    as surgeries
from appointment_slots;
