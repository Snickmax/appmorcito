import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../providers/AuthProvider';
import { COLORS } from '../theme/colors';

import AuthScreen from '../screens/AuthScreen';
import CoupleSetupScreen from '../screens/CoupleSetupScreen';
import CoupleWaitingScreen from '../screens/CoupleWaitingScreen';
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import MemoryGameScreen from '../screens/MemoryGameScreen';
import MemoryStatsScreen from '../screens/MemoryStatsScreen';
import MemoryCropQueueScreen from '../screens/MemoryCropQueueScreen';
import CoupleSettingsScreen from '../screens/CoupleSettingsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#C84B55" />
    </View>
  );
}

export default function RootNavigator() {
  const { session, loading, coupleState } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  const hasSession = !!session;
  const hasCouple = !!coupleState;
  const hasCompleteCouple =
    !!coupleState && coupleState.active_members_count >= 2;

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasSession ? (
          <Stack.Group navigationKey="guest">
            <Stack.Screen name="Auth" component={AuthScreen} />
          </Stack.Group>
        ) : !hasCouple ? (
          <Stack.Group navigationKey="setup">
            <Stack.Screen name="CoupleSetup" component={CoupleSetupScreen} />
          </Stack.Group>
        ) : !hasCompleteCouple ? (
          <Stack.Group navigationKey={`waiting-${coupleState.couple_id}`}>
            <Stack.Screen
              name="CoupleWaiting"
              component={CoupleWaitingScreen}
            />
            <Stack.Screen
              name="CoupleSettings"
              component={CoupleSettingsScreen}
            />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey={`paired-${coupleState.couple_id}`}>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="MemoryGame" component={MemoryGameScreen} />
            <Stack.Screen name="MemoryStats" component={MemoryStatsScreen} />
            <Stack.Screen
              name="MemoryCropQueue"
              component={MemoryCropQueueScreen}
            />
            <Stack.Screen
              name="CoupleSettings"
              component={CoupleSettingsScreen}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.homeBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});