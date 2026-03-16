import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  GestureResponderEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import {
  cropAssetWithRect,
  uploadAssetsIntoSlots,
  UploadableMemoryAsset,
} from '../lib/memorySetService';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryCropQueue'>;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function MemoryCropQueueScreen({ navigation, route }: Props) {
  const { width, height } = useWindowDimensions();
  const { title, assets, slotIndexes, coupleId, userId, memorySetId } =
    route.params;

  const cropSize = Math.min(width - 32, height * 0.52);

  const [index, setIndex] = useState(0);
  const [croppedAssets, setCroppedAssets] = useState<UploadableMemoryAsset[]>(
    []
  );
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);

  const offsetRef = useRef({ x: 0, y: 0 });
  const dragStartTouchRef = useRef({ x: 0, y: 0 });
  const dragStartOffsetRef = useRef({ x: 0, y: 0 });

  const currentAsset = assets[index];

  const baseScale = useMemo(() => {
    if (!currentAsset?.width || !currentAsset?.height) return 1;
    return Math.max(
      cropSize / currentAsset.width,
      cropSize / currentAsset.height
    );
  }, [cropSize, currentAsset]);

  const displayScale = baseScale * zoom;
  const displayWidth = (currentAsset?.width ?? 0) * displayScale;
  const displayHeight = (currentAsset?.height ?? 0) * displayScale;

  const clampOffset = (
    nextX: number,
    nextY: number,
    nextZoom = zoom
  ) => {
    const nextDisplayScale = baseScale * nextZoom;
    const nextDisplayWidth = (currentAsset?.width ?? 0) * nextDisplayScale;
    const nextDisplayHeight = (currentAsset?.height ?? 0) * nextDisplayScale;

    const maxX = Math.max(0, (nextDisplayWidth - cropSize) / 2);
    const maxY = Math.max(0, (nextDisplayHeight - cropSize) / 2);

    return {
      x: clamp(nextX, -maxX, maxX),
      y: clamp(nextY, -maxY, maxY),
    };
  };

  const setClampedOffset = (
    nextX: number,
    nextY: number,
    nextZoom = zoom
  ) => {
    const next = clampOffset(nextX, nextY, nextZoom);
    offsetRef.current = next;
    setOffset(next);
  };

  useEffect(() => {
    setZoom(1);
    offsetRef.current = { x: 0, y: 0 };
    setOffset({ x: 0, y: 0 });
  }, [index]);

  useEffect(() => {
    const next = clampOffset(offsetRef.current.x, offsetRef.current.y, zoom);
    offsetRef.current = next;
    setOffset(next);
  }, [zoom, currentAsset, baseScale]);

  const handleResponderGrant = (event: GestureResponderEvent) => {
    dragStartTouchRef.current = {
      x: event.nativeEvent.pageX,
      y: event.nativeEvent.pageY,
    };
    dragStartOffsetRef.current = offsetRef.current;
  };

  const handleResponderMove = (event: GestureResponderEvent) => {
    const dx = event.nativeEvent.pageX - dragStartTouchRef.current.x;
    const dy = event.nativeEvent.pageY - dragStartTouchRef.current.y;

    setClampedOffset(
      dragStartOffsetRef.current.x + dx,
      dragStartOffsetRef.current.y + dy
    );
  };

  const applyZoom = (nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    setZoom(clampedZoom);
    setClampedOffset(offsetRef.current.x, offsetRef.current.y, clampedZoom);
  };

  const buildCropRect = () => {
    const imageLeft = (cropSize - displayWidth) / 2 + offset.x;
    const imageTop = (cropSize - displayHeight) / 2 + offset.y;

    const originX = (0 - imageLeft) / displayScale;
    const originY = (0 - imageTop) / displayScale;
    const widthPx = cropSize / displayScale;
    const heightPx = cropSize / displayScale;

    return {
      originX: clamp(
        originX,
        0,
        Math.max(0, (currentAsset?.width ?? 0) - widthPx)
      ),
      originY: clamp(
        originY,
        0,
        Math.max(0, (currentAsset?.height ?? 0) - heightPx)
      ),
      width: Math.min(widthPx, currentAsset?.width ?? widthPx),
      height: Math.min(heightPx, currentAsset?.height ?? heightPx),
    };
  };

  const handleNext = async () => {
    if (!currentAsset) return;

    try {
      setIsSaving(true);

      const cropped = await cropAssetWithRect(currentAsset, buildCropRect());
      const nextCropped = [...croppedAssets, cropped];

      if (index === assets.length - 1) {
        await uploadAssetsIntoSlots({
          coupleId,
          userId,
          memorySetId,
          slotIndexes,
          assets: nextCropped,
        });

        navigation.goBack();
        return;
      }

      setCroppedAssets(nextCropped);
      setIndex((prev) => prev + 1);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'No se pudo recortar la imagen.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    if (index === 0) {
      navigation.goBack();
      return;
    }

    setCroppedAssets((prev) => prev.slice(0, -1));
    setIndex((prev) => prev - 1);
  };

  if (!currentAsset) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.centerText}>No hay imágenes para recortar.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const imageLeft = (cropSize - displayWidth) / 2 + offset.x;
  const imageTop = (cropSize - displayHeight) / 2 + offset.y;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Pressable style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </Pressable>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Recorte {index + 1} de {assets.length}
        </Text>

        <View style={styles.cropWrapper}>
          <View
            style={[
              styles.cropArea,
              {
                width: cropSize,
                height: cropSize,
              },
            ]}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleResponderGrant}
            onResponderMove={handleResponderMove}
          >
            <Image
              source={{ uri: currentAsset.uri }}
              style={{
                position: 'absolute',
                width: displayWidth,
                height: displayHeight,
                left: imageLeft,
                top: imageTop,
              }}
              resizeMode="cover"
            />

            <View style={styles.cropBorder} pointerEvents="none" />
          </View>
        </View>

        <Text style={styles.helper}>
          Arrastra la imagen para encuadrar. Usa zoom para acercar o alejar.
        </Text>

        <View style={styles.zoomRow}>
          <Pressable
            style={styles.zoomButton}
            onPress={() => applyZoom(zoom - 0.25)}
          >
            <Text style={styles.zoomButtonText}>−</Text>
          </Pressable>

          <Text style={styles.zoomText}>{zoom.toFixed(2)}x</Text>

          <Pressable
            style={styles.zoomButton}
            onPress={() => applyZoom(zoom + 0.25)}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </Pressable>
        </View>

        <Pressable
          style={[styles.primaryButton, isSaving && styles.disabledButton]}
          onPress={handleNext}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {index === assets.length - 1
                ? 'Guardar imágenes'
                : 'Siguiente recorte'}
            </Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFD4E0',
  },
  container: {
    flex: 1,
    padding: 20,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  centerText: {
    color: '#7C3043',
    fontWeight: '700',
    textAlign: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFE7EE',
  },
  backButtonText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#7C3043',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: '#9E4258',
    marginBottom: 18,
  },
  cropWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  cropArea: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#000000',
    position: 'relative',
  },
  cropBorder: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 24,
  },
  helper: {
    marginTop: 14,
    textAlign: 'center',
    color: '#9E4258',
    fontWeight: '600',
  },
  zoomRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  zoomButton: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFE7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomButtonText: {
    color: '#9E4258',
    fontSize: 28,
    fontWeight: '800',
  },
  zoomText: {
    minWidth: 70,
    textAlign: 'center',
    color: '#7C3043',
    fontWeight: '800',
    fontSize: 18,
  },
  primaryButton: {
    marginTop: 26,
    backgroundColor: '#C84B55',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.5,
  },
});