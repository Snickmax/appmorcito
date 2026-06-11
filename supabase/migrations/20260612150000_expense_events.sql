-- Eventos de gastos: etiquetas reutilizables (cumpleaños, suscripciones,
-- viajes...) para agrupar gastos y analizar cuánto costó cada evento.
-- Un gasto pertenece a lo más a un evento; al borrar el evento los gastos
-- quedan sin etiqueta (SET NULL), nunca se borran.
-- Rollback: supabase/rollbacks/20260612150000_expense_events_down.sql

create table public.expense_events (
  id         uuid primary key default gen_random_uuid(),
  couple_id  uuid not null references public.couples (id) on delete cascade,
  name       text not null check (char_length(btrim(name)) between 1 and 60),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create unique index expense_events_couple_name_key
  on public.expense_events (couple_id, lower(btrim(name)));

alter table public.expenses
  add column event_id uuid references public.expense_events (id) on delete set null;

create index expenses_event_id_idx on public.expenses (event_id);

alter table public.expense_events enable row level security;

create policy expense_events_select on public.expense_events
for select using (is_couple_member(couple_id));

create policy expense_events_insert on public.expense_events
for insert with check (
  created_by = auth.uid()
  and is_couple_member(couple_id)
);

create policy expense_events_update on public.expense_events
for update using (is_couple_member(couple_id))
with check (is_couple_member(couple_id));

create policy expense_events_delete on public.expense_events
for delete using (is_couple_member(couple_id));
