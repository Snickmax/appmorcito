import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Props = {
  title: string;
  icon: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
};

export default function CountdownPersonCard({
  title,
  icon,
  selected,
  onPress,
}: Props) {
  return (
    <Pressable
      style={[styles.card, selected && styles.cardSelected]}
      onPress={onPress}
    >
      <Text style={styles.title}>{title}</Text>

      <View style={styles.iconWrap}>
        <Image source={icon} resizeMode="contain" style={styles.icon} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#F1E4E4',
    borderRadius: 18,
    paddingTop: 14,
    paddingBottom: 16,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#D25F6B',
    backgroundColor: '#F7EAEA',
  },
  title: {
    color: '#000000',
    fontWeight: '900',
    fontSize: 25,
    marginBottom: 8,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  icon: {
    width: 125,
    height: 125,
  },
});