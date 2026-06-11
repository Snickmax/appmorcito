import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polygon, Polyline } from 'react-native-svg';

export type LinePoint = {
  label: string;
  value: number;
};

type Props = {
  data: LinePoint[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
};

export default function LineChart({
  data,
  height = 120,
  color = '#C84B55',
  formatValue,
}: Props) {
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const max = Math.max(...data.map((point) => point.value), 1);
  const padX = 12;
  const padTop = 18;
  const padBottom = 8;
  const innerWidth = Math.max(width - padX * 2, 1);
  const innerHeight = height - padTop - padBottom;

  const coords = data.map((point, index) => {
    const x =
      data.length > 1
        ? padX + (index / (data.length - 1)) * innerWidth
        : padX + innerWidth / 2;
    const y = padTop + innerHeight - (point.value / max) * innerHeight;
    return { x, y };
  });

  const polylinePoints = coords
    .map((coord) => `${coord.x},${coord.y}`)
    .join(' ');

  const areaPoints = `${padX},${height - padBottom} ${polylinePoints} ${
    padX + innerWidth
  },${height - padBottom}`;

  const maxIndex = data.findIndex((point) => point.value === max);

  return (
    <View onLayout={handleLayout}>
      {width > 0 && (
        <>
          <Svg width={width} height={height}>
            <Polygon points={areaPoints} fill={color} opacity={0.14} />

            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={color}
              strokeWidth={3}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {coords.map((coord, index) => (
              <Circle
                key={data[index].label}
                cx={coord.x}
                cy={coord.y}
                r={index === maxIndex ? 5 : 4}
                fill={index === maxIndex ? color : '#FFF0F4'}
                stroke={color}
                strokeWidth={2.5}
              />
            ))}
          </Svg>

          {maxIndex >= 0 && data[maxIndex].value > 0 && (
            <Text
              style={[
                styles.peakLabel,
                {
                  left: Math.min(
                    Math.max(coords[maxIndex].x - 40, 0),
                    width - 80
                  ),
                  top: Math.max(coords[maxIndex].y - 18, 0),
                },
              ]}
            >
              {formatValue
                ? formatValue(data[maxIndex].value)
                : data[maxIndex].value}
            </Text>
          )}

          <View style={styles.labelsRow}>
            {data.map((point) => (
              <Text key={point.label} style={styles.label}>
                {point.label}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  label: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 10,
  },
  peakLabel: {
    position: 'absolute',
    width: 80,
    textAlign: 'center',
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 10,
  },
});
