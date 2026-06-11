-- Rollback de 20260611150000_wishlist_audit.sql

alter table public.wishlist_items
  drop column if exists created_by,
  drop column if exists purchased_by,
  drop column if exists purchased_at;
