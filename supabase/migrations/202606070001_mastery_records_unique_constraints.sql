-- Fix: replace partial unique indexes with full unique constraints so that
-- Supabase JS .upsert({ onConflict: "user_id,exam_id,topic_id" }) can resolve
-- the conflict target. PostgreSQL ON CONFLICT requires the conflict target to
-- exactly match the unique index/constraint predicate; partial indexes with
-- WHERE clauses are not matched by a bare ON CONFLICT (cols) specification.

drop index if exists public.mastery_records_user_exam_topic_unique;
drop index if exists public.mastery_records_user_exam_concept_unique;

alter table public.mastery_records
  add constraint mastery_records_topic_unique
  unique (user_id, exam_id, topic_id);

alter table public.mastery_records
  add constraint mastery_records_concept_unique
  unique (user_id, exam_id, concept_id);
