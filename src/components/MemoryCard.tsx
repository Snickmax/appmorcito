import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MemoryCardModel } from '../types/memory';

type Props = {
  card: MemoryCardModel;
  size: number;
  onPress: () => void;
};

export function MemoryCard({ card, size, onPress }: Props) {
  const showFront = card.isFlipped || card.isMatched;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          width: size,
          height: size,
          transform: [{ scale: pressed ? 0.97 : 1 }],
          opacity: card.isMatched ? 0.88 : 1,
        },
      ]}
    >
      {showFront ? (
        <Image
          source={{ uri: card.uri }}
          style={styles.image}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.backFace}>
          <Text style={styles.backText}>❤</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#FFE7EE',
    borderWidth: 2,
    borderColor: '#D96A7E',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  backFace: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD7E1',
  },
  backText: {
    fontSize: 26,
    color: '#B94E65',
    fontWeight: '700',
  },
});