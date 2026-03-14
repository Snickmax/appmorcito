import React, { useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';
import LottieView from 'lottie-react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/types';
import { COLORS } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

const splashHeart = require('../../assets/images/corazon_splash.png');
const appLogo = require('../../assets/images/Appmorcito.png');
const walkingAnimation = require('../../assets/lotties/Walking.json');

const STAY_ON_SPLASH = false;
const WALKING_RATIO = 1920 / 1080;

const BASE_WIDTH = 360;
const BASE_HEIGHT = 780;

const SCENE = {
  stripeHeight: BASE_HEIGHT * 0.16,

  logo: {
    frameWidth: BASE_WIDTH * 0.8,
    frameHeight: BASE_WIDTH * 0.8,
    top: BASE_HEIGHT * 0.2,
    imageWidthFactor: 1024 / 840,
    translateYFactor: 0.403,
  },

  heart: {
    frameWidth: BASE_WIDTH * 0.98,
    frameHeight: BASE_WIDTH * 0.98,
    imageWidthFactor: 2048 / 2010,
    translateYFactor: 0.051,
  },

  walking: {
    width: BASE_WIDTH,
  },
};

export default function SplashScreen({ navigation }: Props) {
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (STAY_ON_SPLASH) return;

    const timer = setTimeout(() => {
      navigation.replace('Home');
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigation]);

  // Hace que toda la escena entre completa en cualquier pantalla
  const scale = Math.min(width / BASE_WIDTH, height / BASE_HEIGHT);

  const sceneWidth = BASE_WIDTH * scale;
  const sceneHeight = BASE_HEIGHT * scale;

  const offsetX = (width - sceneWidth) / 2;
  const offsetY = (height - sceneHeight) / 2;

  const stripeHeight = SCENE.stripeHeight * scale;

  const logoFrameWidth = SCENE.logo.frameWidth * scale;
  const logoFrameHeight = SCENE.logo.frameHeight * scale;
  const logoTop = SCENE.logo.top * scale;

  const heartFrameWidth = SCENE.heart.frameWidth * scale;
  const heartFrameHeight = SCENE.heart.frameHeight * scale;

  const sceneTop = SCENE.logo.top + SCENE.logo.frameHeight + BASE_HEIGHT * 0.03;
  const sceneBottom = SCENE.stripeHeight;
  const sceneInnerHeight = BASE_HEIGHT - sceneTop - sceneBottom;
  const heartTopBase =
    sceneTop + (sceneInnerHeight - SCENE.heart.frameHeight) * 0.42;
  const heartTop = heartTopBase * scale;

  const walkingWidth = SCENE.walking.width * scale;
  const walkingHeight = walkingWidth / WALKING_RATIO;
  const walkingBottom = (SCENE.stripeHeight - BASE_WIDTH * 0.1) * scale;

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.scene,
          {
            width: sceneWidth,
            height: sceneHeight,
            left: offsetX,
            top: offsetY,
          },
        ]}
      >
        <View
          style={[
            styles.logoFrame,
            {
              width: logoFrameWidth,
              height: logoFrameHeight,
              top: logoTop,
            },
          ]}
        >
          <Image
            source={appLogo}
            resizeMode="stretch"
            style={[
              styles.logoImage,
              {
                width: logoFrameWidth * SCENE.logo.imageWidthFactor,
                height: logoFrameWidth * SCENE.logo.imageWidthFactor,
                transform: [
                  {
                    translateY: -(logoFrameWidth * SCENE.logo.translateYFactor),
                  },
                ],
              },
            ]}
          />
        </View>

        <View
          style={[
            styles.heartFrame,
            {
              width: heartFrameWidth,
              height: heartFrameHeight,
              top: heartTop,
            },
          ]}
        >
          <Image
            source={splashHeart}
            resizeMode="stretch"
            style={[
              styles.heartImage,
              {
                width: heartFrameWidth * SCENE.heart.imageWidthFactor,
                height: heartFrameWidth * SCENE.heart.imageWidthFactor,
                transform: [
                  {
                    translateY: -(heartFrameWidth * SCENE.heart.translateYFactor),
                  },
                ],
              },
            ]}
          />
        </View>

        <LottieView
          source={walkingAnimation}
          autoPlay
          loop
          style={[
            styles.walking,
            {
              width: walkingWidth,
              height: walkingHeight,
              bottom: walkingBottom,
            },
          ]}
        />
      </View>

      <View
        style={[
          styles.bottomStripe,
          {
            height: stripeHeight,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.splashBackground,
    overflow: 'hidden',
  },
  scene: {
    position: 'absolute',
  },
  logoFrame: {
    position: 'absolute',
    alignSelf: 'center',
    overflow: 'hidden',
    zIndex: 4,
  },
  logoImage: {
    alignSelf: 'center',
  },
  heartFrame: {
    position: 'absolute',
    alignSelf: 'center',
    overflow: 'hidden',
    zIndex: 1,
  },
  heartImage: {
    alignSelf: 'center',
  },
  bottomStripe: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: COLORS.stripe,
    zIndex: 2,
  },
  walking: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 3,
  },
});