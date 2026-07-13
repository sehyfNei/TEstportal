-- Rollback for 202606070001_mastery_records_unique_constraints.sql
-- Reverting re-creates the original partial unique indexes. NOTE: mastery
-- upserts with onConflict FAIL against partial indexes — that failure is why
-- this migration exists. Only roll back together with the app code that
-- depended on it.
alter table public.mastery_records drop constraint if exists mastery_records_topic_unique;
alter table public.mastery_records drop constraint if exists mastery_records_concept_unique;
create unique index if not exists mastery_records_user_exam_topic_unique
  on public.mastery_records (user_id, exam_id, topic_id) where concept_id is null;
create unique index if not exists mastery_records_user_exam_concept_unique
  on public.mastery_records (user_id, exam_id, concept_id) where topic_id is null;
