-- Categorías de citas (ej: "Japón", "Restaurantes") para planificar viajes y
-- filtrar el catálogo/mapa. Una cita puede tener varias categorías (M:N).
-- Rollback: supabase/rollbacks/20260611100001_date_categories_down.sql

create table public.date_categories (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 40),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index date_categories_couple_name_key
  on public.date_categories (couple_id, lower(btrim(name)));

create table public.date_spot_categories (
  spot_id     uuid not null references public.date_spots (id) on delete cascade,
  category_id uuid not null references public.date_categories (id) on delete cascade,
  couple_id   uuid not null references public.couples (id) on delete cascade,
  created_by  uuid not null references public.profiles (id),
  created_at  timestamptz not null default now(),
  primary key (spot_id, category_id)
);

create index date_spot_categories_category_idx
  on public.date_spot_categories (category_id);
create index date_spot_categories_couple_idx
  on public.date_spot_categories (couple_id);

alter table public.date_categories enable row level security;
alter table public.date_spot_categories enable row level security;

create policy date_categories_select on public.date_categories
for select using (is_couple_member(couple_id));

create policy date_categories_insert on public.date_categories
for insert with check (
  created_by = auth.uid()
  and is_couple_member(couple_id)
);

create policy date_categories_update on public.date_categories
for update using (is_couple_member(couple_id))
with check (is_couple_member(couple_id));

create policy date_categories_delete on public.date_categories
for delete using (is_couple_member(couple_id));

create policy date_spot_categories_select on public.date_spot_categories
for select using (is_couple_member(couple_id));

create policy date_spot_categories_insert on public.date_spot_categories
for insert with check (
  created_by = auth.uid()
  and is_couple_member(couple_id)
);

create policy date_spot_categories_delete on public.date_spot_categories
for delete using (is_couple_member(couple_id));
