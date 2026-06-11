import React, { useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

export type BarPoint = {
  label: string;
  value: number;
};

type Props = {
  data: BarPoint[];
  height?: number;
  color?: string;
  formatValue?: (value: number) => string;
};

export default function BarChart({
  data,
  height = 140,
  color = '#C84B55',
  formatValue,
}: Props) {
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const max = Math.max(...data.map((point) => point.value), 1);
  const padTop = 18;
  const padBottom = 4;
  const innerHeight = height - padTop - padBottom;
  const slot = data.length > 0 ? width / data.length : width;
  const barWidth = Math.min(Math.max(slot * 0.55, 10), 48);
  // Con pocas barras los valores caben encima de cada una.
  const showAllValues = data.length <= 6;

  return (
    <View onLayout={handleLayout}>
      {width > 0 && data.length > 0 && (
        <>
          <Svg width={width} height={height}>
            {data.map((point, index) => {
              const barHeight = (point.value / max) * innerHeight;
              const x = slot * index + (slot - barWidth) / 2;
              const y = padTop + innerHeight - barHeight;
              const isMax = point.value === max;

              return (
                <React.Fragment key={point.label}>
                  <Rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 2)}
                    rx={6}
                    fill={color}
                    opacity={isMax ? 1 : 0.65}
                  />

                  {(showAllValues || isMax) && point.value > 0 && (
                    <SvgText
                      x={x + barWidth / 2}
                      y={y - 5}
                      fontSize={9}
                      fontWeight="bold"
                      fill="#7C3043"
                      textAnchor="middle"
                    >
                      {formatValue ? formatValue(point.value) : point.value}
                    </SvgText>
                  )}
                </React.Fragment>
              );
            })}
          </Svg>

          <View style={styles.labelsRow}>
            {data.map((point) => (
              <Text
                key={point.label}
                style={[styles.label, { width: slot }]}
                numberOfLines={1}
              >
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
    marginTop: 4,
  },
  label: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 9,
    textAlign: 'center',
  },
});
