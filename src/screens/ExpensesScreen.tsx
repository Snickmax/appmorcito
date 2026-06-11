import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import {
  createEvent,
  createExpense,
  createSettlement,
  deleteEvent,
  deleteExpense,
  deleteSettlement,
  fetchAccumulated,
  fetchBalances,
  fetchEvents,
  fetchExpenseAverages,
  fetchExpensesMonth,
  fetchSettlementsMonth,
  formatCLP,
  updateExpense,
} from '../lib/expensesService';
import {
  Expense,
  ExpenseAccumulated,
  ExpenseAverages,
  ExpenseEvent,
  ExpenseSettlement,
} from '../types/expenses';
import ExpenseFormModal, {
  ExpenseFormValues,
} from '../components/expenses/ExpenseFormModal';
import SettleModal from '../components/expenses/SettleModal';
import EventAnalysisCard from '../components/expenses/EventAnalysisCard';
import RangeAnalysisCard from '../components/expenses/RangeAnalysisCard';
import ConfirmModal from '../components/ConfirmModal';

type Props = NativeStackScreenProps<RootStackParamList, 'Expenses'>;

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

type ListItem =
  | { type: 'expense'; date: string; expense: Expense }
  | { type: 'settlement'; date: string; settlement: ExpenseSettlement };

function ymdToIso(ymd: string) {
  const [year, month, day] = ymd.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0).toISOString();
}

