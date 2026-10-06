-- Run this once in the Supabase SQL Editor, after migration_002_bcaol.sql.

-- The catalog groups courses under "BCAOL" (programme_code), but the actual
-- query parameter IGNOU's grade card site needs can differ per student:
-- "BCA" (on-campus/offline) and "BCAOL" (online) are different enrolment
-- types in IGNOU's own system, even though - for this course family - they
-- share an identical course scheme. gradecard_prog lets a student's real
-- enrolment type be queried correctly while still reusing the BCAOL catalog
-- for course shells. Defaults to programme_code when not set, since for any
-- new genuine BCAOL signup the two are simply the same value.
alter table public.profile add column if not exists gradecard_prog text;

-- Backfill: any profile created before this feature existed has no
-- programme_code at all yet. Every real account on this platform today is
-- this course family, so BCAOL is a safe default for existing rows.
update public.profile set programme_code = 'BCAOL' where programme_code is null;

-- This specific account (the original seeded student) is actually enrolled
-- under IGNOU's plain "BCA" (offline) programme code, not "BCAOL" - confirmed
-- against their real grade card. Without this, syncing would run against the
-- wrong prog= value and find no record at all.
update public.profile set gradecard_prog = 'BCA' where enrolment_number = '0000000000';
