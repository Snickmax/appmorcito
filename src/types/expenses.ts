export type ExpenseShare = {
  expense_id: string;
  user_id: string;
  owed_amount: number;
};

export type Expense = {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  amount: number;
  currency: string;
  paid_by_user_id: string;
  split_mode: string;
  spent_at: string;
  event_id: string | null;
  created_by: string;
  created_at: string;
  // Enriquecido client-side desde expense_shares.
  shares: ExpenseShare[];
};

export type ExpenseEvent = {
  id: string;
  couple_id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type ExpenseAverages = {
  // Promedio diario del mes en curso (total del mes / días transcurridos).
  dailyAvgThisMonth: number;
  // Promedio mensual considerando los meses con movimientos.
  monthlyAvg: number;
  monthsWithData: number;
  biggestThisMonth: { title: string; amount: number } | null;
};

export type ExpenseRangeSummary = {
  total: number;
  count: number;
  paidByUser: Map<string, number>;
  consumedByUser: Map<string, number>;
};

export type ExpenseEventSummary = {
  total: number;
  count: number;
  monthTotal: number;
  yearTotal: number;
  consumedByUser: Map<string, number>;
  // Meses con actividad del evento (máx. 12, del más antiguo al más nuevo).
  monthlySeries: { label: string; value: number }[];
};

export type ExpenseSettlement = {
  id: string;
  couple_id: string;
  from_user_id: string;
  to_user_id: string;
  amount: number;
  note: string | null;
  settled_at: string;
  created_by: string;
  created_at: string;
};

export type ExpenseBalance = {
  user_id: string;
  balance: number;
};

export type ExpenseAccumulated = {
  // Lo que cada uno realmente consumió (suma de sus shares). Los saldados
  // NO afectan esto: solo mueven el balance.
  consumedByUser: Map<string, number>;
  // Lo que cada uno puso de su bolsillo al pagar gastos.
  paidByUser: Map<string, number>;
  total: number;
};
