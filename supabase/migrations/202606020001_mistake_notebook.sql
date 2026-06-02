-- TSP-059: mistake notebook and retest queue schema.
-- mistake_items: one classified mistake row per question per session.
-- retest_queue: scheduler state for concept/topic retests, populated by TSP-062.

create table if not exists public.mistake_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  session_id uuid not null references public.test_sessions(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  concept_id uuid references public.concepts(id) on delete set null,
  mistake_type text not null check (mistake_type in (
    'conceptual_gap',
    'time_pressure',
    'silly_mistake',
    'not_attempted',
    'overconfidence',
    'lucky_guess',
    'bookmarked'
  )),
  confidence text check (confidence in ('sure', 'unsure', 'guessed')),
  status text not null default 'unresolved' check (status in (
    'unresolved',
    'scheduled',
    'reviewed',
    'resolved',
    'ignored'
  )),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (user_id, session_id, question_id)
);

create table if not exists public.retest_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.exams(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  concept_id uuid references public.concepts(id) on delete set null,
  due_at timestamptz not null,
  scheduler text not null default 'simple' check (scheduler in ('simple', 'sm2', 'fsrs')),
  scheduler_state jsonb,
  priority numeric not null default 0,
  status text not null default 'due' check (status in (
    'due',
    'scheduled',
    'completed',
    'snoozed',
    'cancelled'
  )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (topic_id is not null and concept_id is null) or
    (topic_id is null and concept_id is not null)
  )
);

drop trigger if exists retest_queue_set_updated_at on public.retest_queue;
create trigger retest_queue_set_updated_at
before update on public.retest_queue
for each row execute function public.set_updated_at();

create index if not exists mistake_user_status
on public.mistake_items (user_id, status);

create index if not exists mistake_user_exam
on public.mistake_items (user_id, exam_id);

create index if not exists mistake_session
on public.mistake_items (session_id);

create index if not exists retest_due
on public.retest_queue (status, due_at);

create index if not exists retest_user_exam
on public.retest_queue (user_id, exam_id, status);

alter table public.mistake_items enable row level security;
alter table public.retest_queue enable row level security;

drop policy if exists mistake_items_owner_select on public.mistake_items;
create policy mistake_items_owner_select
on public.mistake_items
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists mistake_items_owner_insert on public.mistake_items;
create policy mistake_items_owner_insert
on public.mistake_items
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists mistake_items_owner_update on public.mistake_items;
create policy mistake_items_owner_update
on public.mistake_items
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists retest_queue_owner_select on public.retest_queue;
create policy retest_queue_owner_select
on public.retest_queue
for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists retest_queue_owner_insert on public.retest_queue;
create policy retest_queue_owner_insert
on public.retest_queue
for insert
to authenticated
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists retest_queue_owner_update on public.retest_queue;
create policy retest_queue_owner_update
on public.retest_queue
for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

grant select, insert, update on public.mistake_items to authenticated;
grant select, insert, update on public.retest_queue to authenticated;
