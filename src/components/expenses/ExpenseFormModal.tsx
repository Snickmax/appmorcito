import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateField from '../DateField';
import { ActiveCoupleMember } from '../../providers/AuthProvider';
import { Expense, ExpenseEvent } from '../../types/expenses';
import { formatCLP } from '../../lib/expensesService';

export type ExpenseFormValues = {
  title: string;
  amount: number;
  paidByUserId: string;
  spentAtYmd: string;
  eventId: string | null;
  // Cuánto le corresponde asumir a cada miembro (suman el total).
  owedByUser: Map<string, number>;
};

type SplitMode = 'half' | 'percent' | 'fixed' | 'whole';

type Props = {
  visible: boolean;
  members: ActiveCoupleMember[];
  events: ExpenseEvent[];
  initialExpense?: Expense | null;
  submitting: boolean;
  onSubmit: (values: ExpenseFormValues) => void;
  onCreateEvent: (name: string) => Promise<ExpenseEvent | null>;
  onClose: () => void;
};

function parseAmount(value: string): number | null {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
}

function memberName(member: ActiveCoupleMember | undefined) {
  return member?.nickname?.trim() || member?.display_name?.trim() || 'miembro';
}

function todayYmd() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export default function ExpenseFormModal({
  visible,
  members,
  events,
  initialExpense,
  submitting,
  onSubmit,
  onCreateEvent,
  onClose,
}: Props) {
  const [title, setTitle] = useState('');
  const [amountText, setAmountText] = useState('');
  const [paidBy, setPaidBy] = useState<string | null>(null);
  const [spentAt, setSpentAt] = useState(todayYmd());
  const [splitMode, setSplitMode] = useState<SplitMode>('half');
  // Para percent/fixed: valor que asume el PRIMER miembro de la lista.
  const [splitValueText, setSplitValueText] = useState('');
  // Para 'whole': quién asume el 100% del gasto.
  const [wholeAssumerId, setWholeAssumerId] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [newEventVisible, setNewEventVisible] = useState(false);
  const [newEventName, setNewEventName] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  const isEdit = !!initialExpense;
  const memberA = members[0];
  const memberB = members[1];

  useEffect(() => {
    if (!visible) return;

    setNewEventVisible(false);
    setNewEventName('');

    if (initialExpense) {
      setTitle(initialExpense.title);
      setAmountText(String(Math.round(initialExpense.amount)));
      setPaidBy(initialExpense.paid_by_user_id);
      setSpentAt(initialExpense.spent_at.slice(0, 10));
      setEventId(initialExpense.event_id);

      const shareA = initialExpense.shares.find(
        (share) => share.user_id === memberA?.user_id
      );
      const shareB = initialExpense.shares.find(
        (share) => share.user_id === memberB?.user_id
      );
      const half = initialExpense.amount / 2;
      const owedA = shareA?.owed_amount ?? 0;
      const owedB = shareB?.owed_amount ?? 0;

      setWholeAssumerId(null);

      if (owedA < 1 && owedB >= 1) {
        // Uno asume todo: lo asume el segundo miembro.
        setSplitMode('whole');
        setWholeAssumerId(memberB?.user_id ?? null);
        setSplitValueText('');
      } else if (owedB < 1 && owedA >= 1) {
        setSplitMode('whole');
        setWholeAssumerId(memberA?.user_id ?? null);
        setSplitValueText('');
      } else if (Math.abs(owedA - half) < 1) {
        setSplitMode('half');
        setSplitValueText('');
      } else {
        setSplitMode('fixed');
        setSplitValueText(String(Math.round(owedA)));
      }
    } else {
      setTitle('');
      setAmountText('');
      setPaidBy(null);
      setSpentAt(todayYmd());
      setSplitMode('half');
      setSplitValueText('');
      setWholeAssumerId(null);
      setEventId(null);
    }
  }, [visible, initialExpense, memberA?.user_id, memberB?.user_id]);

  const handleCreateEvent = async () => {
    const name = newEventName.trim();
    if (!name || creatingEvent) return;

    setCreatingEvent(true);
    const created = await onCreateEvent(name);
    setCreatingEvent(false);

    if (created) {
      setEventId(created.id);
      setNewEventName('');
      setNewEventVisible(false);
    }
  };

  const amount = parseAmount(amountText);

  const split = useMemo(() => {
    if (!amount || !memberA || !memberB) return null;

    if (splitMode === 'half') {
      const a = Math.round(amount / 2);
      return { a, b: amount - a };
    }

    if (splitMode === 'whole') {
      if (!wholeAssumerId) return null;
      const aAssumes = wholeAssumerId === memberA.user_id;
      return { a: aAssumes ? amount : 0, b: aAssumes ? 0 : amount };
    }

    const value = parseAmount(splitValueText);
    if (value == null) return null;

    if (splitMode === 'percent') {
      if (value > 100) return null;
      const a = Math.round((amount * value) / 100);
      return { a, b: amount - a };
    }

    // fixed: el primer miembro asume `value`, el otro el resto.
    if (value > amount) return null;
    return { a: value, b: amount - value };
  }, [amount, splitMode, splitValueText, wholeAssumerId, memberA, memberB]);

  // Aviso de deuda para el modo 'whole'.
  const wholeHint = useMemo(() => {
    if (splitMode !== 'whole' || !wholeAssumerId || !amount || !paidBy) {
      return null;
    }
    if (wholeAssumerId === paidBy) {
      return 'Invitación: nadie queda debiendo.';
    }
    const debtor =
      wholeAssumerId === memberA?.user_id ? memberA : memberB;
    return `${memberName(debtor)} queda debiendo ${formatCLP(amount)}.`;
  }, [splitMode, wholeAssumerId, amount, paidBy, memberA, memberB]);

  const canSubmit =
    !!title.trim() && !!amount && amount > 0 && !!paidBy && !!split && !submitting;

  const handleSubmit = () => {
    if (!canSubmit || !split || !memberA || !memberB || !paidBy || !amount) {
      return;
    }

    const owedByUser = new Map<string, number>();
    owedByUser.set(memberA.user_id, split.a);
    owedByUser.set(memberB.user_id, split.b);

    onSubmit({
      title: title.trim(),
      amount,
      paidByUserId: paidBy,
      spentAtYmd: spentAt,
      eventId,
      owedByUser,
    });
  };

  if (!memberA || !memberB) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.headerRow}>
              <Text style={styles.title}>
                {isEdit ? 'Editar Gasto' : 'Nuevo Gasto'}
              </Text>

              <Pressable style={styles.closeButton} onPress={onClose}>
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Nombre (ej: Sushi)"
              placeholderTextColor="#A66B79"
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            <TextInput
              style={styles.input}
              placeholder="Monto total (CLP)"
              placeholderTextColor="#A66B79"
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="numeric"
            />

            <DateField label="Fecha" value={spentAt} onChange={setSpentAt} />

            <Text style={styles.sectionTitle}>¿Quién pagó?</Text>

            <View style={styles.chipsRow}>
              {members.map((member) => {
                const selected = paidBy === member.user_id;
                return (
                  <Pressable
                    key={member.user_id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setPaidBy(member.user_id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {memberName(member)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>División</Text>

            <View style={styles.chipsRow}>
              {(
                [
                  ['half', 'Mitades'],
                  ['percent', 'Porcentaje'],
                  ['fixed', 'Montos'],
                  ['whole', 'Uno asume todo'],
                ] as [SplitMode, string][]
              ).map(([mode, label]) => {
                const selected = splitMode === mode;
                return (
                  <Pressable
                    key={mode}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => {
                      setSplitMode(mode);
                      setSplitValueText('');
                      if (mode === 'whole') {
                        setWholeAssumerId(paidBy ?? memberA?.user_id ?? null);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {(splitMode === 'percent' || splitMode === 'fixed') && (
              <TextInput
                style={styles.input}
                placeholder={
                  splitMode === 'percent'
                    ? `% que asume ${memberName(memberA)} (ej: 30)`
                    : `Monto que asume ${memberName(memberA)} (ej: 2000)`
                }
                placeholderTextColor="#A66B79"
                value={splitValueText}
                onChangeText={setSplitValueText}
                keyboardType="numeric"
              />
            )}

            {splitMode === 'whole' && (
              <>
                <Text style={styles.subLabel}>¿Quién asume el total?</Text>
                <View style={styles.chipsRow}>
                  {members.map((member) => {
                    const selected = wholeAssumerId === member.user_id;
                    return (
                      <Pressable
                        key={member.user_id}
                        style={[styles.chip, selected && styles.chipSelected]}
                        onPress={() => setWholeAssumerId(member.user_id)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected && styles.chipTextSelected,
                          ]}
                        >
                          {memberName(member)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}

            <View style={styles.previewBox}>
              {split ? (
                <>
                  <Text style={styles.previewText}>
                    {memberName(memberA)} asume {formatCLP(split.a)} ·{' '}
                    {memberName(memberB)} asume {formatCLP(split.b)}
                  </Text>
                  {wholeHint && (
                    <Text style={styles.previewHint}>{wholeHint}</Text>
                  )}
                </>
              ) : (
                <Text style={styles.previewTextEmpty}>
                  Ingresa monto y división para ver el reparto.
                </Text>
              )}
            </View>

            <Text style={styles.sectionTitle}>Evento (opcional)</Text>

            <View style={styles.chipsRow}>
              <Pressable
                style={[styles.chip, eventId === null && styles.chipSelected]}
                onPress={() => setEventId(null)}
              >
                <Text
                  style={[
                    styles.chipText,
                    eventId === null && styles.chipTextSelected,
                  ]}
                >
                  Sin evento
                </Text>
              </Pressable>

              {events.map((event) => {
                const selected = eventId === event.id;
                return (
                  <Pressable
                    key={event.id}
                    style={[styles.chip, selected && styles.chipSelected]}
                    onPress={() => setEventId(event.id)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {event.name}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                style={[styles.chip, styles.chipNew]}
                onPress={() => setNewEventVisible((prev) => !prev)}
              >
                <Text style={styles.chipText}>+ Nuevo</Text>
              </Pressable>
            </View>

            {newEventVisible && (
              <View style={styles.newEventRow}>
                <TextInput
                  style={[styles.input, styles.newEventInput]}
                  placeholder="Nombre (ej: Cumpleaños Coni)"
                  placeholderTextColor="#A66B79"
                  value={newEventName}
                  onChangeText={setNewEventName}
                  maxLength={60}
                  autoFocus
                />

                <Pressable
                  style={[
                    styles.newEventButton,
                    (!newEventName.trim() || creatingEvent) &&
                      styles.disabledButton,
                  ]}
                  onPress={() => void handleCreateEvent()}
                  disabled={!newEventName.trim() || creatingEvent}
                >
                  {creatingEvent ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.newEventButtonText}>Crear</Text>
                  )}
                </Pressable>
              </View>
            )}

            <Pressable
              style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Guardar</Text>
              )}
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(63, 21, 32, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '88%',
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    flex: 1,
    fontSize: 24,
    fontWeight: '900',
    color: '#7C3043',
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  input: {
    height: 52,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#7C3043',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#7C3043',
    fontWeight: '900',
    marginBottom: 8,
  },
  subLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
    marginBottom: 8,
  },
  previewHint: {
    color: '#C84B55',
    fontWeight: '900',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#FFE1E9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipSelected: {
    backgroundColor: '#C84B55',
  },
  chipText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  previewBox: {
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
  },
  chipNew: {
    borderWidth: 1,
    borderColor: '#D96A7E',
    backgroundColor: 'transparent',
  },
  newEventRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  newEventInput: {
    flex: 1,
  },
  newEventButton: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: '#C84B55',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newEventButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  previewText: {
    color: '#7C3043',
    fontWeight: '900',
    textAlign: 'center',
  },
  previewTextEmpty: {
    color: '#9E4258',
    fontWeight: '700',
    textAlign: 'center',
    fontSize: 12,
  },
  primaryButton: {
    marginTop: 12,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.45,
  },
});
