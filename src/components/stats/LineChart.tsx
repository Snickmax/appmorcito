import React, { useEffect, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
  // Punto seleccionado: por defecto el último (mes más reciente).
  const [selected, setSelected] = useState(data.length - 1);

  useEffect(() => {
    setSelected(data.length - 1);
  }, [data.length]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const max = Math.max(...data.map((point) => point.value), 1);
  const padX = 12;
  const padTop = 22;
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

  const colWidth = width / Math.max(data.length, 1);
  // Con muchos puntos las etiquetas se solapan: mostramos ~8 como máximo,
  // dejando el hueco para no descuadrar el space-between.
  const labelStep = Math.max(1, Math.ceil(data.length / 8));
  const selectedCoord =
    selected >= 0 && selected < coords.length ? coords[selected] : null;
  const tooltipWidth = 110;

  return (
    <View onLayout={handleLayout}>
      {width > 0 && (
        <>
          {/* Tooltip del punto seleccionado, con el monto. */}
          {selectedCoord && (
            <View
              style={[
                styles.tooltip,
                {
                  width: tooltipWidth,
                  left: Math.min(
                    Math.max(selectedCoord.x - tooltipWidth / 2, 0),
                    Math.max(width - tooltipWidth, 0)
                  ),
                },
              ]}
            >
              <Text style={styles.tooltipText} numberOfLines={1}>
                {data[selected].label} ·{' '}
                {formatValue
                  ? formatValue(data[selected].value)
                  : data[selected].value}
              </Text>
            </View>
          )}

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

            {coords.map((coord, index) => {
              const isSel = index === selected;
              return (
                <Circle
                  key={data[index].label}
                  cx={coord.x}
                  cy={coord.y}
                  r={isSel ? 6 : 4}
                  fill={isSel ? color : '#FFF0F4'}
                  stroke={color}
                  strokeWidth={2.5}
                />
              );
            })}
          </Svg>

          {/* Columnas transparentes para tocar cada mes. */}
          <View style={[StyleSheet.absoluteFill, styles.touchRow]}>
            {data.map((point, index) => (
              <Pressable
                key={`touch-${point.label}`}
                style={{ width: colWidth, height }}
                onPress={() => setSelected(index)}
              />
            ))}
          </View>

          <View style={styles.labelsRow}>
            {data.map((point, index) => (
              <Text
                key={`${point.label}-${index}`}
                style={styles.label}
                numberOfLines={1}
              >
                {index % labelStep === 0 ? point.label : ''}
              </Text>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 10,
  },
  tooltip: {
    position: 'absolute',
    top: 0,
    zIndex: 2,
    backgroundColor: '#7C3043',
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  tooltipText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    textAlign: 'center',
  },
});
