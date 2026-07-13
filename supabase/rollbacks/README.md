# Migration rollback scripts (TSP-141)

One `<migration>_down.sql` per file in `supabase/migrations/`, dropping that
migration's objects in reverse dependency order.

Rules (see docs/ops/MIGRATION_ROLLBACK.md for the full playbook):

1. **Roll back in reverse chronological order.** A down script assumes every
   later migration is already rolled back.
2. **Function-replacing migrations** (the `start_test_session` /
   `submit_test_session` / `update_admin_question` chains) replace definitions
   in place. Their down scripts say which earlier migration to re-apply to
   restore the previous definition — dropping alone would remove the feature.
3. **Data loss is real**: table drops destroy rows. Confirm a fresh backup
   (docs/ops/BACKUP_RESTORE.md) before any destructive rollback.
4. Scripts use `if exists` throughout, so they are safe to re-run.
5. Never rehearse on production — staging only (founder-gated on TSP-102).
