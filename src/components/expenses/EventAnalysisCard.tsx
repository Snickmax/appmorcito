import React, { useEffect, useState } from 'react';
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
import { ExpenseEvent, ExpenseEventSummary } from '../../types/expenses';
import { fetchEventSummary, formatCLP } from '../../lib/expensesService';
import BarChart from '../stats/BarChart';
import DonutChart from '../stats/DonutChart';

const MEMBER_COLORS = ['#D96A7E', '#8E4FA8'];

type Props = {
  coupleId: string;
  events: ExpenseEvent[];
  members: ActiveCoupleMember[];
  // Se incrementa cuando cambian los gastos, para refrescar el resumen.
  refreshKey: number;
  onDeleteEvent: (event: ExpenseEvent) => void;
};

function memberName(member: ActiveCoupleMember) {
  return member.nickname?.trim() || member.display_name?.trim() || 'miembro';
}

export default function EventAnalysisCard({
  coupleId,
  events,
  members,
  refreshKey,
  onDeleteEvent,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [summary, setSummary] = useState<ExpenseEventSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const selectedEvent = events.find((event) => event.id === selectedId) ?? null;

  useEffect(() => {
    if (selectedId && !events.some((event) => event.id === selectedId)) {
      setSelectedId(null);
      setSummary(null);
    }
  }, [events, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setSummary(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const data = await fetchEventSummary(coupleId, selectedId);
        if (!cancelled) setSummary(data);
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          Alert.alert('Error', 'No se pudo cargar el resumen del evento.');
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [coupleId, selectedId, refreshKey]);

  if (!events.length) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Eventos</Text>
        <Text style={styles.emptyText}>
          Crea un evento desde el formulario de gasto (ej: Cumpleaños,
          Suscripciones, Viaje) y aquí verás cuánto costó.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Eventos</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {events.map((event) => {
          const selected = selectedId === event.id;
          return (
            <Pressable
              key={event.id}
              style={[styles.chip, selected && styles.chipSelected]}
              onPress={() => setSelectedId(selected ? null : event.id)}
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

      {!selectedEvent ? (
        <Text style={styles.hint}>
          Toca un evento para ver su análisis. Mantén presionado para
          eliminarlo.
        </Text>
      ) : isLoading || !summary ? (
        <ActivityIndicator color="#B94E65" style={styles.loading} />
      ) : summary.count === 0 ? (
        <Text style={styles.emptyText}>
          "{selectedEvent.name}" aún no tiene gastos asociados.
        </Text>
      ) : (
        <>
          <View style={styles.totalsRow}>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Este mes</Text>
              <Text style={styles.totalValue}>
                {formatCLP(summary.monthTotal)}
              </Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Este año</Text>
              <Text style={styles.totalValue}>
                {formatCLP(summary.yearTotal)}
              </Text>
            </View>
            <View style={styles.totalBox}>
              <Text style={styles.totalLabel}>Total evento</Text>
              <Text style={styles.totalValue}>{formatCLP(summary.total)}</Text>
            </View>
          </View>

          {summary.monthlySeries.length > 1 && (
            <>
              <Text style={styles.sectionLabel}>Gasto del evento en el tiempo</Text>
              <BarChart
                data={summary.monthlySeries}
                formatValue={formatCLP}
              />
            </>
          )}

          <Text style={styles.sectionLabel}>Quién asumió el gasto</Text>
          <DonutChart
            segments={members.map((member, index) => ({
              label: memberName(member),
              value: summary.consumedByUser.get(member.user_id) ?? 0,
              color: MEMBER_COLORS[index % MEMBER_COLORS.length],
            }))}
            centerLabel={String(summary.count)}
            centerSub={summary.count === 1 ? 'gasto' : 'gastos'}
            formatValue={formatCLP}
          />
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
    marginTop: 8,
  },
  loading: {
    marginTop: 14,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  totalBox: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
  },
  totalLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 10,
    marginBottom: 4,
  },
  totalValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 12,
  },
  sectionLabel: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
    marginTop: 14,
    marginBottom: 8,
  },
  emptyText: {
    color: '#9E4258',
    fontWeight: '700',
    marginTop: 4,
  },
});
