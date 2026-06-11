-- Fix: faltaba la policy UPDATE en date_visits, por lo que el update de
-- photo_path tras subir la foto afectaba 0 filas sin error y las fotos
-- quedaban huérfanas en storage (visita con photo_path null).
-- Rollback: supabase/rollbacks/20260611100000_fix_date_visits_update_policy_down.sql

create policy date_visits_update on public.date_visits
for update using (is_couple_member(couple_id))
with check (is_couple_member(couple_id));

-- Reparación de datos: re-vincula las fotos ya subidas con su visita.
-- El nombre del objeto es <coupleId>/dates/<spotId>/<visitId>-<timestamp>.jpg,
-- así que basta con buscar el id de la visita como prefijo del archivo.
update public.date_visits v
   set photo_path = o.name
  from storage.objects o
 where o.bucket_id = 'couple-media'
   and v.photo_path is null
   and o.name like '%/dates/%/' || v.id::text || '-%';
