import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';

export type DonutSegment = {
  value: number;
  color: string;
  label: string;
};

type Props = {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
  // Cómo mostrar el valor de cada segmento en la leyenda.
  formatValue?: (value: number) => string;
};

export default function DonutChart({
  segments,
  size = 132,
  strokeWidth = 22,
  centerLabel,
  centerSub,
  formatValue,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  let offset = 0;

  return (
    <View style={styles.container}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          <G rotation={-90} originX={size / 2} originY={size / 2}>
            {/* Pista de fondo */}
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#FFE7EE"
              strokeWidth={strokeWidth}
              fill="none"
            />

            {total > 0 &&
              segments.map((segment) => {
                const dash = (segment.value / total) * circumference;
                const circle = (
                  <Circle
                    key={segment.label}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={segment.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${circumference - dash}`}
                    strokeDashoffset={-offset}
                    strokeLinecap="butt"
                    fill="none"
                  />
                );
                offset += dash;
                return circle;
              })}
          </G>
        </Svg>

        <View style={styles.center} pointerEvents="none">
          {!!centerLabel && <Text style={styles.centerLabel}>{centerLabel}</Text>}
          {!!centerSub && <Text style={styles.centerSub}>{centerSub}</Text>}
        </View>
      </View>

      <View style={styles.legend}>
        {segments.map((segment) => {
          const pct = total > 0 ? Math.round((segment.value / total) * 100) : 0;

          return (
            <View key={segment.label} style={styles.legendRow}>
              <View style={[styles.dot, { backgroundColor: segment.color }]} />
              <Text style={styles.legendLabel} numberOfLines={1}>
                {segment.label}
              </Text>
              <Text style={styles.legendValue}>
                {formatValue ? formatValue(segment.value) : segment.value} ·{' '}
                {pct}%
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 16,
  },
  centerSub: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 10,
  },
  legend: {
    flex: 1,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 999,
  },
  legendLabel: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 13,
    flexShrink: 1,
  },
  legendValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 12,
    marginLeft: 'auto',
  },
});
