-- TSP-055 mastery records.
-- Stores user-owned topic-level and concept-level mastery rows.

create table if not exists public.mastery_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete cascade,
  concept_id uuid references public.concepts(id) on delete cascade,
  mastery_score numeric not null default 0 check (mastery_score >= 0 and mastery_score <= 100),
  confidence_level text not null default 'low' check (confidence_level in ('low', 'medium', 'high')),
  baseline_score numeric check (baseline_score is null or (baseline_score >= 0 and baseline_score <= 100)),
  stability_factor numeric not null default 1.0 check (stability_factor >= 1.0 and stability_factor <= 2.0),
  questions_attempted int not null default 0 check (questions_attempted >= 0),
  questions_correct int not null default 0 check (questions_correct >= 0),
  last_tested_at timestamptz,
  updated_at timestamptz not null default now(),
  check (
    (topic_id is not null and concept_id is null) or
    (topic_id is null and concept_id is not null)
  ),
  check (questions_correct <= questions_attempted)
);

create unique index if not exists mastery_records_user_exam_topic_unique
on public.mastery_records (user_id, exam_id, topic_id)
where topic_id is not null;

create unique index if not exists mastery_records_user_exam_concept_unique
on public.mastery_records (user_id, exam_id, concept_id)
where concept_id is not null;

create index if not exists mastery_user_exam
on public.mastery_records (user_id, exam_id);

create index if not exists mastery_topic_query
on public.mastery_records (exam_id, topic_id)
where topic_id is not null;

create index if not exists mastery_concept_query
on public.mastery_records (exam_id, concept_id)
where concept_id is not null;

create index if not exists mastery_last_tested
on public.mastery_records (last_tested_at desc)
where last_tested_at is not null;

alter table public.mastery_records enable row level security;

drop policy if exists mastery_records_owner_select on public.mastery_records;
create policy mastery_records_owner_select
on public.mastery_records
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists mastery_records_owner_insert on public.mastery_records;
create policy mastery_records_owner_insert
on public.mastery_records
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists mastery_records_owner_update on public.mastery_records;
create policy mastery_records_owner_update
on public.mastery_records
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

grant select, insert, update on public.mastery_records to authenticated;
