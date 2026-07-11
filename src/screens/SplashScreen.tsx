import React, { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import SplashScene from '../components/SplashScene';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const STAY_ON_SPLASH = false;

export default function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    if (STAY_ON_SPLASH) return;

    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return <SplashScene />;
}
