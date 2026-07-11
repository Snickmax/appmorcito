import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../providers/AuthProvider';
import AlertModal from '../components/AlertModal';

type AlertInfo = {
  title: string;
  message: string;
  onClose?: () => void;
};

type PasswordInputProps = {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
};

function PasswordInput({ placeholder, value, onChangeText }: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <View style={styles.passwordRow}>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!show}
        autoCapitalize="none"
        style={styles.passwordInput}
        placeholderTextColor="#A66B79"
      />

      <Pressable
        onPress={() => setShow((prev) => !prev)}
        hitSlop={10}
        style={styles.eyeButton}
      >
        <Ionicons
          name={show ? 'eye-off' : 'eye'}
          size={22}
          color="#A66B79"
        />
      </Pressable>
    </View>
  );
}

export default function AuthScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [alertInfo, setAlertInfo] = useState<AlertInfo | null>(null);

  const switchMode = () => {
    setMode((prev) => (prev === 'login' ? 'signup' : 'login'));
    setConfirmPassword('');
  };

  const handleSubmit = async () => {
    if (!email || !password) {
      setAlertInfo({
        title: 'Faltan datos',
        message: 'Completa email y contraseña.',
      });
      return;
    }

    if (mode === 'signup') {
      if (!displayName.trim()) {
        setAlertInfo({
          title: 'Falta nombre',
          message: 'Ingresa tu nombre para crear la cuenta.',
        });
        return;
      }

      if (password !== confirmPassword) {
        setAlertInfo({
          title: 'Contraseñas distintas',
          message: 'Las contraseñas no coinciden. Revísalas e intenta de nuevo.',
        });
        return;
      }
    }

    const result =
      mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName.trim());

    if (result.error) {
      setAlertInfo({ title: 'Error', message: result.error });
      return;
    }

    if (mode === 'signup') {
      setAlertInfo({
        title: 'Cuenta creada',
        message:
          'Si tienes confirmación por correo activa en Supabase, revisa tu email antes de iniciar sesión.',
        onClose: () => {
          setMode('login');
          setConfirmPassword('');
        },
      });
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Appmorcito</Text>
            <Text style={styles.subtitle}>
              {mode === 'login' ? 'Inicia sesión' : 'Crea tu cuenta'}
            </Text>

            {mode === 'signup' && (
              <TextInput
                placeholder="Nombre"
                value={displayName}
                onChangeText={setDisplayName}
                style={styles.input}
                placeholderTextColor="#A66B79"
              />
            )}

            <TextInput
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
              placeholderTextColor="#A66B79"
            />

            <PasswordInput
              placeholder="Contraseña"
              value={password}
              onChangeText={setPassword}
            />

            {mode === 'signup' && (
              <PasswordInput
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
            )}

            <Pressable style={styles.primaryButton} onPress={handleSubmit}>
              <Text style={styles.primaryButtonText}>
                {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={switchMode}>
              <Text style={styles.secondaryButtonText}>
                {mode === 'login' ? 'No tengo cuenta' : 'Ya tengo cuenta'}
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertModal
        visible={!!alertInfo}
        title={alertInfo?.title}
        message={alertInfo?.message ?? ''}
        onClose={() => {
          const onClose = alertInfo?.onClose;
          setAlertInfo(null);
          onClose?.();
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFD4E0',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFF0F4',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F3B9C7',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#7C3043',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9E4258',
    marginBottom: 18,
  },
  input: {
    height: 52,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingHorizontal: 14,
    color: '#7C3043',
    marginBottom: 12,
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    backgroundColor: '#FFE7EE',
    borderRadius: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  passwordInput: {
    flex: 1,
    height: '100%',
    color: '#7C3043',
    paddingRight: 8,
  },
  eyeButton: {
    padding: 2,
  },
  primaryButton: {
    marginTop: 6,
    backgroundColor: '#C84B55',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 16,
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
    fontWeight: '800',
  },
});
