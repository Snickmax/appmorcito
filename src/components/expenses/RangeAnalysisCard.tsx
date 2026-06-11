import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateField from '../DateField';
import { ActiveCoupleMember } from '../../providers/AuthProvider';
import { ExpenseRangeSummary } from '../../types/expenses';
import { fetchRangeSummary, formatCLP } from '../../lib/expensesService';

type Props = {
  coupleId: string;
  members: ActiveCoupleMember[];
};

function memberName(member: ActiveCoupleMember) {
  return member.nickname?.trim() || member.display_name?.trim() || 'miembro';
}

function ymd(date: Date) {
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function RangeAnalysisCard({ coupleId, members }: Props) {
  const now = new Date();
  const [fromYmd, setFromYmd] = useState(
    ymd(new Date(now.getFullYear(), now.getMonth(), 1))
  );
  const [toYmd, setToYmd] = useState(ymd(now));
  const [summary, setSummary] = useState<ExpenseRangeSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async () => {
    if (!fromYmd || !toYmd || isLoading) return;

    if (fromYmd > toYmd) {
      Alert.alert('Rango inválido', 'La fecha "desde" debe ser anterior a "hasta".');
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchRangeSummary(coupleId, fromYmd, toYmd);
      setSummary(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo calcular el rango.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Gasto por rango de fechas</Text>

      <View style={styles.datesRow}>
        <View style={styles.dateCol}>
          <DateField label="Desde" value={fromYmd} onChange={setFromYmd} />
        </View>
        <View style={styles.dateCol}>
          <DateField label="Hasta" value={toYmd} onChange={setToYmd} />
        </View>
      </View>

      <Pressable
        style={[styles.searchButton, isLoading && styles.disabled]}
        onPress={() => void handleSearch()}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" size="small" />
        ) : (
          <Text style={styles.searchButtonText}>Calcular</Text>
        )}
      </Pressable>

      {summary && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTotal}>
            {formatCLP(summary.total)}{' '}
            <Text style={styles.resultCount}>
              en {summary.count} {summary.count === 1 ? 'gasto' : 'gastos'}
            </Text>
          </Text>

          {members.map((member) => (
            <Text key={member.user_id} style={styles.resultLine}>
              {memberName(member)}: asumió{' '}
              {formatCLP(summary.consumedByUser.get(member.user_id) ?? 0)} ·
              pagó {formatCLP(summary.paidByUser.get(member.user_id) ?? 0)}
            </Text>
          ))}
        </View>
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
  datesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateCol: {
    flex: 1,
  },
  searchButton: {
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  disabled: {
    opacity: 0.45,
  },
  resultBox: {
    marginTop: 12,
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    padding: 12,
  },
  resultTotal: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  resultCount: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
  },
  resultLine: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 2,
  },
});
