import React, { useMemo, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';

type Props = {
  label: string;
  value: string;
  onChange: (nextValue: string) => void;
};

function parseDateFromYmd(value: string) {
  if (!value) return new Date();

  const [year, month, day] = value.split('-').map(Number);

  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
}

function formatDateToYmd(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDateForUi(value: string) {
  if (!value) return 'Seleccionar fecha';

  const parsed = parseDateFromYmd(value);

  return parsed.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function DateField({ label, value, onChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const currentDate = useMemo(() => parseDateFromYmd(value), [value]);

  const handleChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date
  ) => {
    if (Platform.OS !== 'ios') {
      setShowPicker(false);
    }

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    onChange(formatDateToYmd(selectedDate));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <Pressable
        style={styles.field}
        onPress={() => setShowPicker(true)}
      >
        <Text style={styles.value}>{formatDateForUi(value)}</Text>
      </Pressable>

      {showPicker && (
        <DateTimePicker
          value={currentDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          maximumDate={new Date()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9E4258',
    marginBottom: 8,
  },
  field: {
    minHeight: 52,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  value: {
    color: '#7C3043',
    fontSize: 16,
  },
});