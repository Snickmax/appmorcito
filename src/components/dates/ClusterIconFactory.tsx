import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import {
  failClusterIcon,
  getPendingCounts,
  requestClusterIcon,
  resolveClusterIcon,
  subscribe,
} from './clusterIconStore';

// Réplica en View/Text del PNG de cluster original: círculo #D96A7E con
// halo #FFF0F4 de 4dp y número blanco. minWidth + padding la convierten
// en pill automáticamente para counts de 3+ dígitos.
export function ClusterBubbleView({ count }: { count: number }) {
  return (
    <View style={styles.bubble}>
      <Text style={styles.text}>{count}</Text>
    </View>
  );
}

function CaptureItem({ count }: { count: number }) {
  const shotRef = useRef<ViewShot>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return (
    <ViewShot
      ref={shotRef}
      options={{ format: 'png', result: 'tmpfile' }}
      onLayout={() => {
        requestAnimationFrame(() => {
          shotRef.current
            ?.capture?.()
            .then((uri) => {
              if (mountedRef.current) {
                resolveClusterIcon(count, uri);
              }
            })
            .catch((error) => {
              console.warn(`No se pudo capturar el icono de cluster ${count}`, error);
              if (mountedRef.current) {
                failClusterIcon(count);
              }
            });
        });
      }}
    >
      <ClusterBubbleView count={count} />
    </ViewShot>
  );
}

// Genera los bitmaps de cluster que los ClusterBubble solicitan: renderiza
// la burbuja fuera de pantalla (por posición, no con opacity 0: view-shot
// dibuja vía View#draw y opacity 0 puede capturar transparente), la captura
// con view-shot y publica el file:// uri en clusterIconStore.
// Debe montarse FUERA del MapView (los children del mapa deben ser markers).
export default function ClusterIconFactory() {
  const pendingCounts = useSyncExternalStore(subscribe, getPendingCounts);

  // Pre-calienta los counts pequeños (el caso común) para que los clusters
  // aparezcan con icono desde el primer frame.
  useEffect(() => {
    for (let count = 2; count <= 10; count += 1) {
      requestClusterIcon(count);
    }
  }, []);

  if (pendingCounts.length === 0) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.offscreen}>
      {pendingCounts.map((count) => (
        <CaptureItem key={count} count={count} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: -9999,
    top: 0,
  },
  bubble: {
    minWidth: 42,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 12,
    backgroundColor: '#D96A7E',
    borderWidth: 4,
    borderColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
});
