import { supabase } from './supabase';
import { fetchBalances } from './expensesService';

export type PerUserCount = Map<string, number>;

export type MonthlyPoint = {
  label: string;
  value: number;
};

export type StatsPeriod = 'all' | 'year' | '3m' | 'month';

export type StatsFilters = {
  period: StatsPeriod;
  // Filtra la sección de Citas por una categoría (como los pines del mapa).
  dateCategoryId: string | null;
};

export const DEFAULT_STATS_FILTERS: StatsFilters = {
  period: 'all',
  dateCategoryId: null,
};

export type CoupleStats = {
  expenses: {
    hasData: boolean;
    consumedByUser: PerUserCount;
    total: number;
    // balance > 0 = le deben; siempre global (la deuda no entiende de periodos).
    balanceByUser: PerUserCount;
    monthTotal: number;
    prevMonthTotal: number;
    // Últimos 6 meses, del más antiguo al actual (independiente del periodo).
    monthlySeries: MonthlyPoint[];
    // Reparto del gasto (del periodo) por evento.
    eventsSplit: MonthlyPoint[];
  };
  dates: {
    hasData: boolean;
    pending: number;
    done: number;
    spotsCreatedByUser: PerUserCount;
    visitsByUser: PerUserCount;
    photosByUser: PerUserCount;
  };
  memory: {
    hasData: boolean;
    sessionsByUser: PerUserCount;
    bestByUser: Map<string, { moves: number; seconds: number }>;
  };
  wishlist: {
    hasData: boolean;
    activeByOwner: PerUserCount;
    purchasedByBuyer: PerUserCount;
  };
};

function increment(map: PerUserCount, key: string | null | undefined, by = 1) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + by);
}

