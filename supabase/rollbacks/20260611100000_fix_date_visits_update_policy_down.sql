-- Rollback de 20260611100000_fix_date_visits_update_policy.sql
-- El backfill de photo_path no se revierte: es una reparación de datos.

drop policy if exists date_visits_update on public.date_visits;
