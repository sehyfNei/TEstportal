-- Rollback for 202606030003_llm_cost_ledger.sql
drop index if exists public.llm_cost_ledger_daily_cost;
drop index if exists public.llm_cost_ledger_feature_created;
drop index if exists public.llm_cost_ledger_user_created;
drop table if exists public.llm_cost_ledger;
