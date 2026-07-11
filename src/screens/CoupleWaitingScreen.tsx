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
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';
import { RootStackParamList } from '../navigation/types';
import HeaderIconButton from '../components/HeaderIconButton';
import AlertModal from '../components/AlertModal';
import ConfirmModal from '../components/ConfirmModal';

type Props = NativeStackScreenProps<RootStackParamList, 'CoupleWaiting'>;

export default function CoupleWaitingScreen({ navigation }: Props) {
  const { coupleState, refreshBootstrap, signOut } = useAuth();
  const [inviteCodeToJoin, setInviteCodeToJoin] = useState('');
  const [joinCoupleName, setJoinCoupleName] = useState('');
  const [alertInfo, setAlertInfo] = useState<{
    title: string;
    message: string;
  } | null>(null);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);

  const handleJoinOtherCouple = async () => {
    if (!inviteCodeToJoin.trim()) {
      setAlertInfo({
        title: 'Falta código',
        message: 'Ingresa el código de invitación.',
      });
      return;
    }

    const { error } = await supabase.rpc('join_couple_by_invite', {
      p_invite_code: inviteCodeToJoin.trim().toUpperCase(),
      p_name: joinCoupleName || null,
    });

    if (error) {
      setAlertInfo({ title: 'Error', message: error.message });
      return;
    }

    await refreshBootstrap();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.topRow}>
        <HeaderIconButton
          icon="settings-outline"
          label="Config."
          onPress={() => navigation.navigate('CoupleSettings')}
        />

        <HeaderIconButton
          icon="log-out-outline"
          label="Salir"
          onPress={() => setSignOutConfirmVisible(true)}
        />
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
      <View style={styles.card}>
        <Text style={styles.title}>Esperando a tu pareja</Text>
        <Text style={styles.subtitle}>
          Comparte este código para que la otra persona se una.
        </Text>

        <View style={styles.codeBox}>
          <Text style={styles.codeLabel}>Código</Text>
          <Text style={styles.codeValue}>{coupleState?.invite_code}</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Apodo de pareja: {coupleState?.couple_name || 'Sin apodo'}
          </Text>
          <Text style={styles.infoText}>
            Inicio relación: {coupleState?.relationship_start_date}
          </Text>
          <Text style={styles.infoText}>
            Miembros activos: {coupleState?.active_members_count}/2
          </Text>
          <Text style={styles.infoText}>
            Rol: {coupleState?.my_role === 'owner' ? 'Owner' : 'Member'}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>O unirme a otra pareja</Text>

        <TextInput
          placeholder="Código de invitación"
          value={inviteCodeToJoin}
          onChangeText={setInviteCodeToJoin}
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

        <Pressable style={styles.primaryButton} onPress={handleJoinOtherCouple}>
          <Text style={styles.primaryButtonText}>Usar este código</Text>
        </Pressable>
      </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <AlertModal
        visible={!!alertInfo}
        title={alertInfo?.title}
        message={alertInfo?.message ?? ''}
        onClose={() => setAlertInfo(null)}
      />

      <ConfirmModal
        visible={signOutConfirmVisible}
        title="Cerrar sesión"
        message="¿Quieres cerrar sesión?"
        confirmLabel="Sí, cerrar sesión"
        cancelLabel="No"
        onConfirm={() => {
          setSignOutConfirmVisible(false);
          void signOut();
        }}
        onCancel={() => setSignOutConfirmVisible(false)}
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
  topRow: {
    position: 'absolute',
    top: 60,
    right: 20,
    flexDirection: 'row',
    gap: 8,
    zIndex: 2,
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
  codeBox: {
    backgroundColor: '#FFE7EE',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  codeLabel: {
    color: '#9E4258',
    fontWeight: '700',
    marginBottom: 4,
  },
  codeValue: {
    color: '#7C3043',
    fontWeight: '900',
    fontSize: 28,
    letterSpacing: 2,
  },
  infoBox: {
    backgroundColor: '#FFE7EE',
    borderRadius: 18,
    padding: 14,
    marginBottom: 18,
    gap: 6,
  },
  infoText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  sectionTitle: {
    color: '#7C3043',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 10,
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
});