import React from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

type Props = {
  icon: ImageSourcePropType;
  selected: boolean;
  onPress: () => void;
};

export default function CountdownAnniversaryButton({
  icon,
  selected,
  onPress,
}: Props) {
  return (
    <Pressable
      style={[styles.button, selected && styles.buttonSelected]}
      onPress={onPress}
    >
      <Image source={icon} resizeMode="contain" style={styles.icon} />
      <Text style={styles.text}>Aniversario</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#D25F6B',
    borderRadius: 18,
    paddingHorizontal: 0,
    paddingVertical: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  buttonSelected: {
    borderColor: '#B7495B',
  },
  icon: {
    width: 150,
    height: 150,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 30,
  },
});