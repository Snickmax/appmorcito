import React from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { COLORS } from '../theme/colors';
import { getElapsedTime, pad2 } from '../utils/date';

const heartIcon = require('../../assets/images/corazon.png');
const clockIcon = require('../../assets/images/reloj.png');

type Props = {
  relationshipStartDate: string;
};

export function HomeHeaderCard({ relationshipStartDate }: Props) {
  const { width } = useWindowDimensions();
  const startDate = new Date(`${relationshipStartDate}T00:00:00`);
  const elapsed = getElapsedTime(startDate);

  const iconSize = width * 0.25;
  const topSize = width * 0.3;

  const day = startDate.getDate().toString();
  const monthYear = startDate.toLocaleDateString('es-CL', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.column}>
          <Image
            source={heartIcon}
            resizeMode="contain"
            style={{ width: topSize, height: topSize }}
          />

          <Text style={[styles.bigText, { fontSize: width * 0.06 }]}>
            {day}
          </Text>

          <Text style={[styles.mediumText, { fontSize: width * 0.04 }]}>
            {monthYear}
          </Text>
        </View>

        <View style={[styles.divider, { height: iconSize * 1.6 }]} />

        <View style={styles.column}>
          <Image
            source={clockIcon}
            resizeMode="contain"
            style={{ width: topSize, height: topSize }}
          />

          <Text style={[styles.elapsedMain, { fontSize: width * 0.045 }]}>
            {elapsed.years} Años
          </Text>

          <Text style={[styles.elapsedSub, { fontSize: width * 0.03 }]}>
            {elapsed.months} Meses, {elapsed.days} Días
          </Text>

          <Text style={[styles.elapsedSmall, { fontSize: width * 0.025 }]}>
            Hrs: {pad2(elapsed.hours)} Min: {pad2(elapsed.minutes)} Seg: {pad2(elapsed.seconds)}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 20,
    padding: 16,
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  divider: {
    width: 2,
    backgroundColor: COLORS.divider,
    marginHorizontal: 8,
  },
  bigText: {
    color: COLORS.text,
    fontWeight: '700',
  },
  mediumText: {
    color: COLORS.text,
    textTransform: 'capitalize',
  },
  elapsedMain: {
    color: COLORS.text,
    fontWeight: '700',
  },
  elapsedSub: {
    color: COLORS.text,
    textAlign: 'center',
  },
  elapsedSmall: {
    color: COLORS.text,
    textAlign: 'center',
  },
});