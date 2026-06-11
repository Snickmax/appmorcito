-- Rollback de 20260612150000_expense_events.sql

alter table public.expenses drop column if exists event_id;
drop table if exists public.expense_events cascade;
