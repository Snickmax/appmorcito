import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Polyline } from 'react-native-svg';

export type LineSeries = {
  label: string;
  color: string;
  points: { label: string; value: number }[];
};

type Props = {
  series: LineSeries[];
  height?: number;
  formatValue?: (value: number) => string;
};

export default function MultiLineChart({
  series,
  height = 150,
  formatValue,
}: Props) {
  const [width, setWidth] = useState(0);

  // Todas las series comparten el eje X (mismas etiquetas de mes).
  const labels = series[0]?.points.map((point) => point.label) ?? [];
  const count = labels.length;

  // Mes seleccionado: por defecto el último.
  const [selected, setSelected] = useState(count - 1);

  useEffect(() => {
    setSelected(count - 1);
  }, [count]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

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

  const colWidth = width / Math.max(count, 1);
  // Con muchos meses las etiquetas se solapan: mostramos ~8 como máximo,
  // dejando el hueco para no descuadrar el space-between.
  const labelStep = Math.max(1, Math.ceil(count / 8));
  const showTooltip = selected >= 0 && selected < count;
  const tooltipWidth = 150;

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
            {/* Tooltip del mes seleccionado: monto de cada serie. */}
            {showTooltip && (
              <View
                style={[
                  styles.tooltip,
                  {
                    width: tooltipWidth,
                    left: Math.min(
                      Math.max(xFor(selected) - tooltipWidth / 2, 0),
                      Math.max(width - tooltipWidth, 0)
                    ),
                  },
                ]}
              >
                <Text style={styles.tooltipMonth}>{labels[selected]}</Text>
                {series.map((line) => (
                  <View key={line.label} style={styles.tooltipRow}>
                    <View
                      style={[styles.tooltipDot, { backgroundColor: line.color }]}
                    />
                    <Text style={styles.tooltipValue} numberOfLines={1}>
                      {formatValue
                        ? formatValue(line.points[selected]?.value ?? 0)
                        : line.points[selected]?.value ?? 0}
                    </Text>
                  </View>
                ))}
              </View>
            )}

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
                    {line.points.map((point, index) => {
                      const isSel = index === selected;
                      return (
                        <Circle
                          key={`${line.label}-${point.label}`}
                          cx={xFor(index)}
                          cy={yFor(point.value)}
                          r={isSel ? 5.5 : 3.5}
                          fill={isSel ? line.color : '#FFF0F4'}
                          stroke={line.color}
                          strokeWidth={2.5}
                        />
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </Svg>

            {/* Columnas transparentes para tocar cada mes. */}
            <View style={[StyleSheet.absoluteFill, styles.touchRow]}>
              {labels.map((label, index) => (
                <Pressable
                  key={`touch-${label}-${index}`}
                  style={{ width: colWidth, height }}
                  onPress={() => setSelected(index)}
                />
              ))}
            </View>

            <View style={styles.labelsRow}>
              {labels.map((label, index) => (
                <Text
                  key={`${label}-${index}`}
                  style={styles.label}
                  numberOfLines={1}
                >
                  {index % labelStep === 0 ? label : ''}
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
  touchRow: {
    flexDirection: 'row',
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
  tooltip: {
    position: 'absolute',
    top: -6,
    zIndex: 2,
    backgroundColor: '#7C3043',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  tooltipMonth: {
    color: '#FFD9E0',
    fontWeight: '900',
    fontSize: 10,
    marginBottom: 4,
    textAlign: 'center',
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
  },
});
