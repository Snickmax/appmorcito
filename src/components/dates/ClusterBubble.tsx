import React, { useEffect, useSyncExternalStore } from 'react';
import { PixelRatio } from 'react-native';
import { Marker } from 'react-native-maps';

import {
  getClusterIconUri,
  requestClusterIcon,
  subscribe,
} from './clusterIconStore';

type Props = {
  latitude: number;
  longitude: number;
  count: number;
  onPress: () => void;
};

// Igual que SpotPin, la burbuja usa el prop nativo `image` (BitmapDescriptor):
// react-native-maps con la Nueva Arquitectura renderiza mal los markers con
// vistas hijas en Android (react-native-maps#5877; el círculo salía recortado
// aunque el tracking quedara activo). El bitmap se genera en runtime por
// ClusterIconFactory (view-shot), así el número funciona para cualquier count.
export default function ClusterBubble({
  latitude,
  longitude,
  count,
  onPress,
}: Props) {
  const uri = useSyncExternalStore(subscribe, () => getClusterIconUri(count));

  useEffect(() => {
    if (!uri) {
      requestClusterIcon(count);
    }
  }, [uri, count]);

  // Sin icono todavía (primera vez que aparece este count en la sesión):
  // mejor nada por un frame que el pin rojo default del Marker sin image.
  if (!uri) {
    return null;
  }

  return (
    <Marker
      coordinate={{ latitude, longitude }}
      anchor={{ x: 0.5, y: 0.5 }}
      image={{ uri, scale: PixelRatio.get() }}
      onPress={onPress}
      tracksViewChanges={false}
    />
  );
}
