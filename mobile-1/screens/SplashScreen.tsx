import React, { useEffect } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { AspectCanvas } from '../components/ui/AspectCanvas';
import { colors, type } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

// Exact placement lifted from frames/frame 3/Frame 3.svg's own path/rect coordinates on its
// 1080x1920 canvas — the card path bounding box is (118, 375, 844, 1172), i.e. exactly
// assets/illustrations/splash-card.png's own pixel dimensions (844x1172), and the loco sits in
// a <rect x="50" y="779" width="912" height="631" fill="url(#pattern...)"/> that is exactly
// assets/illustrations/splash-loco.png's own pixel dimensions (912x631). Everything below is
// those numbers divided by the 1080x1920 canvas, kept as percentages so the layout matches
// regardless of the rendered screen size.
const CANVAS_W = 1080;
const CANVAS_H = 1920;
const CARD = { x: 118, y: 375, w: 844, h: 1172 };
const LOCO = { x: 50, y: 779, w: 912, h: 631 };
const WORDMARK_TOP = 730;

const pct = (n: number, of: number) => `${(n / of) * 100}%` as const;

type Props = NativeStackScreenProps<RootStackParamList, 'Splash'>;

export function SplashScreen({ navigation }: Props) {
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      // Real permission check, not just a timer — if the user already granted location on a
      // previous launch, there's no reason to show the ask-permission screen again. Only route
      // there when the OS says it's still undetermined or was denied.
      let alreadyGranted = false;
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        alreadyGranted = status === Location.PermissionStatus.GRANTED;
      } catch {
        // ignore — fall through to the permission screen, same as an undetermined status
      }
      if (cancelled) return;
      navigation.replace(alreadyGranted ? 'Home' : 'LocationPermission');
    }, 5000);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [navigation]);

  return (
    <SafeAreaView style={styles.ground}>
      <AspectCanvas ratio={CANVAS_W / CANVAS_H}>
        <Image
          source={require('../assets/illustrations/splash-card.png')}
          style={[
            styles.card,
            {
              top: pct(CARD.y, CANVAS_H),
              left: pct(CARD.x, CANVAS_W),
              width: pct(CARD.w, CANVAS_W),
              height: pct(CARD.h, CANVAS_H),
            },
          ]}
          resizeMode="contain"
        />
        <View
          style={[
            styles.wordmarkWrap,
            { top: pct(WORDMARK_TOP, CANVAS_H), left: pct(CARD.x, CANVAS_W), width: pct(CARD.w, CANVAS_W) },
          ]}
        >
          <Text style={styles.wordmark}>navarail</Text>
        </View>
        <Image
          source={require('../assets/illustrations/splash-loco.png')}
          style={[
            styles.loco,
            {
              top: pct(LOCO.y, CANVAS_H),
              left: pct(LOCO.x, CANVAS_W),
              width: pct(LOCO.w, CANVAS_W),
              height: pct(LOCO.h, CANVAS_H),
            },
          ]}
          resizeMode="contain"
        />
      </AspectCanvas>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ground: {
    flex: 1,
    backgroundColor: colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
  },
  loco: {
    position: 'absolute',
  },
  wordmarkWrap: {
    position: 'absolute',
    alignItems: 'center',
  },
  wordmark: {
    ...type.display,
    fontSize: 65,
    lineHeight: 46,
    color: colors.cream,
  },
});
