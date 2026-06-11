-- Auditoría de wishlist para estadísticas futuras: owner_user_id dice de quién
-- es la lista, pero faltaba quién creó cada deseo y quién/cuándo lo compró.
-- Rollback: supabase/rollbacks/20260611150000_wishlist_audit_down.sql

alter table public.wishlist_items
  add column created_by uuid references public.profiles (id),
  add column purchased_by uuid references public.profiles (id),
  add column purchased_at timestamptz;

-- Backfill aproximado para filas históricas: se asume que el dueño de la
-- lista creó sus propios deseos (no hay mejor dato disponible).
update public.wishlist_items
   set created_by = owner_user_id
 where created_by is null;
