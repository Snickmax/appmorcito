import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { useAuth } from '../providers/AuthProvider';
import { COLORS } from '../theme/colors';
import SplashScene from '../components/SplashScene';

import AuthScreen from '../screens/AuthScreen';
import CoupleSetupScreen from '../screens/CoupleSetupScreen';
import CoupleWaitingScreen from '../screens/CoupleWaitingScreen';
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import CountdownScreen from '../screens/CountdownScreen';
import MemoryGameScreen from '../screens/MemoryGameScreen';
import MemoryStatsScreen from '../screens/MemoryStatsScreen';
import MemoryCropQueueScreen from '../screens/MemoryCropQueueScreen';
import CoupleSettingsScreen from '../screens/CoupleSettingsScreen';
import DatesMapScreen from '../screens/DatesMapScreen';
import DateGalleryScreen from '../screens/DateGalleryScreen';
import DateSpotTimelineScreen from '../screens/DateSpotTimelineScreen';
import ExpensesScreen from '../screens/ExpensesScreen';
import StatsScreen from '../screens/StatsScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

const RETRY_AFTER_MS = 10000;

function LoadingScreen() {
  const { retryInit } = useAuth();
  const [showRetry, setShowRetry] = useState(false);

  useEffect(() => {
    if (showRetry) return;

    const timer = setTimeout(() => setShowRetry(true), RETRY_AFTER_MS);
    return () => clearTimeout(timer);
  }, [showRetry]);

  const handleRetry = () => {
    setShowRetry(false);
    retryInit();
  };

  return (
    <SplashScene>
      {showRetry && (
        <View style={styles.retryCard}>
          <Text style={styles.retryText}>
            Esto está tardando más de lo normal…
          </Text>
          <Pressable style={styles.retryButton} onPress={handleRetry}>
            <Text style={styles.retryButtonText}>Volver a intentar</Text>
          </Pressable>
        </View>
      )}
    </SplashScene>
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
            <Stack.Screen name="Countdown" component={CountdownScreen} />
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
            <Stack.Screen name="DatesMap" component={DatesMapScreen} />
            <Stack.Screen name="DateGallery" component={DateGalleryScreen} />
            <Stack.Screen
              name="DateSpotTimeline"
              component={DateSpotTimelineScreen}
            />
            <Stack.Screen name="Expenses" component={ExpensesScreen} />
            <Stack.Screen name="Stats" component={StatsScreen} />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  retryCard: {
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 18,
    marginHorizontal: 32,
  },
  retryText: {
    color: COLORS.text,
    fontSize: 15,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.stripe,
    borderRadius: 24,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});