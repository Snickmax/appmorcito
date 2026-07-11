-- Citas: presupuesto aproximado (CLP) y link de referencia.
-- Rollback: supabase/rollbacks/20260711120000_date_spot_budget_link_down.sql

alter table public.date_spots
  add column budget_amount numeric
    check (budget_amount is null or budget_amount >= 0),
  add column reference_url text
    check (reference_url is null or char_length(reference_url) <= 2048);
