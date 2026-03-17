import React from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import CountdownUnitBox from './CountdownUnitBox';
import { CountdownTimeParts } from '../../types/countdown';

type Props = {
  icon: ImageSourcePropType;
  title?: string;
  subtitle?: string;
  dateLabel?: string;
  timeParts?: CountdownTimeParts | null;
  celebrationText?: string;
};

export default function CountdownHeroPanel({
  icon,
  title,
  subtitle,
  dateLabel,
  timeParts,
  celebrationText,
}: Props) {
  return (
    <View style={styles.card}>
      <Image source={icon} resizeMode="contain" style={styles.icon} />

      {!!title && <Text style={styles.title}>{title}</Text>}
      {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

      {celebrationText ? (
        <View style={styles.celebrationBox}>
          <Text style={styles.celebrationText}>{celebrationText}</Text>
        </View>
      ) : timeParts ? (
        <View style={styles.timeRow}>
          <CountdownUnitBox value={timeParts.days} label="Días" />
          <CountdownUnitBox value={timeParts.hours} label="Hrs" />
          <CountdownUnitBox value={timeParts.minutes} label="Min" />
          <CountdownUnitBox value={timeParts.seconds} label="Secs" />
        </View>
      ) : null}

      {!!dateLabel && <Text style={styles.dateLabel}>{dateLabel}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F1E4E4',
    borderRadius: 24,
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  icon: {
    width: 300,
    height: 300,
    alignSelf: 'center',
    marginBottom: 0,
  },
  title: {
    textAlign: 'center',
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    color: '#9E4258',
    fontWeight: '700',
    marginBottom: 10,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    marginTop: 4,
  },
  celebrationBox: {
    backgroundColor: '#D25F6B',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginTop: 4,
  },
  celebrationText: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '900',
    fontSize: 24,
  },
  dateLabel: {
    marginTop: 12,
    textAlign: 'center',
    color: '#7C3043',
    fontWeight: '700',
  },
});