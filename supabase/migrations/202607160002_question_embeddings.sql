-- Semantic duplicate detection (TSP-032).
-- Stores one 384-dim sentence embedding per question (HuggingFace
-- all-MiniLM-L6-v2) and exposes an admin-only cosine-similarity search used to
-- warn about near-duplicates during bulk import. Advisory only — import is
-- never blocked. Bank is small (~200 rows) so exact search needs no ANN index.
-- Rollback:
--   drop function if exists public.find_similar_questions(uuid, vector, numeric, int);
--   drop table if exists public.question_embeddings;
--   (leave the vector extension installed — other features may adopt it)

-- pgvector is already installed in the public schema on this project.
create extension if not exists vector;

create table if not exists public.question_embeddings (
  question_id  uuid primary key references public.questions(id) on delete cascade,
  embedding    vector(384) not null,
  model        text not null,
  -- Hash of the canonicalized question text the embedding was computed from,
  -- so edited questions can be detected as stale and re-indexed.
  content_hash text not null,
  updated_at   timestamptz not null default now()
);

alter table public.question_embeddings enable row level security;

-- Admin-only read/write; students never touch embeddings.
drop policy if exists question_embeddings_admin_all on public.question_embeddings;
create policy question_embeddings_admin_all
  on public.question_embeddings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.find_similar_questions(
  p_exam_id uuid,
  p_embedding vector(384),
  p_min_similarity numeric default 0.85,
  p_limit int default 5
)
returns table (
  question_id uuid,
  similarity numeric,
  stem text,
  status text
)
language sql
security definer
set search_path = public
as $$
  -- Returns nothing for non-admins rather than raising: the is_admin() guard
  -- sits in the predicate, so no question text leaks through this function.
  select
    q.id as question_id,
    (1 - (qe.embedding <=> p_embedding))::numeric as similarity,
    coalesce(qv.content ->> 'text', '') as stem,
    q.status
  from public.question_embeddings qe
  join public.questions q on q.id = qe.question_id
  join public.question_versions qv on qv.id = q.current_version_id
  where public.is_admin()
    and q.exam_id = p_exam_id
    and q.status <> 'retired'
    and (1 - (qe.embedding <=> p_embedding)) >= coalesce(p_min_similarity, 0.85)
  order by qe.embedding <=> p_embedding
  limit greatest(1, least(coalesce(p_limit, 5), 20))
$$;

revoke all on function public.find_similar_questions(uuid, vector, numeric, int) from public;
grant execute on function public.find_similar_questions(uuid, vector, numeric, int) to authenticated;
