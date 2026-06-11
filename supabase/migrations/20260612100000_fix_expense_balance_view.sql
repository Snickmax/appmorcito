-- Corrige los signos de los saldados en la vista de balance de gastos.
-- Convención: balance = aportado − consumido (positivo = "le deben").
--   · pagar un gasto:        +amount al pagador
--   · consumir (share):      −owed_amount a cada uno
--   · saldar (settlement):   +amount a quien ENTREGA el dinero (from),
--                            −amount a quien lo recibe (to)
-- La versión anterior tenía from/to invertidos: saldar una deuda la
-- profundizaba en vez de reducirla.
-- Rollback: supabase/rollbacks/20260612100000_fix_expense_balance_view_down.sql

create or replace view public.v_expense_balance_by_user as
select couple_id, user_id, sum(delta) as balance
from (
  select e.couple_id, e.paid_by_user_id as user_id, e.amount as delta
  from public.expenses e
  union all
  select es.couple_id, es.user_id, -es.owed_amount as delta
  from public.expense_shares es
  union all
  select s.couple_id, s.from_user_id as user_id, s.amount as delta
  from public.expense_settlements s
  union all
  select s.couple_id, s.to_user_id as user_id, -s.amount as delta
  from public.expense_settlements s
) movements
group by couple_id, user_id;
