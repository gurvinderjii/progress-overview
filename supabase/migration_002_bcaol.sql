-- Run this once in the Supabase SQL Editor, after schema.sql.
-- Adds BCAOL catalog support + sync bookkeeping. Existing profile/courses
-- rows (e.g. the original hand-seeded account) are untouched.

alter table public.profile add column if not exists programme_code text;
alter table public.profile add column if not exists last_synced_at timestamptz;

-- Static, admin-maintained reference data: the official BCAOL course scheme
-- (code/title/credits/semester), transcribed from IGNOU's own "Programme
-- Guide for Bachelor of Computer Applications (Online)" and cross-checked
-- against a real student's actual grade card for semesters 1-4. Course
-- codes are stored normalized (no hyphens, no leading zeros, e.g. "BCS11"
-- not "BCS-011") to match both the Samarth "My Courses" format and what the
-- sync function produces after normalizing the grade card's own "BCS011"
-- style codes — all three of IGNOU's own systems format the same course
-- code differently.
create table if not exists public.programme_courses (
  id uuid primary key default gen_random_uuid(),
  programme_code text not null,
  code text not null,
  title text not null,
  category text not null default 'COMPULSORY',
  exam_type text not null default 'THEORY' check (exam_type in ('THEORY', 'PRACTICAL')),
  credits integer not null default 0,
  semester integer not null default 1,
  unique (programme_code, code)
);

alter table public.programme_courses enable row level security;

-- Catalog is reference data, not per-user — any signed-in student can read
-- it (there's nothing sensitive in a public course scheme), but only we
-- (via the SQL editor / service role) can maintain it.
create policy "catalog is readable by signed-in users" on public.programme_courses
  for select using (auth.role() = 'authenticated');

insert into public.programme_courses (programme_code, code, title, category, exam_type, credits, semester) values
  ('BCAOL', 'FEG2',   'Foundation Course in English-2', 'COMPULSORY', 'THEORY', 4, 1),
  ('BCAOL', 'ECO1',   'Business Organisation', 'COMPULSORY', 'THEORY', 4, 1),
  ('BCAOL', 'BCS11',  'Computer Basics and PC Software', 'COMPULSORY', 'THEORY', 3, 1),
  ('BCAOL', 'BCS12',  'Basic Mathematics', 'COMPULSORY', 'THEORY', 4, 1),
  ('BCAOL', 'BCSL13', 'Computer Basics and PC Software Lab', 'COMPULSORY', 'PRACTICAL', 2, 1),

  ('BCAOL', 'ECO2',   'Accountancy-I', 'COMPULSORY', 'THEORY', 4, 2),
  ('BCAOL', 'MCS11',  'Problem Solving and Programming', 'COMPULSORY', 'THEORY', 3, 2),
  ('BCAOL', 'MCS12',  'Computer Organisation and Assembly Language', 'COMPULSORY', 'THEORY', 4, 2),
  ('BCAOL', 'MCS13',  'Discrete Mathematics', 'COMPULSORY', 'THEORY', 2, 2),
  ('BCAOL', 'MCS15',  'Communication Skills', 'COMPULSORY', 'THEORY', 2, 2),
  ('BCAOL', 'BCSL21', 'C Language Programming Lab', 'COMPULSORY', 'PRACTICAL', 1, 2),
  ('BCAOL', 'BCSL22', 'Assembly Language Programming Lab', 'COMPULSORY', 'PRACTICAL', 1, 2),

  ('BCAOL', 'MCS14',  'Systems Analysis and Design', 'COMPULSORY', 'THEORY', 3, 3),
  ('BCAOL', 'MCS21',  'Data and File Structures', 'COMPULSORY', 'THEORY', 4, 3),
  ('BCAOL', 'MCS23',  'Introduction to Database Management Systems', 'COMPULSORY', 'THEORY', 3, 3),
  ('BCAOL', 'BCS31',  'Programming in C++', 'COMPULSORY', 'THEORY', 3, 3),
  ('BCAOL', 'BCSL32', 'C++ Programming Lab', 'COMPULSORY', 'PRACTICAL', 1, 3),
  ('BCAOL', 'BCSL33', 'Data and File Structures Lab', 'COMPULSORY', 'PRACTICAL', 1, 3),
  ('BCAOL', 'BCSL34', 'DBMS Lab', 'COMPULSORY', 'PRACTICAL', 1, 3),

  ('BCAOL', 'BCS40',  'Statistical Techniques', 'COMPULSORY', 'THEORY', 4, 4),
  ('BCAOL', 'MCS24',  'Object Oriented Technologies and Java Programming', 'COMPULSORY', 'THEORY', 3, 4),
  ('BCAOL', 'BCS41',  'Fundamental of Computer Networks', 'COMPULSORY', 'THEORY', 4, 4),
  ('BCAOL', 'BCS42',  'Introduction to Algorithms Design', 'COMPULSORY', 'THEORY', 2, 4),
  ('BCAOL', 'MCSL16', 'Internet Concepts and Web Design', 'COMPULSORY', 'PRACTICAL', 2, 4),
  ('BCAOL', 'BCSL43', 'Java Programming Lab', 'COMPULSORY', 'PRACTICAL', 1, 4),
  ('BCAOL', 'BCSL44', 'Statistical Techniques Lab', 'COMPULSORY', 'PRACTICAL', 1, 4),
  ('BCAOL', 'BCSL45', 'Analysis and Design of Algorithms Lab', 'COMPULSORY', 'PRACTICAL', 1, 4),

  ('BCAOL', 'BCS51',  'Introduction to Software Engineering', 'COMPULSORY', 'THEORY', 3, 5),
  ('BCAOL', 'BCS52',  'Network Programming and Administration', 'COMPULSORY', 'THEORY', 3, 5),
  ('BCAOL', 'BCS53',  'Web Programming', 'COMPULSORY', 'THEORY', 2, 5),
  ('BCAOL', 'BCS54',  'Computer Oriented Numerical Techniques', 'COMPULSORY', 'THEORY', 3, 5),
  ('BCAOL', 'BCS55',  'Business Communication', 'COMPULSORY', 'THEORY', 2, 5),
  ('BCAOL', 'BCSL56', 'Network Programming and Administration Lab', 'COMPULSORY', 'PRACTICAL', 1, 5),
  ('BCAOL', 'BCSL57', 'Web Programming Lab', 'COMPULSORY', 'PRACTICAL', 1, 5),
  ('BCAOL', 'BCSL58', 'Computer Oriented Numerical Techniques Lab', 'COMPULSORY', 'PRACTICAL', 1, 5),

  ('BCAOL', 'BCS62',  'E-Commerce', 'COMPULSORY', 'THEORY', 2, 6),
  ('BCAOL', 'MCS22',  'Operating System Concepts and Networking Management', 'COMPULSORY', 'THEORY', 4, 6),
  ('BCAOL', 'BCSP64', 'Project', 'COMPULSORY', 'THEORY', 8, 6)
on conflict (programme_code, code) do update set
  title = excluded.title,
  category = excluded.category,
  exam_type = excluded.exam_type,
  credits = excluded.credits,
  semester = excluded.semester;
