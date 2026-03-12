import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';

type Props = {
  viewportWidth: number;
  viewportHeight: number;
  boardWidth: number;
  boardHeight: number;
  children: React.ReactNode;
};

const ZOOM_STEP = 0.2;
const MAX_SCALE = 3;

function clampValue(value: number, min: number, max: number) {
  'worklet';
  return Math.min(Math.max(value, min), max);
}

export function ZoomableBoardCanvas({
  viewportWidth,
  viewportHeight,
  boardWidth,
  boardHeight,
  children,
}: Props) {
  const fitScale = Math.min(
    viewportWidth / boardWidth,
    viewportHeight / boardHeight,
    1
  );

  const minScale = fitScale;

  const scale = useSharedValue(fitScale);
  const savedScale = useSharedValue(fitScale);

  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  useEffect(() => {
    scale.value = fitScale;
    savedScale.value = fitScale;
    translateX.value = 0;
    translateY.value = 0;
  }, [fitScale, boardWidth, boardHeight, scale, savedScale, translateX, translateY]);

  const clampX = (nextScale: number, rawX: number) => {
    'worklet';
    const scaledWidth = boardWidth * nextScale;
    const maxOffset = Math.max(0, (scaledWidth - viewportWidth) / 2);
    return clampValue(rawX, -maxOffset, maxOffset);
  };

  const clampY = (nextScale: number, rawY: number) => {
    'worklet';
    const scaledHeight = boardHeight * nextScale;
    const maxOffset = Math.max(0, (scaledHeight - viewportHeight) / 2);
    return clampValue(rawY, -maxOffset, maxOffset);
  };

  const panGesture = Gesture.Pan()
    .minDistance(8)
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateX.value = clampX(scale.value, startX.value + event.translationX);
      translateY.value = clampY(scale.value, startY.value + event.translationY);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const nextScale = clampValue(savedScale.value * event.scale, minScale, MAX_SCALE);
      scale.value = nextScale;
      translateX.value = clampX(nextScale, translateX.value);
      translateY.value = clampY(nextScale, translateY.value);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      translateX.value = clampX(scale.value, translateX.value);
      translateY.value = clampY(scale.value, translateY.value);
    });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedBoardStyle = useAnimatedStyle(() => {
    const baseLeft = (viewportWidth - boardWidth) / 2;
    const baseTop = (viewportHeight - boardHeight) / 2;

    return {
      position: 'absolute',
      width: boardWidth,
      height: boardHeight,
      left: baseLeft,
      top: baseTop,
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  const zoomIn = () => {
    const nextScale = Math.min(savedScale.value + ZOOM_STEP, MAX_SCALE);
    scale.value = nextScale;
    savedScale.value = nextScale;
    translateX.value = clampX(nextScale, translateX.value);
    translateY.value = clampY(nextScale, translateY.value);
  };

  const zoomOut = () => {
    const nextScale = Math.max(savedScale.value - ZOOM_STEP, minScale);
    scale.value = nextScale;
    savedScale.value = nextScale;
    translateX.value = clampX(nextScale, translateX.value);
    translateY.value = clampY(nextScale, translateY.value);
  };

  const resetView = () => {
    scale.value = fitScale;
    savedScale.value = fitScale;
    translateX.value = 0;
    translateY.value = 0;
  };

  return (
    <View style={styles.wrapper}>
      <View
        style={[
          styles.viewport,
          {
            width: viewportWidth,
            height: viewportHeight,
          },
        ]}
      >
        <GestureDetector gesture={gesture}>
          <View style={StyleSheet.absoluteFill}>
            <Animated.View style={animatedBoardStyle}>
              {children}
            </Animated.View>
          </View>
        </GestureDetector>
      </View>

      <View style={styles.controls}>
        <Pressable style={styles.controlButton} onPress={zoomOut}>
          <Text style={styles.controlText}>−</Text>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={resetView}>
          <Text style={styles.controlText}>Reset</Text>
        </Pressable>

        <Pressable style={styles.controlButton} onPress={zoomIn}>
          <Text style={styles.controlText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  viewport: {
    overflow: 'hidden',
    borderRadius: 24,
    backgroundColor: '#FFF0F4',
    borderWidth: 1,
    borderColor: '#F3B9C7',
  },
  controls: {
    marginTop: 10,
    flexDirection: 'row',
    gap: 10,
  },
  controlButton: {
    minWidth: 58,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    backgroundColor: '#FFE7EE',
  },
  controlText: {
    color: '#9E4258',
    fontWeight: '800',
    fontSize: 16,
  },
});