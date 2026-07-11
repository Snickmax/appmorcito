-- Reverso de 20260711120000_date_spot_budget_link.sql

alter table public.date_spots
  drop column if exists budget_amount,
  drop column if exists reference_url;
