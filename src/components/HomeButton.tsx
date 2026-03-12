import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { COLORS } from '../theme/colors';

type Props = {
  icon: ImageSourcePropType;
  label: string;
  iconSize: number;
  onPress: () => void;
};

export function HomeButton({ icon, label, iconSize, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <View style={styles.content}>
        <Image
          source={icon}
          resizeMode="contain"
          style={{ width: iconSize, height: iconSize }}
        />

        <Text
          style={[
            styles.label,
            {
              fontSize: iconSize * 0.3,
            },
          ]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {label}
        </Text>

        <View style={styles.spacer} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    color: COLORS.text,
    fontWeight: '600',
    flexShrink: 1,
  },
  spacer: {
    flex: 1,
  },
});