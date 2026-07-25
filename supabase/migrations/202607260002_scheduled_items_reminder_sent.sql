-- TSP-085: track whether a reminder has already been sent/attempted for a
-- scheduled item, so the nightly reminder job never re-notifies the same
-- item on every cron tick.
-- Rollback:
--   alter table public.scheduled_items drop column if exists reminder_sent_at;

alter table public.scheduled_items
  add column if not exists reminder_sent_at timestamptz;

create index if not exists scheduled_items_reminder_pending_idx
  on public.scheduled_items (scheduled_for)
  where status = 'planned' and reminder_sent_at is null;
