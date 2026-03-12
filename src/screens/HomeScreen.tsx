import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { HomeButton } from '../components/HomeButton';
import { HomeHeaderCard } from '../components/HomeHeaderCard';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';

const memoriceIcon = require('../../assets/images/Memorice.png');
const citasIcon = require('../../assets/images/Citas.png');
const cuentaRegresivaIcon = require('../../assets/images/CuentaRegresiva.png');
const estadisticasIcon = require('../../assets/images/Estadisticas.png');

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export function HomeScreen({ navigation }: Props) {
  const { width } = useWindowDimensions();

  const iconSize = width * 0.25;
  const horizontalPadding = width * 0.08;

  const handleFutureAction = (sectionName: string) => {
    Alert.alert('Próximamente', `${sectionName} aún no está implementado.`);
  };

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
        <HomeHeaderCard />

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
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.homeBackground,
  },
  content: {
    gap: 24,
  },
  buttonsContainer: {
    gap: 20,
  },
});