import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

export type LineSeries = {
  label: string;
  color: string;
  points: { label: string; value: number }[];
};

type Props = {
  series: LineSeries[];
  height?: number;
};

export default function MultiLineChart({ series, height = 150 }: Props) {
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  // Todas las series comparten el eje X (mismas etiquetas de mes).
  const labels = series[0]?.points.map((point) => point.label) ?? [];
  const count = labels.length;

  const max = Math.max(
    ...series.flatMap((line) => line.points.map((point) => point.value)),
    1
  );

  const padX = 14;
  const padTop = 14;
  const padBottom = 6;
  const innerWidth = Math.max(width - padX * 2, 1);
  const innerHeight = height - padTop - padBottom;

  const xFor = (index: number) =>
    count > 1
      ? padX + (index / (count - 1)) * innerWidth
      : padX + innerWidth / 2;

  const yFor = (value: number) =>
    padTop + innerHeight - (value / max) * innerHeight;

  return (
    <View>
      <View style={styles.legend}>
        {series.map((line) => (
          <View key={line.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: line.color }]} />
            <Text style={styles.legendText}>{line.label}</Text>
          </View>
        ))}
      </View>

      <View onLayout={handleLayout}>
        {width > 0 && count > 0 && (
          <>
            <Svg width={width} height={height}>
              {series.map((line) => {
                const pts = line.points
                  .map((point, index) => `${xFor(index)},${yFor(point.value)}`)
                  .join(' ');

                return (
                  <React.Fragment key={line.label}>
                    <Polyline
                      points={pts}
                      fill="none"
                      stroke={line.color}
                      strokeWidth={3}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    />
                    {line.points.map((point, index) => (
                      <Circle
                        key={`${line.label}-${point.label}`}
                        cx={xFor(index)}
                        cy={yFor(point.value)}
                        r={3.5}
                        fill="#FFF0F4"
                        stroke={line.color}
                        strokeWidth={2.5}
                      />
                    ))}
                  </React.Fragment>
                );
              })}
            </Svg>

            <View style={styles.labelsRow}>
              {labels.map((label, index) => (
                <Text
                  key={`${label}-${index}`}
                  style={styles.label}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              ))}
            </View>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  legendText: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginTop: 4,
  },
  label: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 9,
  },
});
