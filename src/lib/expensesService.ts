import { supabase } from './supabase';
import {
  Expense,
  ExpenseAccumulated,
  ExpenseAnalysis,
  ExpenseAverages,
  ExpenseBalance,
  ExpenseEvent,
  ExpenseSettlement,
  ExpenseShare,
} from '../types/expenses';

const EXPENSE_COLUMNS =
  'id, couple_id, title, description, amount, currency, paid_by_user_id, split_mode, spent_at, event_id, created_by, created_at';

const EVENT_COLUMNS = 'id, couple_id, name, created_by, created_at';

const SETTLEMENT_COLUMNS =
  'id, couple_id, from_user_id, to_user_id, amount, note, settled_at, created_by, created_at';

function monthRange(year: number, month: number) {
  // month: 1-12. Rango [inicio de mes, inicio del mes siguiente).
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  return { start: start.toISOString(), end: end.toISOString() };
}

export async function fetchExpensesMonth(
  coupleId: string,
  year: number,
  month: number
): Promise<Expense[]> {
  const { start, end } = monthRange(year, month);

  const { data, error } = await supabase
    .from('expenses')
    .select(EXPENSE_COLUMNS)
    .eq('couple_id', coupleId)
    .gte('spent_at', start)
    .lt('spent_at', end)
    .order('spent_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as Omit<Expense, 'shares'>[];

  if (!rows.length) return [];

  const { data: shareData, error: shareError } = await supabase
    .from('expense_shares')
    .select('expense_id, user_id, owed_amount')
    .in(
      'expense_id',
      rows.map((row) => row.id)
    );

  if (shareError) {
    throw shareError;
  }

  const sharesByExpense = new Map<string, ExpenseShare[]>();
  ((shareData ?? []) as ExpenseShare[]).forEach((share) => {
    const list = sharesByExpense.get(share.expense_id) ?? [];
    list.push({ ...share, owed_amount: Number(share.owed_amount) });
    sharesByExpense.set(share.expense_id, list);
  });

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    shares: sharesByExpense.get(row.id) ?? [],
  }));
}

