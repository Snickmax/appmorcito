import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList } from './types';
import { SplashScreen } from '../screens/SplashScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { MemoryGameScreen } from '../screens/MemoryGameScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { CoupleSetupScreen } from '../screens/CoupleSetupScreen';
import { CoupleWaitingScreen } from '../screens/CoupleWaitingScreen';
import { useAuth } from '../providers/AuthProvider';
import { COLORS } from '../theme/colors';

const Stack = createNativeStackNavigator<RootStackParamList>();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#C84B55" />
    </View>
  );
}

export function RootNavigator() {
  const { loading, session, coupleState } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Auth" component={AuthScreen} />
      </Stack.Navigator>
    );
  }

  if (!coupleState) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CoupleSetup" component={CoupleSetupScreen} />
      </Stack.Navigator>
    );
  }

  if (coupleState.active_members_count < 2) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="CoupleWaiting" component={CoupleWaitingScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator
      initialRouteName="Splash"
      screenOptions={{
        headerShown: false,
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Splash" component={SplashScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="MemoryGame" component={MemoryGameScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: COLORS.homeBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
});