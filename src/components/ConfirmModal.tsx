import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  // Si se entrega, el botón de confirmar queda bloqueado hasta marcar el check.
  checkLabel?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  visible,
  title = '¿Seguro?',
  message,
  checkLabel,
  confirmLabel = 'Sí',
  cancelLabel = 'No',
  onConfirm,
  onCancel,
}: Props) {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (visible) {
      setChecked(false);
    }
  }, [visible]);

  const confirmBlocked = !!checkLabel && !checked;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.message}>{message}</Text>

          {!!checkLabel && (
            <Pressable
              style={styles.checkRow}
              onPress={() => setChecked((prev) => !prev)}
            >
              <View style={[styles.checkbox, checked && styles.checkboxOn]}>
                {checked && (
                  <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                )}
              </View>

              <Text style={styles.checkLabel}>{checkLabel}</Text>
            </Pressable>
          )}

          <View style={styles.buttonsRow}>
            <Pressable
              style={[
                styles.confirmButton,
                confirmBlocked && styles.confirmButtonDisabled,
              ]}
              onPress={onConfirm}
              disabled={confirmBlocked}
            >
              <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <Text style={styles.cancelButtonText}>{cancelLabel}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(63, 21, 32, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: '#7C3043',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 10,
  },
  message: {
    color: '#9E4258',
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFE7EE',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 14,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#C84B55',
    backgroundColor: '#FFF0F4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    backgroundColor: '#C84B55',
  },
  checkLabel: {
    flex: 1,
    color: '#7C3043',
    fontWeight: '700',
    fontSize: 13,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.45,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#9E4258',
    fontWeight: '900',
    fontSize: 16,
  },
});