export async function fetchSettlementsMonth(
  coupleId: string,
  year: number,
  month: number
): Promise<ExpenseSettlement[]> {
  const { start, end } = monthRange(year, month);

  const { data, error } = await supabase
    .from('expense_settlements')
    .select(SETTLEMENT_COLUMNS)
    .eq('couple_id', coupleId)
    .gte('settled_at', start)
    .lt('settled_at', end)
    .order('settled_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ExpenseSettlement[]).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

export async function fetchBalances(
  coupleId: string
): Promise<ExpenseBalance[]> {
  const { data, error } = await supabase
    .from('v_expense_balance_by_user')
    .select('user_id, balance')
    .eq('couple_id', coupleId);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ExpenseBalance[]).map((row) => ({
    ...row,
    balance: Number(row.balance),
  }));
}

export async function fetchAccumulated(
  coupleId: string
): Promise<ExpenseAccumulated> {
  const [sharesResult, expensesResult] = await Promise.all([
    supabase
      .from('expense_shares')
      .select('user_id, owed_amount')
      .eq('couple_id', coupleId),
    supabase
      .from('expenses')
      .select('paid_by_user_id, amount')
      .eq('couple_id', coupleId),
  ]);

  if (sharesResult.error) {
    throw sharesResult.error;
  }

  if (expensesResult.error) {
    throw expensesResult.error;
  }

  const consumedByUser = new Map<string, number>();
  ((sharesResult.data ?? []) as { user_id: string; owed_amount: number }[]).forEach(
    (row) => {
      consumedByUser.set(
        row.user_id,
        (consumedByUser.get(row.user_id) ?? 0) + Number(row.owed_amount)
      );
    }
  );

  const paidByUser = new Map<string, number>();
  let total = 0;
  (
    (expensesResult.data ?? []) as { paid_by_user_id: string; amount: number }[]
  ).forEach((row) => {
    const amount = Number(row.amount);
    total += amount;
    paidByUser.set(
      row.paid_by_user_id,
      (paidByUser.get(row.paid_by_user_id) ?? 0) + amount
    );
  });

  return { consumedByUser, paidByUser, total };
}

export async function createExpense(params: {
  coupleId: string;
  title: string;
  amount: number;
  paidByUserId: string;
  user1: string;
  user1Owed: number;
  user2: string;
  user2Owed: number;
  spentAt: string;
  eventId?: string | null;
  description?: string | null;
}): Promise<string> {
  const { data, error } = await supabase.rpc('create_custom_expense', {
    p_couple_id: params.coupleId,
    p_title: params.title,
    p_amount: params.amount,
    p_paid_by_user_id: params.paidByUserId,
    p_user_1: params.user1,
    p_user_1_owed: params.user1Owed,
    p_user_2: params.user2,
    p_user_2_owed: params.user2Owed,
    p_spent_at: params.spentAt,
    p_description: params.description ?? null,
  });

  if (error) {
    throw error;
  }

  const expenseId = data as string;

  // El RPC no conoce los eventos (son posteriores a él): se asocia aparte.
  if (params.eventId) {
    const { error: eventError } = await supabase
      .from('expenses')
      .update({ event_id: params.eventId })
      .eq('id', expenseId);

    if (eventError) {
      throw eventError;
    }
  }

  return expenseId;
}

export async function updateExpense(params: {
  expenseId: string;
  coupleId: string;
  title: string;
  amount: number;
  paidByUserId: string;
  user1: string;
  user1Owed: number;
  user2: string;
  user2Owed: number;
  spentAt: string;
  eventId?: string | null;
}) {
  const { error } = await supabase
    .from('expenses')
    .update({
      title: params.title,
      amount: params.amount,
      paid_by_user_id: params.paidByUserId,
      spent_at: params.spentAt,
      event_id: params.eventId ?? null,
      split_mode: 'custom',
    })
    .eq('id', params.expenseId);

  if (error) {
    throw error;
  }

  // Las shares se reemplazan completas para mantener la suma = total.
  const { error: deleteError } = await supabase
    .from('expense_shares')
    .delete()
    .eq('expense_id', params.expenseId);

  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await supabase.from('expense_shares').insert([
    {
      expense_id: params.expenseId,
      couple_id: params.coupleId,
      user_id: params.user1,
      owed_amount: params.user1Owed,
    },
    {
      expense_id: params.expenseId,
      couple_id: params.coupleId,
      user_id: params.user2,
      owed_amount: params.user2Owed,
    },
  ]);

  if (insertError) {
    throw insertError;
  }
}

export async function deleteExpense(expenseId: string) {
  // expense_shares cae por ON DELETE CASCADE.
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', expenseId);

  if (error) {
    throw error;
  }
}

export async function createSettlement(params: {
  coupleId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note?: string | null;
  createdBy: string;
}): Promise<ExpenseSettlement> {
  const { data, error } = await supabase
    .from('expense_settlements')
    .insert({
      couple_id: params.coupleId,
      from_user_id: params.fromUserId,
      to_user_id: params.toUserId,
      amount: params.amount,
      note: params.note ?? null,
      created_by: params.createdBy,
    })
    .select(SETTLEMENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as ExpenseSettlement;
}

export async function deleteSettlement(settlementId: string) {
  const { error } = await supabase
    .from('expense_settlements')
    .delete()
    .eq('id', settlementId);

  if (error) {
    throw error;
  }
}

export async function fetchEvents(coupleId: string): Promise<ExpenseEvent[]> {
  const { data, error } = await supabase
    .from('expense_events')
    .select(EVENT_COLUMNS)
    .eq('couple_id', coupleId)
    .order('name', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as ExpenseEvent[];
}

export async function createEvent(params: {
  coupleId: string;
  userId: string;
  name: string;
}): Promise<ExpenseEvent> {
  const { data, error } = await supabase
    .from('expense_events')
    .insert({
      couple_id: params.coupleId,
      name: params.name,
      created_by: params.userId,
    })
    .select(EVENT_COLUMNS)
    .single();

  if (error) {
    throw error;
  }

  return data as ExpenseEvent;
}

export async function deleteEvent(eventId: string) {
  // Los gastos del evento quedan sin etiqueta (FK ON DELETE SET NULL).
  const { error } = await supabase
    .from('expense_events')
    .delete()
    .eq('id', eventId);

  if (error) {
    throw error;
  }
}

export async function fetchExpenseAverages(
  coupleId: string
): Promise<ExpenseAverages> {
  const { data, error } = await supabase
    .from('expenses')
    .select('title, amount, spent_at')
    .eq('couple_id', coupleId);

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as { title: string; amount: number; spent_at: string }[];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysElapsed = Math.max(now.getDate(), 1);

  let monthTotal = 0;
  let biggest: { title: string; amount: number } | null = null;
  const monthKeys = new Set<string>();
  let total = 0;

  rows.forEach((row) => {
    const amount = Number(row.amount);
    const date = new Date(row.spent_at);

    total += amount;
    monthKeys.add(`${date.getFullYear()}-${date.getMonth()}`);

    if (date >= monthStart) {
      monthTotal += amount;
      if (!biggest || amount > biggest.amount) {
        biggest = { title: row.title, amount };
      }
    }
  });

  const monthsWithData = monthKeys.size;

  return {
    dailyAvgThisMonth: monthTotal / daysElapsed,
    monthlyAvg: monthsWithData > 0 ? total / monthsWithData : 0,
    monthsWithData,
    biggestThisMonth: biggest,
  };
}

function ymdToBounds(fromYmd: string, toYmd: string) {
  const [fy, fm, fd] = fromYmd.split('-').map(Number);
  const [ty, tm, td] = toYmd.split('-').map(Number);
  return {
    fromIso: new Date(fy, fm - 1, fd, 0, 0, 0).toISOString(),
    toIso: new Date(ty, tm - 1, td, 23, 59, 59).toISOString(),
  };
}

// Análisis unificado de gastos por evento y/o rango de fechas: total,
// consumido/pagado por persona y la serie mensual de consumo por usuario
// (para el gráfico de dos líneas).
export async function fetchExpenseAnalysis(params: {
  coupleId: string;
  eventId?: string | null;
  fromYmd?: string | null;
  toYmd?: string | null;
}): Promise<ExpenseAnalysis> {
  let query = supabase
    .from('expenses')
    .select('id, amount, spent_at, paid_by_user_id')
    .eq('couple_id', params.coupleId);

  if (params.eventId) {
    query = query.eq('event_id', params.eventId);
  }
  if (params.fromYmd && params.toYmd) {
    const { fromIso, toIso } = ymdToBounds(params.fromYmd, params.toYmd);
    query = query.gte('spent_at', fromIso).lte('spent_at', toIso);
  }

  const { data, error } = await query.order('spent_at', { ascending: true });

  if (error) {
    throw error;
  }

  const rows = (data ?? []) as {
    id: string;
    amount: number;
    spent_at: string;
    paid_by_user_id: string;
  }[];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const paidByUser = new Map<string, number>();
  const monthKeyByExpense = new Map<string, string>();
  const monthOrder: string[] = [];
  const monthSeen = new Set<string>();
  const monthLabelByKey = new Map<string, string>();
  let total = 0;
  let eventMonth = 0;
  let eventYear = 0;

  rows.forEach((row) => {
    const amount = Number(row.amount);
    const date = new Date(row.spent_at);

    total += amount;
    if (date >= monthStart) eventMonth += amount;
    if (date >= yearStart) eventYear += amount;

    paidByUser.set(
      row.paid_by_user_id,
      (paidByUser.get(row.paid_by_user_id) ?? 0) + amount
    );

    const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
    monthKeyByExpense.set(row.id, key);
    if (!monthSeen.has(key)) {
      monthSeen.add(key);
      monthOrder.push(key);
      monthLabelByKey.set(
        key,
        `${MONTH_SHORT[date.getMonth()]} ${String(date.getFullYear()).slice(2)}`
      );
    }
  });

  const months = monthOrder.slice(-12);
  const monthIndex = new Map(months.map((key, i) => [key, i]));
  const monthLabels = months.map((key) => monthLabelByKey.get(key) ?? key);

  // Las shares se filtran por couple_id + (evento/rango) vía join embebido, en
  // vez de pasar la lista de expense_id (que sin filtro y con muchos gastos
  // puede romper la URL de PostgREST). Conservamos expense_id para mapear cada
  // share a su bucket mensual.
  let sharesQuery = supabase
    .from('expense_shares')
    .select('expense_id, user_id, owed_amount, expenses!inner(spent_at, event_id)')
    .eq('couple_id', params.coupleId);

  if (params.eventId) {
    sharesQuery = sharesQuery.eq('expenses.event_id', params.eventId);
  }
  if (params.fromYmd && params.toYmd) {
    const { fromIso, toIso } = ymdToBounds(params.fromYmd, params.toYmd);
    sharesQuery = sharesQuery
      .gte('expenses.spent_at', fromIso)
      .lte('expenses.spent_at', toIso);
  }

  const { data: shareData, error: shareError } = await sharesQuery;

  if (shareError) {
    throw shareError;
  }

  const shares = (shareData ?? []) as {
    expense_id: string;
    user_id: string;
    owed_amount: number;
  }[];
  const consumedByUser = new Map<string, number>();
  const monthlyByUser = new Map<string, number[]>();

  shares.forEach((share) => {
    const owed = Number(share.owed_amount);

    consumedByUser.set(
      share.user_id,
      (consumedByUser.get(share.user_id) ?? 0) + owed
    );

    if (!monthlyByUser.has(share.user_id)) {
      monthlyByUser.set(share.user_id, new Array(months.length).fill(0));
    }
    const key = monthKeyByExpense.get(share.expense_id);
    const idx = key != null ? monthIndex.get(key) : undefined;
    if (idx != null) {
      monthlyByUser.get(share.user_id)![idx] += owed;
    }
  });

  return {
    total,
    count: rows.length,
    paidByUser,
    consumedByUser,
    monthLabels,
    monthlyByUser,
    eventTotals: params.eventId ? { month: eventMonth, year: eventYear } : null,
  };
}

const MONTH_SHORT = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export function formatCLP(value: number) {
  const rounded = Math.round(value);
  return `$${rounded.toLocaleString('es-CL')}`;
}
