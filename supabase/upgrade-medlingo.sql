-- MedLingo upgrade: translation cache + audit log.
-- Run this once in the Supabase dashboard SQL editor (safe to re-run).
--
-- Ideas ported from the teammate's medical_translator project
-- (translationCache / auditLog Drizzle tables), reimplemented for Supabase.

create table if not exists translation_cache (
  id uuid primary key default gen_random_uuid(),
  -- sha-256 of the exact source text, so lookups don't scan long text values.
  source_hash text not null,
  target_language text not null,
  source_text text not null,
  translated_text text not null,
  created_at timestamptz not null default now(),
  unique (source_hash, target_language)
);

-- Cleanup in case an earlier version of this script already created the
-- table with a confidence column (feature since removed).
alter table translation_cache drop column if exists confidence;

create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null,
  -- e.g. 'translate_speech', 'process_letter', 'book_appointment'
  action text not null,
  detail jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_log_profile_idx on audit_log (profile_id, created_at desc);

-- Demo runs on the anon key with no auth, same as the existing tables.
alter table translation_cache disable row level security;
alter table audit_log disable row level security;
