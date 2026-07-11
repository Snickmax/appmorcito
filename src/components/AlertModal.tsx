import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type Props = {
  visible: boolean;
  title?: string;
  message: string;
  buttonLabel?: string;
  onClose: () => void;
};

// Aviso de un solo botón con el estilo de la app (hermano de ConfirmModal),
// reemplazo de los Alert.alert nativos.
export default function AlertModal({
  visible,
  title = 'Aviso',
  message,
  buttonLabel = 'OK',
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>

          <Text style={styles.message}>{message}</Text>

          <Pressable style={styles.button} onPress={onClose}>
            <Text style={styles.buttonText}>{buttonLabel}</Text>
          </Pressable>
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
  button: {
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 13,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 16,
  },
});
