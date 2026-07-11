import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  visible: boolean;
  onRequestClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  scrollable?: boolean;
  cardStyle?: StyleProp<ViewStyle>;
};

// Wrapper estándar para modals de formulario: dentro de un Modal de RN en
// Android el adjustResize de la Activity no aplica (el Dialog tiene su propia
// window), así que el teclado tapa los inputs sin este KeyboardAvoidingView.
// behavior="padding" también en Android: "height" está roto con edge-to-edge.
export default function FormModal({
  visible,
  onRequestClose,
  children,
  maxWidth = 360,
  scrollable = true,
  cardStyle,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onRequestClose}
    >
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <View style={styles.backdrop}>
          <View style={[styles.card, { maxWidth }, cardStyle]}>
            {scrollable ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {children}
              </ScrollView>
            ) : (
              children
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(63, 21, 32, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#F3B9C7',
    padding: 20,
  },
});
