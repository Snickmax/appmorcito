import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { useAuth } from '../providers/AuthProvider';
import { supabase } from '../lib/supabase';
import DateField from '../components/DateField';
import CoupleMembersCard from '../components/CoupleMembersCard';

type Props = NativeStackScreenProps<RootStackParamList, 'CoupleSettings'>;

export default function CoupleSettingsScreen({ navigation }: Props) {
  const { coupleState, coupleMembers, refreshBootstrap } = useAuth();

  const isOwner = coupleState?.my_role === 'owner';

  const me = useMemo(
    () => coupleMembers.find((member) => member.is_me) ?? null,
    [coupleMembers]
  );

  const [myNickname, setMyNickname] = useState('');
  const [relationshipNickname, setRelationshipNickname] = useState('');
  const [relationshipStartDate, setRelationshipStartDate] = useState('');

  useEffect(() => {
    setMyNickname(me?.nickname ?? '');
  }, [me?.nickname]);

  useEffect(() => {
    setRelationshipNickname(coupleState?.couple_name ?? '');
    setRelationshipStartDate(coupleState?.relationship_start_date ?? '');
  }, [coupleState?.couple_name, coupleState?.relationship_start_date]);

  if (!coupleState) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.card}>
          <Text style={styles.title}>Configuración de pareja</Text>
          <Text style={styles.infoText}>No hay una pareja activa.</Text>

          <Pressable
            style={styles.secondaryButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.secondaryButtonText}>Volver</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleSaveMyNickname = async () => {
    const { error } = await supabase.rpc('update_my_active_member_nickname', {
      p_nickname: myNickname || null,
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    await refreshBootstrap();
    Alert.alert('Listo', 'Tu apodo fue actualizado.');
  };

  const handleSaveRelationshipSettings = async () => {
    if (!isOwner) return;

    if (!relationshipStartDate.trim()) {
      Alert.alert('Falta fecha', 'Selecciona la fecha con el calendario.');
      return;
    }

    const { error } = await supabase.rpc('update_my_active_couple_settings', {
      p_name: relationshipNickname || null,
      p_relationship_start_date: relationshipStartDate,
    });

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    await refreshBootstrap();
    Alert.alert('Listo', 'La configuración de la relación fue actualizada.');
  };

  const handleRegenerateCode = () => {
    if (!isOwner) return;

    Alert.alert(
      'Regenerar código',
      'El código actual dejará de ser válido. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Regenerar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc(
              'regenerate_my_active_couple_invite_code'
            );

            if (error) {
              Alert.alert('Error', error.message);
              return;
            }

            await refreshBootstrap();
            Alert.alert('Listo', 'Se generó un nuevo código.');
          },
        },
      ]
    );
  };

  const handleRemoveOther = () => {
    if (!isOwner) return;

    if ((coupleState.active_members_count ?? 0) < 2) {
      Alert.alert('No disponible', 'No hay otra persona activa en la pareja.');
      return;
    }

    Alert.alert(
      'Expulsar a la otra persona',
      'La otra persona perderá acceso a esta pareja actual.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Expulsar',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('remove_other_active_member');

            if (error) {
              Alert.alert('Error', error.message);
              return;
            }

            await refreshBootstrap();
            Alert.alert('Listo', 'La otra persona fue expulsada.');
          },
        },
      ]
    );
  };

  const handleLeave = () => {
    Alert.alert(
      'Salir de la pareja',
      'Dejarás de tener acceso a esta pareja activa.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.rpc('leave_my_couple');

            if (error) {
              Alert.alert('Error', error.message);
              return;
            }

            await refreshBootstrap();
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>Volver</Text>
        </Pressable>

        <View style={styles.card}>
          <Text style={styles.title}>Configuración de pareja</Text>
          <Text style={styles.subtitle}>
            Rol actual: {isOwner ? 'Owner' : 'Member'}
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Código actual: {coupleState.invite_code}
            </Text>
            <Text style={styles.infoText}>
              Miembros activos: {coupleState.active_members_count}/2
            </Text>
          </View>

          <Text style={styles.sectionTitle}>Participantes</Text>
          <CoupleMembersCard members={coupleMembers} />

          <Text style={styles.sectionTitle}>Mi apodo</Text>
          <TextInput
            value={myNickname}
            onChangeText={setMyNickname}
            style={styles.input}
            placeholder="Tu apodo"
            placeholderTextColor="#A66B79"
          />

          <Pressable style={styles.primaryButton} onPress={handleSaveMyNickname}>
            <Text style={styles.primaryButtonText}>Guardar mi apodo</Text>
          </Pressable>

          {isOwner && (
            <>
              <Text style={styles.sectionTitle}>Configuración de la relación</Text>

              <Text style={styles.label}>Apodo de la relación</Text>
              <TextInput
                value={relationshipNickname}
                onChangeText={setRelationshipNickname}
                style={styles.input}
                placeholder="Apodo de la relación"
                placeholderTextColor="#A66B79"
              />

              <DateField
                label="Fecha de inicio"
                value={relationshipStartDate}
                onChange={setRelationshipStartDate}
              />

              <Pressable
                style={styles.primaryButton}
                onPress={handleSaveRelationshipSettings}
              >
                <Text style={styles.primaryButtonText}>
                  Guardar configuración de la relación
                </Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={handleRegenerateCode}
              >
                <Text style={styles.secondaryButtonText}>Regenerar código</Text>
              </Pressable>

              <Pressable
                style={styles.secondaryButton}
                onPress={handleRemoveOther}
              >
                <Text style={styles.secondaryButtonText}>
                  Expulsar a la otra persona
                </Text>
              </Pressable>
            </>
          )}

          <Pressable style={styles.dangerButton} onPress={handleLeave}>
            <Text style={styles.dangerButtonText}>Salir de esta pareja</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFD4E0',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: 'flex-start',
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#FFE7EE',
  },
  backButtonText: {
    color: '#9E4258',
    fontWeight: '700',
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
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#9E4258',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#7C3043',
    marginTop: 18,
    marginBottom: 10,
  },
  infoBox: {
    backgroundColor: '#FFE7EE',
    borderRadius: 18,
    padding: 14,
    marginBottom: 8,
    gap: 6,
  },
  infoText: {
    color: '#9E4258',
    fontWeight: '700',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#9E4258',
    marginBottom: 8,
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
  dangerButton: {
    marginTop: 10,
    backgroundColor: '#8E2E3A',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
});