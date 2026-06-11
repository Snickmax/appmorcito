import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

type Props = {
  latitude: number;
  longitude: number;
  count: number;
  onPress: () => void;
};

// Workaround del bug react-native-maps#5877 (Android + Nueva Arquitectura):
// los markers con vista hija y tracksViewChanges=false no se renderizan.
// Se monta con tracking activo y se apaga una vez dibujada la burbuja.
export default function ClusterBubble({
  latitude,
  longitude,
  count,
  onPress,
}: Props) {
  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setTracksViewChanges(false), 450);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={tracksViewChanges}
      onPress={onPress}
    >
      <View collapsable={false} style={styles.bubble}>
        <Text style={styles.text}>{count}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  bubble: {
    width: 42,
    height: 42,
    borderRadius: 999,
    backgroundColor: '#D96A7E',
    borderWidth: 3,
    borderColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 14,
  },
});
