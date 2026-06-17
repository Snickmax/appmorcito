import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ActiveCoupleMember } from '../../providers/AuthProvider';
import { ExpenseAnalysis, ExpenseEvent } from '../../types/expenses';
import { fetchExpenseAnalysis, formatCLP } from '../../lib/expensesService';
import DateRangeFilter, { DateRange } from '../DateRangeFilter';
import DonutChart from '../stats/DonutChart';
import MultiLineChart from '../stats/MultiLineChart';

const MEMBER_COLORS = ['#D96A7E', '#8E4FA8'];

type Props = {
  coupleId: string;
  events: ExpenseEvent[];
  members: ActiveCoupleMember[];
  // Cambia cuando se modifican los gastos, para recargar el análisis.
  refreshKey: number;
  onDeleteEvent: (event: ExpenseEvent) => void;
};

function memberName(member: ActiveCoupleMember) {
  return member.nickname?.trim() || member.display_name?.trim() || 'miembro';
}

export default function ExpenseAnalysisCard({
  coupleId,
  events,
  members,
  refreshKey,
  onDeleteEvent,
}: Props) {
  const [eventId, setEventId] = useState<string | null>(null);
  const [range, setRange] = useState<DateRange | null>(null);
  const [analysis, setAnalysis] = useState<ExpenseAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Si el evento seleccionado se elimina, volver a "Todos".
  useEffect(() => {
    if (eventId && !events.some((event) => event.id === eventId)) {
      setEventId(null);
    }
  }, [events, eventId]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchExpenseAnalysis({
          coupleId,
          eventId,
          fromYmd: range?.fromYmd ?? null,
          toYmd: range?.toYmd ?? null,
        });
        if (!cancelled) setAnalysis(data);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          Alert.alert('Error', 'No se pudo cargar el análisis de gastos.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [coupleId, eventId, range?.fromYmd, range?.toYmd, refreshKey]);

  const lineSeries = useMemo(() => {
    if (!analysis) return [];

    return members.map((member, index) => ({
      label: memberName(member),
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
      points: analysis.monthLabels.map((label, idx) => ({
        label,
        value: analysis.monthlyByUser.get(member.user_id)?.[idx] ?? 0,
      })),
    }));
  }, [analysis, members]);

  const donutSegments = useMemo(() => {
    if (!analysis) return [];

    return members.map((member, index) => ({
      label: memberName(member),
      value: analysis.consumedByUser.get(member.user_id) ?? 0,
      color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    }));
  }, [analysis, members]);

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Análisis</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        <Pressable
          style={[styles.chip, eventId === null && styles.chipSelected]}
          onPress={() => setEventId(null)}
        >
          <Text
            style={[styles.chipText, eventId === null && styles.chipTextSelected]}
          >
            Todos
          </Text>
        </Pressable>

        {events.map((event) => {
          const selected = eventId === event.id;
          return (
            <Pressable
              key={event.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setEventId(selected ? null : event.id)}
              onLongPress={() => onDeleteEvent(event)}
            >
              <Text
                style={[styles.chipText, selected && styles.chipTextSelected]}
              >
                {event.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {events.length > 0 && (
        <Text style={styles.hint}>
          Mantén presionado un evento para eliminarlo.
        </Text>
      )}

      <View style={styles.rangeWrap}>
        <DateRangeFilter range={range} onChange={setRange} />
      </View>

      {isLoading || !analysis ? (
        <ActivityIndicator color="#B94E65" style={styles.loading} />
      ) : analysis.count === 0 ? (
        <Text style={styles.emptyText}>
          No hay gastos con estos filtros.
        </Text>
      ) : (
        <>
          <View style={styles.totalBox}>
            <Text style={styles.totalValue}>{formatCLP(analysis.total)}</Text>
            <Text style={styles.totalLabel}>
              {analysis.count} {analysis.count === 1 ? 'gasto' : 'gastos'}
            </Text>
          </View>

          {eventId && analysis.eventTotals && (
            <View style={styles.eventTotalsRow}>
              <View style={styles.eventTotalBox}>
                <Text style={styles.eventTotalLabel}>Este mes</Text>
                <Text style={styles.eventTotalValue}>
                  {formatCLP(analysis.eventTotals.month)}
                </Text>
              </View>
              <View style={styles.eventTotalBox}>
                <Text style={styles.eventTotalLabel}>Este año</Text>
                <Text style={styles.eventTotalValue}>
                  {formatCLP(analysis.eventTotals.year)}
                </Text>
              </View>
            </View>
          )}

          {analysis.monthLabels.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>
                Gasto real por mes (cada uno)
              </Text>
              <MultiLineChart series={lineSeries} formatValue={formatCLP} />
            </>
          )}

          <Text style={styles.sectionLabel}>Quién asumió el gasto</Text>
          <DonutChart segments={donutSegments} formatValue={formatCLP} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF0F4',
    borderRadius: 20,
    padding: 16,
  },
  title: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 16,
    marginBottom: 10,
  },
  chipsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    backgroundColor: '#FFE1E9',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
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
  hint: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 11,
    marginTop: 6,
  },
  rangeWrap: {
    marginTop: 12,
    marginBottom: 4,
  },
  loading: {
    marginTop: 16,
  },
  totalBox: {
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  totalValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 22,
  },
  totalLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
    marginTop: 2,
  },
  eventTotalsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  eventTotalBox: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  eventTotalLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 10,
    marginBottom: 4,
  },
  eventTotalValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
  },
  sectionLabel: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 10,
  },
  emptyText: {
    color: '#9E4258',
    fontWeight: '700',
    marginTop: 12,
    textAlign: 'center',
  },
});
