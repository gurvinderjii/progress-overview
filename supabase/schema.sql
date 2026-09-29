-- Run this once in the Supabase SQL Editor (Dashboard > SQL Editor > New query)
-- after creating your project, before first sign-in.

create table if not exists public.profile (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  enrolment_number text not null,
  program text not null,
  institution text not null,
  study_center text,
  admission_cycle text,
  delivery_mode text,
  updated_at timestamptz not null default now()
);

create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  title text not null,
  category text not null default 'COMPULSORY',
  exam_type text not null default 'THEORY' check (exam_type in ('THEORY', 'PRACTICAL')),
  credits integer not null default 0,
  semester integer not null default 1,
  cycle text,
  assignment1 integer,
  term_end_theory integer,
  term_end_practical integer,
  status text not null default 'NOT STARTED' check (status in ('COMPLETED', 'NOT COMPLETED', 'NOT STARTED')),
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (user_id, code)
);

alter table public.profile enable row level security;
alter table public.courses enable row level security;

-- Each signed-in user can only ever see/edit their own rows. Since this app
-- has exactly one user (you), this mainly guards against the anon key ever
-- being used to read someone else's data if the app grows more users later.
create policy "own profile" on public.profile
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own courses" on public.courses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
