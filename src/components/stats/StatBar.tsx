import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  label: string;
  value: number;
  maxValue: number;
  // Texto a mostrar a la derecha (default: el valor).
  display?: string;
  color?: string;
};

export default function StatBar({
  label,
  value,
  maxValue,
  display,
  color = '#D96A7E',
}: Props) {
  const ratio = maxValue > 0 ? Math.max(value / maxValue, 0) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.value}>{display ?? String(value)}</Text>
      </View>

      <View style={styles.track}>
        <View
          style={[
            styles.fill,
            { width: `${Math.round(ratio * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 13,
  },
  value: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 13,
  },
  track: {
    height: 12,
    borderRadius: 999,
    backgroundColor: '#FFE7EE',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
  },
});
