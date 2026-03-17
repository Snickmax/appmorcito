import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  value: string;
  label: string;
};

export default function CountdownUnitBox({ value, label }: Props) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.valueBox}>
        <Text style={styles.value}>{value}</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    alignItems: 'center',
  },
  valueBox: {
    minWidth: 58,
    backgroundColor: '#D25F6B',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 22,
  },
  label: {
    color: '#000000',
    fontWeight: '700',
    marginTop: 6,
    fontSize: 12,
  },
});