-- Rollback de 20260612100000_fix_expense_balance_view.sql
-- Restaura la definición original de la vista (con los signos de
-- settlements como estaban antes del fix).

create or replace view public.v_expense_balance_by_user as
select couple_id, user_id, sum(delta) as balance
from (
  select e.couple_id, e.paid_by_user_id as user_id, e.amount as delta
  from public.expenses e
  union all
  select es.couple_id, es.user_id, -es.owed_amount as delta
  from public.expense_shares es
  union all
  select s.couple_id, s.from_user_id as user_id, -s.amount as delta
  from public.expense_settlements s
  union all
  select s.couple_id, s.to_user_id as user_id, s.amount as delta
  from public.expense_settlements s
) movements
group by couple_id, user_id;