function monthRangeOffset(offset: number) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offset + 1, 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function periodSinceIso(period: StatsPeriod): string | null {
  const now = new Date();

  switch (period) {
    case 'month':
      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    case '3m':
      return new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
    case 'year':
      return new Date(now.getFullYear(), 0, 1).toISOString();
    default:
      return null;
  }
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

const SERIES_MONTHS = 6;

function buildMonthlySeries(
  rows: { spent_at: string; amount: number }[]
): MonthlyPoint[] {
  const now = new Date();
  const buckets: { key: string; label: string; value: number }[] = [];

  for (let offset = SERIES_MONTHS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    buckets.push({
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: MONTH_SHORT[date.getMonth()],
      value: 0,
    });
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  rows.forEach((row) => {
    const date = new Date(row.spent_at);
    const bucket = byKey.get(`${date.getFullYear()}-${date.getMonth()}`);
    if (bucket) bucket.value += Number(row.amount);
  });

  return buckets.map(({ label, value }) => ({ label, value }));
}

export async function fetchCoupleStats(
  coupleId: string,
  filters: StatsFilters = DEFAULT_STATS_FILTERS
): Promise<CoupleStats> {
  const since = periodSinceIso(filters.period);
  const currentMonth = monthRangeOffset(0);
  const prevMonth = monthRangeOffset(-1);
  const seriesStart = monthRangeOffset(-(SERIES_MONTHS - 1)).start;

  // Si hay filtro de categoría, primero se resuelven los spots de esa categoría.
  let categorySpotIds: string[] | null = null;
  if (filters.dateCategoryId) {
    const { data, error } = await supabase
      .from('date_spot_categories')
      .select('spot_id')
      .eq('category_id', filters.dateCategoryId);

    if (error) {
      throw error;
    }

    categorySpotIds = ((data ?? []) as { spot_id: string }[]).map(
      (row) => row.spot_id
    );
  }

  let periodExpensesQuery = supabase
    .from('expenses')
    .select('id, amount, spent_at, paid_by_user_id, event_id')
    .eq('couple_id', coupleId);
  if (since) periodExpensesQuery = periodExpensesQuery.gte('spent_at', since);

  let visitsQuery = supabase
    .from('date_visits')
    .select('spot_id, created_by, photo_path, visited_at')
    .eq('couple_id', coupleId);
  if (since) visitsQuery = visitsQuery.gte('visited_at', since.slice(0, 10));

  let sessionsQuery = supabase
    .from('memory_sessions')
    .select('user_id, moves, duration_seconds, completed_at')
    .eq('couple_id', coupleId);
  if (since) sessionsQuery = sessionsQuery.gte('completed_at', since);

  const [
    balances,
    monthExpenses,
    prevMonthExpenses,
    seriesExpenses,
    periodExpenses,
    eventsResult,
    spotsResult,
    visitsResult,
    sessionsResult,
    wishlistResult,
  ] = await Promise.all([
    fetchBalances(coupleId),
    supabase
      .from('expenses')
      .select('amount')
      .eq('couple_id', coupleId)
      .gte('spent_at', currentMonth.start)
      .lt('spent_at', currentMonth.end),
    supabase
      .from('expenses')
      .select('amount')
      .eq('couple_id', coupleId)
      .gte('spent_at', prevMonth.start)
      .lt('spent_at', prevMonth.end),
    supabase
      .from('expenses')
      .select('spent_at, amount')
      .eq('couple_id', coupleId)
      .gte('spent_at', seriesStart),
    periodExpensesQuery,
    supabase
      .from('expense_events')
      .select('id, name')
      .eq('couple_id', coupleId),
    supabase
      .from('date_spots')
      .select('id, status, created_by, created_at')
      .eq('couple_id', coupleId),
    visitsQuery,
    sessionsQuery,
    supabase
      .from('wishlist_items')
      .select('owner_user_id, status, purchased_by, purchased_at')
      .eq('couple_id', coupleId),
  ]);

  for (const result of [
    monthExpenses,
    prevMonthExpenses,
    seriesExpenses,
    periodExpenses,
    eventsResult,
    spotsResult,
    visitsResult,
    sessionsResult,
    wishlistResult,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  const sumAmounts = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((sum, row) => sum + Number(row.amount), 0);

  // --- Gastos del periodo: consumo por persona y reparto por evento ---
  const expenseRows = (periodExpenses.data ?? []) as {
    id: string;
    amount: number;
    event_id: string | null;
  }[];

  const consumedByUser: PerUserCount = new Map();
  if (expenseRows.length) {
    const { data: shareData, error: shareError } = await supabase
      .from('expense_shares')
      .select('expense_id, user_id, owed_amount')
      .in(
        'expense_id',
        expenseRows.map((row) => row.id)
      );

    if (shareError) {
      throw shareError;
    }

    (
      (shareData ?? []) as { user_id: string; owed_amount: number }[]
    ).forEach((share) => {
      increment(consumedByUser, share.user_id, Number(share.owed_amount));
    });
  }

  const eventNameById = new Map(
    ((eventsResult.data ?? []) as { id: string; name: string }[]).map(
      (event) => [event.id, event.name]
    )
  );

  const eventsSplitMap = new Map<string, number>();
  expenseRows.forEach((row) => {
    const label = row.event_id
      ? eventNameById.get(row.event_id) ?? 'Evento'
      : 'Sin evento';
    eventsSplitMap.set(label, (eventsSplitMap.get(label) ?? 0) + Number(row.amount));
  });

  const eventsSplit = [...eventsSplitMap.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const periodTotal = sumAmounts(expenseRows);

  // --- Citas (filtro de categoría + periodo en visitas/propuestas) ---
  const spotIdsSet = categorySpotIds ? new Set(categorySpotIds) : null;

  const spotsCreatedByUser: PerUserCount = new Map();
  let pending = 0;
  let done = 0;
  (
    (spotsResult.data ?? []) as {
      id: string;
      status: string;
      created_by: string;
      created_at: string;
    }[]
  ).forEach((spot) => {
    if (spotIdsSet && !spotIdsSet.has(spot.id)) return;

    if (spot.status === 'realizada') done += 1;
    else pending += 1;

    if (!since || spot.created_at >= since) {
      increment(spotsCreatedByUser, spot.created_by);
    }
  });

  const visitsByUser: PerUserCount = new Map();
  const photosByUser: PerUserCount = new Map();
  (
    (visitsResult.data ?? []) as {
      spot_id: string;
      created_by: string;
      photo_path: string | null;
    }[]
  ).forEach((visit) => {
    if (spotIdsSet && !spotIdsSet.has(visit.spot_id)) return;

    increment(visitsByUser, visit.created_by);
    if (visit.photo_path) increment(photosByUser, visit.created_by);
  });

  // --- Memorice ---
  const sessionsByUser: PerUserCount = new Map();
  const bestByUser = new Map<string, { moves: number; seconds: number }>();
  (
    (sessionsResult.data ?? []) as {
      user_id: string;
      moves: number;
      duration_seconds: number;
    }[]
  ).forEach((sessionRow) => {
    increment(sessionsByUser, sessionRow.user_id);

    const best = bestByUser.get(sessionRow.user_id);
    if (
      !best ||
      sessionRow.moves < best.moves ||
      (sessionRow.moves === best.moves &&
        sessionRow.duration_seconds < best.seconds)
    ) {
      bestByUser.set(sessionRow.user_id, {
        moves: sessionRow.moves,
        seconds: sessionRow.duration_seconds,
      });
    }
  });

  // --- Wishlist (comprados respetan el periodo vía purchased_at) ---
  const activeByOwner: PerUserCount = new Map();
  const purchasedByBuyer: PerUserCount = new Map();
  (
    (wishlistResult.data ?? []) as {
      owner_user_id: string;
      status: string;
      purchased_by: string | null;
      purchased_at: string | null;
    }[]
  ).forEach((item) => {
    if (item.status === 'active') increment(activeByOwner, item.owner_user_id);

    if (item.purchased_by) {
      if (since && item.purchased_at && item.purchased_at < since) return;
      increment(purchasedByBuyer, item.purchased_by);
    }
  });

  const balanceByUser: PerUserCount = new Map(
    balances.map((row) => [row.user_id, row.balance])
  );

  return {
    expenses: {
      hasData: periodTotal > 0,
      consumedByUser,
      total: periodTotal,
      balanceByUser,
      monthTotal: sumAmounts(monthExpenses.data as { amount: number }[]),
      prevMonthTotal: sumAmounts(prevMonthExpenses.data as { amount: number }[]),
      monthlySeries: buildMonthlySeries(
        (seriesExpenses.data ?? []) as { spent_at: string; amount: number }[]
      ),
      eventsSplit,
    },
    dates: {
      hasData: pending + done > 0,
      pending,
      done,
      spotsCreatedByUser,
      visitsByUser,
      photosByUser,
    },
    memory: {
      hasData: sessionsByUser.size > 0,
      sessionsByUser,
      bestByUser,
    },
    wishlist: {
      hasData: activeByOwner.size > 0 || purchasedByBuyer.size > 0,
      activeByOwner,
      purchasedByBuyer,
    },
  };
}

// Datos de ejemplo para previsualizar todos los gráficos mientras la pareja
// todavía no acumula historia real. No tocan la base de datos y no responden
// a los filtros.
export function buildMockStats(userIds: [string, string]): CoupleStats {
  const [a, b] = userIds;
  const now = new Date();

  const monthlySeries: MonthlyPoint[] = [];
  const mockTotals = [148000, 96500, 173200, 121800, 189400, 142300];
  for (let offset = SERIES_MONTHS - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    monthlySeries.push({
      label: MONTH_SHORT[date.getMonth()],
      value: mockTotals[SERIES_MONTHS - 1 - offset],
    });
  }

  return {
    expenses: {
      hasData: true,
      consumedByUser: new Map([
        [a, 389300],
        [b, 481900],
      ]),
      total: 871200,
      balanceByUser: new Map([
        [a, 23450],
        [b, -23450],
      ]),
      monthTotal: 142300,
      prevMonthTotal: 189400,
      monthlySeries,
      eventsSplit: [
        { label: 'Sin evento', value: 397200 },
        { label: 'Suscripciones', value: 186000 },
        { label: 'Viaje a Japón', value: 168000 },
        { label: 'Cumpleaños Coni', value: 120000 },
      ],
    },
    dates: {
      hasData: true,
      pending: 7,
      done: 12,
      spotsCreatedByUser: new Map([
        [a, 11],
        [b, 8],
      ]),
      visitsByUser: new Map([
        [a, 9],
        [b, 14],
      ]),
      photosByUser: new Map([
        [a, 6],
        [b, 11],
      ]),
    },
    memory: {
      hasData: true,
      sessionsByUser: new Map([
        [a, 23],
        [b, 31],
      ]),
      bestByUser: new Map([
        [a, { moves: 11, seconds: 47 }],
        [b, { moves: 9, seconds: 52 }],
      ]),
    },
    wishlist: {
      hasData: true,
      activeByOwner: new Map([
        [a, 5],
        [b, 3],
      ]),
      purchasedByBuyer: new Map([
        [a, 4],
        [b, 7],
      ]),
    },
  };
}
