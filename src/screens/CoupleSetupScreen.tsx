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
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import DateField from '../components/DateField';

export default function CoupleSetupScreen() {
  const { refreshBootstrap, signOut } = useAuth();

  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [relationshipStartDate, setRelationshipStartDate] = useState('');
  const [coupleName, setCoupleName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [joinCoupleName, setJoinCoupleName] = useState('');

  const handleCreate = async () => {
    if (!relationshipStartDate) {
      Alert.alert('Falta fecha', 'Selecciona la fecha con el calendario.');
      return;
    }

    const { error } = await supabase.rpc('create_couple', {
      p_relationship_start_date: relationshipStartDate,
      p_name: coupleName || null,
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    await refreshBootstrap();
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      Alert.alert('Falta código', 'Ingresa el código de invitación.');
      return;
    }

    const { error } = await supabase.rpc('join_couple_by_invite', {
      p_invite_code: inviteCode.trim().toUpperCase(),
      p_name: joinCoupleName || null,
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    await refreshBootstrap();
  };

  const handleConfirmSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Quieres cerrar sesión?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Sí, cerrar sesión',
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.card}>
        <Text style={styles.title}>Configurar pareja</Text>
        <Text style={styles.subtitle}>
          Crea una pareja nueva o únete con un código.
        </Text>

        <View style={styles.tabRow}>
          <Pressable
            style={[styles.tab, mode === 'create' && styles.tabActive]}
            onPress={() => setMode('create')}
          >
            <Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>
              Crear
            </Text>
          </Pressable>

          <Pressable
            style={[styles.tab, mode === 'join' && styles.tabActive]}
            onPress={() => setMode('join')}
          >
            <Text style={[styles.tabText, mode === 'join' && styles.tabTextActive]}>
              Unirme
            </Text>
          </Pressable>
        </View>

        {mode === 'create' ? (
          <>
            <TextInput
              placeholder="Apodo de pareja (opcional)"
              value={coupleName}
              onChangeText={setCoupleName}
              style={styles.input}
              placeholderTextColor="#A66B79"
            />

            <DateField
              label="Fecha de inicio"
              value={relationshipStartDate}
              onChange={setRelationshipStartDate}
            />

            <Pressable style={styles.primaryButton} onPress={handleCreate}>
              <Text style={styles.primaryButtonText}>Crear pareja</Text>
            </Pressable>
          </>
        ) : (
          <>
            <TextInput
              placeholder="Código de invitación"
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              style={styles.input}
              placeholderTextColor="#A66B79"
            />

            <TextInput
              placeholder="Apodo de pareja (opcional)"
              value={joinCoupleName}
              onChangeText={setJoinCoupleName}
              style={styles.input}
              placeholderTextColor="#A66B79"
            />

            <Pressable style={styles.primaryButton} onPress={handleJoin}>
              <Text style={styles.primaryButtonText}>Unirme a la pareja</Text>
            </Pressable>
          </>
        )}

        <Pressable style={styles.secondaryButton} onPress={handleConfirmSignOut}>
          <Text style={styles.secondaryButtonText}>Cerrar sesión</Text>
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
    fontSize: 28,
    fontWeight: '800',
    color: '#7C3043',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#9E4258',
    marginBottom: 18,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: '#FFE7EE',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: '#C84B55',
  },
  tabText: {
    color: '#9E4258',
    fontWeight: '800',
  },
  tabTextActive: {
    color: '#FFFFFF',
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