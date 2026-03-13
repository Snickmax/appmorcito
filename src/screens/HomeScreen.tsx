import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeButton } from '../components/HomeButton';
import { HomeHeaderCard } from '../components/HomeHeaderCard';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';
import { supabase } from '../lib/supabase';
import { useAuth } from '../providers/AuthProvider';

const memoriceIcon = require('../../assets/images/Memorice.png');
const citasIcon = require('../../assets/images/Citas.png');
const cuentaRegresivaIcon = require('../../assets/images/CuentaRegresiva.png');
const estadisticasIcon = require('../../assets/images/Estadisticas.png');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

type CoupleData = {
  id: string;
  relationship_start_date: string;
  name: string | null;
};

export function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const { coupleState, profile, signOut } = useAuth();
  const activeCoupleId = coupleState?.couple_id ?? null;

  const [couple, setCouple] = useState<CoupleData | null>(null);
  const [loading, setLoading] = useState(true);

  const iconSize = width * 0.25;
  const horizontalPadding = width * 0.08;

  useEffect(() => {
    const loadHome = async () => {
      if (!activeCoupleId) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('couples')
        .select('id, relationship_start_date, name')
        .eq('id', activeCoupleId)
        .single();

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        setCouple(data);
      }

      setLoading(false);
    };

    loadHome();
  }, [activeCoupleId]);

  const handleFutureAction = (sectionName: string) => {
    Alert.alert('Próximamente', `${sectionName} aún no está implementado.`);
  };

  if (loading || !couple) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <ActivityIndicator size="large" color="#C84B55" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 24,
            paddingBottom: 32,
            paddingHorizontal: horizontalPadding,
          },
        ]}
      >
        <View style={styles.topRow}>
          <Text style={styles.welcome}>
            Hola{profile?.display_name ? `, ${profile.display_name}` : ''}
          </Text>
          <Text style={styles.signOut} onPress={signOut}>
            Salir
          </Text>
        </View>

        <HomeHeaderCard relationshipStartDate={couple.relationship_start_date} />

        <View style={styles.buttonsContainer}>
          <HomeButton
            icon={memoriceIcon}
            label="Memorice"
            iconSize={iconSize}
            onPress={() => navigation.navigate('MemoryGame')}
          />

          <HomeButton
            icon={citasIcon}
            label="Citas"
            iconSize={iconSize}
            onPress={() => handleFutureAction('Citas')}
          />

          <HomeButton
            icon={cuentaRegresivaIcon}
            label="Cuenta regresiva"
            iconSize={iconSize}
            onPress={() => handleFutureAction('Cuenta regresiva')}
          />

          <HomeButton
            icon={estadisticasIcon}
            label="Estadística"
            iconSize={iconSize}
            onPress={() => handleFutureAction('Estadística')}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingSafeArea: {
    flex: 1,
    backgroundColor: COLORS.homeBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.homeBackground,
  },
  content: {
    gap: 24,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  welcome: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7C3043',
  },
  signOut: {
    color: '#9E4258',
    fontWeight: '800',
  },
  buttonsContainer: {
    gap: 20,
  },
});