import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../providers/AuthProvider';

export function AuthScreen() {
  const { signIn, signUp } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Faltan datos', 'Completa email y contraseña.');
      return;
    }

    if (mode === 'signup' && !displayName.trim()) {
      Alert.alert('Falta nombre', 'Ingresa tu nombre para crear la cuenta.');
      return;
    }

    const result =
      mode === 'login'
        ? await signIn(email.trim(), password)
        : await signUp(email.trim(), password, displayName.trim());

    if (result.error) {
      Alert.alert('Error', result.error);
      return;
    }

    if (mode === 'signup') {
      Alert.alert(
        'Cuenta creada',
        'Si tienes confirmación por correo activa en Supabase, revisa tu email antes de iniciar sesión.'
      );
      setMode('login');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
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

        <TextInput
          placeholder="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
          placeholderTextColor="#A66B79"
        />

        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => setMode((prev) => (prev === 'login' ? 'signup' : 'login'))}
        >
          <Text style={styles.secondaryButtonText}>
            {mode === 'login'
              ? 'No tengo cuenta'
              : 'Ya tengo cuenta'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFD4E0',
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