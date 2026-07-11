import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { formatCLP } from '../../lib/expensesService';
import FormModal from '../FormModal';

type Props = {
  visible: boolean;
  // Quien debe (entrega el dinero) y a quién.
  fromName: string;
  toName: string;
  suggestedAmount: number;
  submitting: boolean;
  onSubmit: (params: { amount: number; note: string | null }) => void;
  onClose: () => void;
};

function parseAmount(value: string): number | null {
  const normalized = value.replace(/\./g, '').replace(',', '.').trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed) || parsed <= 0) return null;
  return parsed;
}

export default function SettleModal({
  visible,
  fromName,
  toName,
  suggestedAmount,
  submitting,
  onSubmit,
  onClose,
}: Props) {
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (!visible) return;

    setAmountText(String(Math.round(suggestedAmount)));
    setNote('');
  }, [visible, suggestedAmount]);

  const amount = parseAmount(amountText);
  const canSubmit = !!amount && !submitting;

  return (
    <FormModal visible={visible} onRequestClose={onClose} maxWidth={340}>
          <Text style={styles.title}>Saldar cuentas</Text>

          <Text style={styles.subtitle}>
            {fromName} le paga a {toName}
          </Text>

          <Text style={styles.hint}>
            Deuda actual: {formatCLP(suggestedAmount)} — puedes editar el monto
            para un saldado parcial.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Monto (CLP)"
            placeholderTextColor="#A66B79"
            value={amountText}
            onChangeText={setAmountText}
            keyboardType="numeric"
          />

          <TextInput
            style={styles.input}
            placeholder="Nota (opcional, ej: transferencia)"
            placeholderTextColor="#A66B79"
            value={note}
            onChangeText={setNote}
            maxLength={120}
          />

          <Pressable
            style={[styles.primaryButton, !canSubmit && styles.disabledButton]}
            onPress={() => {
              if (!amount) return;
              onSubmit({ amount, note: note.trim() || null });
            }}
            disabled={!canSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Registrar saldado {amount ? formatCLP(amount) : ''}
              </Text>
            )}
          </Pressable>

          <Pressable
            style={styles.secondaryButton}
            onPress={onClose}
            disabled={submitting}
          >
            <Text style={styles.secondaryButtonText}>Cancelar</Text>
          </Pressable>
    </FormModal>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#7C3043',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    color: '#7C3043',
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 6,
  },
  hint: {
    color: '#9E4258',
    fontWeight: '700',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 14,
  },
  input: {
    height: 52,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#7C3043',
    marginBottom: 12,
  },
  primaryButton: {
    marginTop: 4,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 10,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#9E4258',
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
});