function formatDayMonth(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

export default function ExpensesScreen({ navigation }: Props) {
  const { session, coupleState, coupleMembers } = useAuth();

  const coupleId = coupleState?.couple_id ?? null;
  const myUserId = session?.user?.id ?? null;

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settlements, setSettlements] = useState<ExpenseSettlement[]>([]);
  const [balances, setBalances] = useState<Map<string, number>>(new Map());
  const [accumulated, setAccumulated] = useState<ExpenseAccumulated | null>(
    null
  );
  const [events, setEvents] = useState<ExpenseEvent[]>([]);
  const [averages, setAverages] = useState<ExpenseAverages | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [formVisible, setFormVisible] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [settleVisible, setSettleVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<
    | { kind: 'expense'; id: string; label: string }
    | { kind: 'settlement'; id: string; label: string }
    | { kind: 'event'; id: string; label: string }
    | null
  >(null);

  const nameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    coupleMembers.forEach((member) => {
      map.set(
        member.user_id,
        member.nickname?.trim() || member.display_name?.trim() || 'miembro'
      );
    });
    return map;
  }, [coupleMembers]);

  const loadAll = useCallback(async () => {
    if (!coupleId) return;

    try {
      const [
        monthExpenses,
        monthSettlements,
        balanceRows,
        accumulatedData,
        eventRows,
        averagesData,
      ] = await Promise.all([
        fetchExpensesMonth(coupleId, year, month),
        fetchSettlementsMonth(coupleId, year, month),
        fetchBalances(coupleId),
        fetchAccumulated(coupleId),
        fetchEvents(coupleId),
        fetchExpenseAverages(coupleId),
      ]);

      setExpenses(monthExpenses);
      setSettlements(monthSettlements);
      setBalances(
        new Map(balanceRows.map((row) => [row.user_id, row.balance]))
      );
      setAccumulated(accumulatedData);
      setEvents(eventRows);
      setAverages(averagesData);
      setRefreshKey((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudieron cargar los gastos.');
    } finally {
      setIsLoading(false);
    }
  }, [coupleId, year, month]);

  useFocusEffect(
    useCallback(() => {
      void loadAll();
    }, [loadAll])
  );

  // Deuda: el de balance negativo le debe al de balance positivo.
  const debt = useMemo(() => {
    if (coupleMembers.length < 2) return null;

    const [a, b] = coupleMembers;
    const balanceA = balances.get(a.user_id) ?? 0;

    if (Math.abs(balanceA) < 1) return { settled: true as const };

    const debtor = balanceA < 0 ? a : b;
    const creditor = balanceA < 0 ? b : a;

    return {
      settled: false as const,
      debtor,
      creditor,
      amount: Math.abs(balanceA),
    };
  }, [coupleMembers, balances]);

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [
      ...expenses.map((expense) => ({
        type: 'expense' as const,
        date: expense.spent_at,
        expense,
      })),
      ...settlements.map((settlement) => ({
        type: 'settlement' as const,
        date: settlement.settled_at,
        settlement,
      })),
    ];

    return items.sort((x, y) => (x.date < y.date ? 1 : -1));
  }, [expenses, settlements]);

  const monthTotal = useMemo(
    () => expenses.reduce((sum, expense) => sum + expense.amount, 0),
    [expenses]
  );

  const eventNameById = useMemo(
    () => new Map(events.map((event) => [event.id, event.name])),
    [events]
  );

  const handleCreateEvent = async (
    name: string
  ): Promise<ExpenseEvent | null> => {
    if (!coupleId || !myUserId) return null;

    try {
      const created = await createEvent({ coupleId, userId: myUserId, name });
      setEvents((prev) =>
        [...prev, created].sort((x, y) => x.name.localeCompare(y.name))
      );
      return created;
    } catch (error) {
      console.error(error);
      Alert.alert(
        'Error',
        'No se pudo crear el evento. ¿Quizás ya existe uno con ese nombre?'
      );
      return null;
    }
  };

  const splitBadge = (expense: Expense) => {
    if (expense.shares.length !== 2 || expense.amount <= 0) return 'división';

    const pctA = Math.round(
      (expense.shares[0].owed_amount / expense.amount) * 100
    );

    if (pctA === 50) return '50/50';
    return `${pctA}/${100 - pctA}`;
  };

  const handlePrevMonth = () => {
    setIsLoading(true);
    if (month === 1) {
      setMonth(12);
      setYear((prev) => prev - 1);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setIsLoading(true);
    if (month === 12) {
      setMonth(1);
      setYear((prev) => prev + 1);
    } else {
      setMonth((prev) => prev + 1);
    }
  };

  const handleSubmitForm = async (values: ExpenseFormValues) => {
    if (!coupleId || coupleMembers.length < 2) return;

    const [a, b] = coupleMembers;

    try {
      setIsSaving(true);

      if (editingExpense) {
        await updateExpense({
          expenseId: editingExpense.id,
          coupleId,
          title: values.title,
          amount: values.amount,
          paidByUserId: values.paidByUserId,
          user1: a.user_id,
          user1Owed: values.owedByUser.get(a.user_id) ?? 0,
          user2: b.user_id,
          user2Owed: values.owedByUser.get(b.user_id) ?? 0,
          spentAt: ymdToIso(values.spentAtYmd),
          eventId: values.eventId,
        });
      } else {
        await createExpense({
          coupleId,
          title: values.title,
          amount: values.amount,
          paidByUserId: values.paidByUserId,
          user1: a.user_id,
          user1Owed: values.owedByUser.get(a.user_id) ?? 0,
          user2: b.user_id,
          user2Owed: values.owedByUser.get(b.user_id) ?? 0,
          spentAt: ymdToIso(values.spentAtYmd),
          eventId: values.eventId,
        });
      }

      setFormVisible(false);
      setEditingExpense(null);
      await loadAll();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo guardar el gasto.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettle = async (params: {
    amount: number;
    note: string | null;
  }) => {
    if (!coupleId || !myUserId || !debt || debt.settled) return;

    try {
      setIsSaving(true);

      await createSettlement({
        coupleId,
        fromUserId: debt.debtor.user_id,
        toUserId: debt.creditor.user_id,
        amount: params.amount,
        note: params.note,
        createdBy: myUserId,
      });

      setSettleVisible(false);
      await loadAll();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo registrar el saldado.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;

    const target = confirmDelete;
    setConfirmDelete(null);

    try {
      setIsSaving(true);

      if (target.kind === 'expense') {
        await deleteExpense(target.id);
      } else if (target.kind === 'settlement') {
        await deleteSettlement(target.id);
      } else {
        await deleteEvent(target.id);
      }

      await loadAll();
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo eliminar.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!coupleState) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay una pareja activa.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerBar}>
          <Pressable
            style={styles.headerBackButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
          </Pressable>

          <Text style={styles.headerTitle}>Gastos</Text>
        </View>

        <View style={styles.balanceCard}>
          {debt == null ? (
            <ActivityIndicator color="#B94E65" />
          ) : debt.settled ? (
            <View style={styles.settledRow}>
              <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
              <Text style={styles.balanceSettled}>Cuentas saldadas</Text>
            </View>
          ) : (
            <>
              <Text style={styles.balanceLabel}>Balance actual</Text>
              <Text style={styles.balanceText}>
                {nameByUserId.get(debt.debtor.user_id)} le debe{' '}
                <Text style={styles.balanceAmount}>
                  {formatCLP(debt.amount)}
                </Text>{' '}
                a {nameByUserId.get(debt.creditor.user_id)}
              </Text>

              <Pressable
                style={styles.settleButton}
                onPress={() => setSettleVisible(true)}
              >
                <Text style={styles.settleButtonText}>Saldar</Text>
              </Pressable>
            </>
          )}
        </View>

        {accumulated && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Gasto real acumulado</Text>

            <View style={styles.summaryRow}>
              {coupleMembers.map((member) => (
                <View key={member.user_id} style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>
                    {nameByUserId.get(member.user_id)}
                  </Text>
                  <Text style={styles.summaryValue}>
                    {formatCLP(accumulated.consumedByUser.get(member.user_id) ?? 0)}
                  </Text>
                </View>
              ))}

              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total pareja</Text>
                <Text style={styles.summaryValue}>
                  {formatCLP(accumulated.total)}
                </Text>
              </View>
            </View>

            {averages && averages.monthsWithData > 0 && (
              <View style={styles.summaryRowSecond}>
                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Promedio diario (mes)</Text>
                  <Text style={styles.summaryValue}>
                    {formatCLP(averages.dailyAvgThisMonth)}
                  </Text>
                </View>

                <View style={styles.summaryBox}>
                  <Text style={styles.summaryLabel}>Promedio mensual</Text>
                  <Text style={styles.summaryValue}>
                    {formatCLP(averages.monthlyAvg)}
                  </Text>
                </View>

                {averages.biggestThisMonth && (
                  <View style={styles.summaryBox}>
                    <Text style={styles.summaryLabel} numberOfLines={1}>
                      Mayor del mes
                    </Text>
                    <Text style={styles.summaryValue} numberOfLines={1}>
                      {averages.biggestThisMonth.title}
                    </Text>
                    <Text style={styles.summarySubValue}>
                      {formatCLP(averages.biggestThisMonth.amount)}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        <View style={styles.monthCard}>
          <View style={styles.monthRow}>
            <Pressable style={styles.monthArrow} onPress={handlePrevMonth}>
              <Ionicons name="chevron-back" size={20} color="#7C3043" />
            </Pressable>

            <Text style={styles.monthTitle}>
              {MONTH_NAMES[month - 1]} {year}
            </Text>

            <Pressable style={styles.monthArrow} onPress={handleNextMonth}>
              <Ionicons name="chevron-forward" size={20} color="#7C3043" />
            </Pressable>
          </View>

          <Text style={styles.monthTotal}>
            Total del mes: {formatCLP(monthTotal)}
          </Text>

          <Pressable
            style={styles.addButton}
            onPress={() => {
              setEditingExpense(null);
              setFormVisible(true);
            }}
          >
            <Text style={styles.addButtonText}>+ Nuevo gasto</Text>
          </Pressable>

          {isLoading ? (
            <ActivityIndicator color="#B94E65" style={styles.listLoading} />
          ) : listItems.length === 0 ? (
            <Text style={styles.emptyText}>
              Sin movimientos este mes. ¡Registren el primero!
            </Text>
          ) : (
            <View style={styles.list}>
              {listItems.map((item) =>
                item.type === 'expense' ? (
                  <Pressable
                    key={`e-${item.expense.id}`}
                    style={styles.expenseRow}
                    onPress={() => {
                      setEditingExpense(item.expense);
                      setFormVisible(true);
                    }}
                    onLongPress={() =>
                      setConfirmDelete({
                        kind: 'expense',
                        id: item.expense.id,
                        label: item.expense.title,
                      })
                    }
                  >
                    <View style={styles.expenseTextWrap}>
                      <Text style={styles.expenseTitle} numberOfLines={1}>
                        {item.expense.title}
                      </Text>
                      <Text style={styles.expenseSubtitle}>
                        {formatDayMonth(item.expense.spent_at)} · pagó{' '}
                        {nameByUserId.get(item.expense.paid_by_user_id)} ·{' '}
                        {splitBadge(item.expense)}
                        {item.expense.event_id
                          ? ` · ${eventNameById.get(item.expense.event_id) ?? 'evento'}`
                          : ''}
                      </Text>
                    </View>

                    <Text style={styles.expenseAmount}>
                      {formatCLP(item.expense.amount)}
                    </Text>
                  </Pressable>
                ) : (
                  <Pressable
                    key={`s-${item.settlement.id}`}
                    style={[styles.expenseRow, styles.settlementRow]}
                    onLongPress={() =>
                      setConfirmDelete({
                        kind: 'settlement',
                        id: item.settlement.id,
                        label: `saldado de ${formatCLP(item.settlement.amount)}`,
                      })
                    }
                  >
                    <Ionicons name="swap-horizontal" size={18} color="#2E7D32" />

                    <View style={styles.expenseTextWrap}>
                      <Text style={styles.settlementTitle}>
                        Saldado: {nameByUserId.get(item.settlement.from_user_id)}{' '}
                        le pagó a {nameByUserId.get(item.settlement.to_user_id)}
                      </Text>
                      <Text style={styles.expenseSubtitle}>
                        {formatDayMonth(item.settlement.settled_at)}
                        {item.settlement.note ? ` · ${item.settlement.note}` : ''}
                      </Text>
                    </View>

                    <Text style={styles.settlementAmount}>
                      {formatCLP(item.settlement.amount)}
                    </Text>
                  </Pressable>
                )
              )}
            </View>
          )}

          {listItems.length > 0 && (
            <Text style={styles.listHint}>
              Toca un gasto para editarlo. Mantén presionado para eliminar.
            </Text>
          )}
        </View>

        {coupleId && (
          <EventAnalysisCard
            coupleId={coupleId}
            events={events}
            members={coupleMembers}
            refreshKey={refreshKey}
            onDeleteEvent={(event) =>
              setConfirmDelete({
                kind: 'event',
                id: event.id,
                label: event.name,
              })
            }
          />
        )}

        {coupleId && (
          <RangeAnalysisCard coupleId={coupleId} members={coupleMembers} />
        )}
      </ScrollView>

      <ExpenseFormModal
        visible={formVisible}
        members={coupleMembers}
        events={events}
        initialExpense={editingExpense}
        submitting={isSaving}
        onSubmit={(values) => void handleSubmitForm(values)}
        onCreateEvent={handleCreateEvent}
        onClose={() => {
          setFormVisible(false);
          setEditingExpense(null);
        }}
      />

      <SettleModal
        visible={settleVisible && !!debt && !debt.settled}
        fromName={
          debt && !debt.settled
            ? nameByUserId.get(debt.debtor.user_id) ?? ''
            : ''
        }
        toName={
          debt && !debt.settled
            ? nameByUserId.get(debt.creditor.user_id) ?? ''
            : ''
        }
        suggestedAmount={debt && !debt.settled ? debt.amount : 0}
        submitting={isSaving}
        onSubmit={(params) => void handleSettle(params)}
        onClose={() => setSettleVisible(false)}
      />

      <ConfirmModal
        visible={!!confirmDelete}
        message={
          confirmDelete?.kind === 'event'
            ? `Se eliminará el evento "${confirmDelete.label}". Los gastos no se borran, solo pierden la etiqueta.`
            : `Se eliminará ${
                confirmDelete?.kind === 'expense' ? 'el gasto' : 'el'
              } "${confirmDelete?.label ?? ''}" y el balance se recalculará.`
        }
        checkLabel={
          confirmDelete?.kind === 'event'
            ? 'Entiendo que los gastos quedan sin evento'
            : 'Entiendo que esto cambia las cuentas'
        }
        confirmLabel="Sí, eliminar"
        onConfirm={() => void handleConfirmDelete()}
        onCancel={() => setConfirmDelete(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#E8B6BE',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  headerBar: {
    backgroundColor: '#D25F6B',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerBackButton: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },
  balanceCard: {
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    color: '#9E4258',
    fontWeight: '700',
    marginBottom: 4,
  },
  balanceText: {
    color: '#7C3043',
    fontWeight: '700',
    fontSize: 16,
    textAlign: 'center',
  },
  balanceAmount: {
    fontWeight: '900',
    fontSize: 18,
    color: '#C84B55',
  },
  settledRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceSettled: {
    color: '#2E7D32',
    fontWeight: '900',
    fontSize: 18,
  },
  settleButton: {
    marginTop: 12,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 36,
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  summaryCard: {
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 16,
  },
  summaryTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryRowSecond: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  summarySubValue: {
    color: '#9E4258',
    fontWeight: '900',
    fontSize: 11,
    marginTop: 2,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  summaryLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 11,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
  },
  monthCard: {
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 16,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthArrow: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#FFE7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 18,
  },
  monthTotal: {
    color: '#9E4258',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 6,
  },
  addButton: {
    marginTop: 12,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  listLoading: {
    marginTop: 16,
  },
  list: {
    marginTop: 12,
    gap: 8,
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    padding: 12,
  },
  settlementRow: {
    backgroundColor: '#E9F3EA',
  },
  expenseTextWrap: {
    flex: 1,
  },
  expenseTitle: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 15,
  },
  settlementTitle: {
    color: '#2E7D32',
    fontWeight: '900',
    fontSize: 14,
  },
  expenseSubtitle: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 2,
  },
  expenseAmount: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 15,
  },
  settlementAmount: {
    color: '#2E7D32',
    fontWeight: '900',
    fontSize: 15,
  },
  listHint: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 10,
  },
  emptyText: {
    color: '#9E4258',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 12,
  },
});
