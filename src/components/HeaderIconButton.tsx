import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

export default function HeaderIconButton({ icon, label, onPress }: Props) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={16} color="#9E4258" />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFE7EE',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#9E4258',
    fontWeight: '800',
    fontSize: 13,
  },
});