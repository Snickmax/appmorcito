-- Rollback de 20260610120000_create_dates_feature.sql
-- Ejecutar en el SQL Editor del dashboard (o psql) y luego, si la migración
-- se aplicó con `supabase db push`, sincronizar el historial con:
--   pnpm dlx supabase migration repair --status reverted 20260610120000
--
-- NOTA: las fotos subidas a couple-media/<coupleId>/dates/ NO se borran solas;
-- si hace falta, eliminarlas desde Storage en el dashboard.

drop table if exists public.date_visits cascade;
drop table if exists public.date_spots cascade;
drop function if exists public.tg_sync_date_spot_visit_stats();
drop function if exists public.tg_date_spots_touch_updated_at();
