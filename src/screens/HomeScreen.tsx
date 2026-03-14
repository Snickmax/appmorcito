import React from 'react';
import {
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
import HeaderIconButton from '../components/HeaderIconButton';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';
import { useAuth } from '../providers/AuthProvider';

const memoriceIcon = require('../../assets/images/Memorice.png');
const citasIcon = require('../../assets/images/Citas.png');
const cuentaRegresivaIcon = require('../../assets/images/CuentaRegresiva.png');
const estadisticasIcon = require('../../assets/images/Estadisticas.png');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();
  const { coupleState, coupleMembers, signOut } = useAuth();

  const iconSize = width * 0.25;
  const horizontalPadding = width * 0.08;

  const handleFutureAction = (sectionName: string) => {
    Alert.alert('Próximamente', `${sectionName} aún no está implementado.`);
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

  if (!coupleState) {
    return (
      <SafeAreaView style={styles.loadingSafeArea}>
        <Text style={styles.emptyText}>No hay una pareja activa cargada.</Text>
      </SafeAreaView>
    );
  }

  const me = coupleMembers.find((member) => member.is_me);
  const homeDisplayName =
    me?.nickname?.trim() || me?.display_name?.trim() || 'mi amorcito';

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
          <Text style={styles.welcome}>Hola, {homeDisplayName}</Text>

          <View style={styles.topActions}>
            <HeaderIconButton
              icon="settings-outline"
              label="Config."
              onPress={() => navigation.navigate('CoupleSettings')}
            />

            <HeaderIconButton
              icon="log-out-outline"
              label="Salir"
              onPress={handleConfirmSignOut}
            />
          </View>
        </View>

        <HomeHeaderCard
          relationshipStartDate={coupleState.relationship_start_date}
        />

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
            label="Estadísticas"
            iconSize={iconSize}
            onPress={() => handleFutureAction('Estadísticas')}
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
    padding: 24,
  },
  emptyText: {
    color: '#7C3043',
    fontWeight: '700',
    textAlign: 'center',
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
    gap: 12,
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  welcome: {
    fontSize: 20,
    fontWeight: '800',
    color: '#7C3043',
    flex: 1,
  },
  buttonsContainer: {
    gap: 20,
  },
});