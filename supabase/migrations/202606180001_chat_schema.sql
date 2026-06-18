-- AI Study Companion chat schema (TSP-168).
-- Adds chat_sessions and chat_messages with owner-only RLS.
-- No RPCs: server actions in TSP-169 will use the service-role admin client.

create table if not exists public.chat_sessions (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references auth.users(id) on delete cascade,
  exam_id    uuid        references public.exams(id) on delete set null,
  title      text,
  context    jsonb       not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id              uuid        primary key default gen_random_uuid(),
  chat_session_id uuid        not null references public.chat_sessions(id) on delete cascade,
  role            text        not null check (role in ('user', 'assistant', 'system')),
  content         text        not null,
  token_count     int,
  metadata        jsonb       not null default '{}',
  created_at      timestamptz not null default now()
);

drop trigger if exists chat_sessions_set_updated_at on public.chat_sessions;
create trigger chat_sessions_set_updated_at
  before update on public.chat_sessions
  for each row execute function public.set_updated_at();

alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;

-- chat_sessions: authenticated owner only
drop policy if exists chat_sessions_owner on public.chat_sessions;
create policy chat_sessions_owner
  on public.chat_sessions for all
  to authenticated
  using  (user_id = auth.uid())
  with check (user_id = auth.uid());

-- chat_messages: authenticated owner via session FK
drop policy if exists chat_messages_owner on public.chat_messages;
create policy chat_messages_owner
  on public.chat_messages for all
  to authenticated
  using (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = chat_session_id
        and cs.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.chat_sessions cs
      where cs.id = chat_session_id
        and cs.user_id = auth.uid()
    )
  );

create index if not exists chat_sessions_user_created_idx
  on public.chat_sessions (user_id, created_at desc);

create index if not exists chat_messages_session_created_idx
  on public.chat_messages (chat_session_id, created_at);
