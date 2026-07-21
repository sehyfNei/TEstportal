-- TSP-191 subject-aware tutoring: a chat session can optionally be scoped to
-- a topic, mirroring exam_id's exact shape, so a conversation can route to
-- that topic's active expert persona (TSP-190) with topic-scoped context.
-- Rollback:
--   alter table public.chat_sessions drop column if exists topic_id;

alter table public.chat_sessions
  add column if not exists topic_id uuid references public.topics(id) on delete set null;
