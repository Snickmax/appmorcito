import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import DateField from './DateField';

export type DateRange = { fromYmd: string; toYmd: string };

type Props = {
  // null = TODO (sin filtro de fecha).
  range: DateRange | null;
  onChange: (range: DateRange | null) => void;
};

function todayYmd() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function monthStartYmd() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-01`;
}

export default function DateRangeFilter({ range, onChange }: Props) {
  const isAll = range === null;

  const enableRange = () => {
    onChange({ fromYmd: monthStartYmd(), toYmd: todayYmd() });
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Periodo</Text>

        <Pressable
          style={[styles.todoButton, isAll && styles.todoButtonOn]}
          onPress={() => onChange(null)}
        >
          <Text style={[styles.todoText, isAll && styles.todoTextOn]}>
            TODO
          </Text>
        </Pressable>
      </View>

      {isAll ? (
        <Pressable style={styles.enableRow} onPress={enableRange}>
          <Text style={styles.enableText}>
            Mostrando todo · toca para elegir un rango de fechas
          </Text>
        </Pressable>
      ) : (
        <View style={styles.datesRow}>
          <View style={styles.dateCol}>
            <DateField
              label="Desde"
              value={range.fromYmd}
              onChange={(value) => onChange({ ...range, fromYmd: value })}
            />
          </View>
          <View style={styles.dateCol}>
            <DateField
              label="Hasta"
              value={range.toYmd}
              onChange={(value) => onChange({ ...range, toYmd: value })}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
  },
  todoButton: {
    backgroundColor: '#FFE1E9',
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 7,
  },
  todoButtonOn: {
    backgroundColor: '#C84B55',
  },
  todoText: {
    color: '#9E4258',
    fontWeight: '900',
    fontSize: 12,
  },
  todoTextOn: {
    color: '#FFFFFF',
  },
  enableRow: {
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  enableText: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
  },
  datesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateCol: {
    flex: 1,
  },
});
