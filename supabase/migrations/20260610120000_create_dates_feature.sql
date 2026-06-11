-- Funcionalidad "Citas": lugares georeferenciados de la pareja + visitas con foto.
-- visit_count y status de date_spots se derivan de date_visits vía trigger:
-- la app nunca los escribe directamente.
-- Rollback: supabase/rollbacks/20260610120000_create_dates_feature_down.sql

create table public.date_spots (
  id           uuid primary key default gen_random_uuid(),
  couple_id    uuid not null references public.couples (id) on delete cascade,
  title        text not null check (char_length(btrim(title)) between 1 and 80),
  description  text check (description is null or char_length(description) <= 600),
  planned_date date,
  latitude     double precision not null check (latitude between -90 and 90),
  longitude    double precision not null check (longitude between -180 and 180),
  status       text not null default 'pendiente'
               check (status in ('pendiente', 'realizada')),
  visit_count  integer not null default 0 check (visit_count >= 0),
  created_by   uuid not null references public.profiles (id),
  updated_by   uuid references public.profiles (id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.date_visits (
  id         uuid primary key default gen_random_uuid(),
  spot_id    uuid not null references public.date_spots (id) on delete cascade,
  couple_id  uuid not null references public.couples (id) on delete cascade,
  visited_at date not null default current_date,
  photo_path text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index date_spots_couple_id_idx on public.date_spots (couple_id);
create index date_visits_spot_id_idx on public.date_visits (spot_id, visited_at);
create index date_visits_couple_id_idx on public.date_visits (couple_id);

create or replace function public.tg_date_spots_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger date_spots_touch_updated_at
before update on public.date_spots
for each row execute function public.tg_date_spots_touch_updated_at();

create or replace function public.tg_sync_date_spot_visit_stats()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_spot_id uuid := coalesce(new.spot_id, old.spot_id);
  v_count integer;
begin
  select count(*) into v_count
  from public.date_visits
  where spot_id = v_spot_id;

  update public.date_spots
     set visit_count = v_count,
         status = case when v_count > 0 then 'realizada' else 'pendiente' end
   where id = v_spot_id;

  return coalesce(new, old);
end;
$$;

create trigger date_visits_sync_spot_stats
after insert or delete on public.date_visits
for each row execute function public.tg_sync_date_spot_visit_stats();

-- RLS: acceso solo para miembros activos de la pareja, vía el helper existente
-- is_couple_member(couple_id) (security definer, exige left_at is null), el
-- mismo que usan wishlist_items y el bucket couple-media.
-- No hay policy ALL: INSERT va separado para exigir created_by = auth.uid()
-- y que la auditoría sea confiable.

alter table public.date_spots enable row level security;
alter table public.date_visits enable row level security;

create policy date_spots_select on public.date_spots
for select using (is_couple_member(couple_id));

create policy date_spots_insert on public.date_spots
for insert with check (
  created_by = auth.uid()
  and is_couple_member(couple_id)
);

create policy date_spots_update on public.date_spots
for update using (is_couple_member(couple_id))
with check (is_couple_member(couple_id));

create policy date_spots_delete on public.date_spots
for delete using (is_couple_member(couple_id));

create policy date_visits_select on public.date_visits
for select using (is_couple_member(couple_id));

create policy date_visits_insert on public.date_visits
for insert with check (
  created_by = auth.uid()
  and is_couple_member(couple_id)
);

create policy date_visits_delete on public.date_visits
for delete using (is_couple_member(couple_id));
