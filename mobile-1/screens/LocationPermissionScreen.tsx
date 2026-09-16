import React from 'react';
import { Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { AspectCanvas } from '../components/ui/AspectCanvas';
import { colors, radius } from '../theme/tokens';
import type { RootStackParamList } from '../navigation/types';

// Every position below is read off frames/frame 24/Frame 24.svg's own rect coordinates (page
// card, button pill) or measured directly from frames/frame 24/Screenshot ...4.05.17 PM.png (the
// full composed reference render) for the pieces the SVG only stores as raster patterns/outlined
// glyphs — heading text, the two pin illustrations, the connecting line. Percentages are of the
// 1080x1920 canvas so this holds at any screen size. Assets themselves are the real Figma
// exports from FRAMES/frame 24/, copied into assets/illustrations/.
const CANVAS_W = 1080;
const CANVAS_H = 1920;

// react-native-web's <Image> does not derive height from aspectRatio + width the way native RN
// does — it falls back to the source asset's raw intrinsic pixel height and ignores the
// percentage width entirely. Every image below therefore gets an explicit width AND height
// (computed from the asset's own pixel aspect ratio), never a bare `aspectRatio`, matching the
// pattern already proven correct in SplashScreen.tsx.
const PAGE_CARD = { left: 42, top: 46, width: 992, aspectRatio: 992 / 1827 };
const PIN_SMALL = { left: 23.6, top: 268, width: 474, height: 487 };
const PIN_LARGE = { left: 481.5, top: 689.5, width: 550, height: 696 };
// Thin decorative stroke connecting the two pins — its exact SVG path bbox doesn't match the
// exported asset's own crop (the curve dips behind both pins), so this is a visual-match
// placement against the reference screenshot rather than a value read off the vector data.
const CONNECTING_LINE = { left: 90, top: 330, width: 480, height: 480 * (724 / 491) };
const HEADING = { left: 167, top: 749, width: 661, height: 661 * (410 / 690) };
const BUTTON = { left: 158, top: 1529, width: 761, height: 130 };
const BUTTON_LABEL_WIDTH = 420;
const BUTTON_LABEL_HEIGHT = BUTTON_LABEL_WIDTH * (54 / 607);
const MAYBE_LATER = { top: 1710, width: 320, height: 320 * (53 / 450) };

const pct = (n: number, of: number) => `${(n / of) * 100}%` as const;

type Props = NativeStackScreenProps<RootStackParamList, 'LocationPermission'>;

export function LocationPermissionScreen({ navigation }: Props) {
  const requestAndContinue = async () => {
    try {
      await Location.requestForegroundPermissionsAsync();
    } catch {
      // ignore — proceed regardless, permission state is re-checked wherever location is used
    }
    navigation.replace('Home');
  };

  return (
    <SafeAreaView style={styles.ground}>
      <AspectCanvas ratio={CANVAS_W / CANVAS_H}>
        <View
          style={[
            styles.pageCard,
            {
              left: pct(PAGE_CARD.left, CANVAS_W),
              top: pct(PAGE_CARD.top, CANVAS_H),
              width: pct(PAGE_CARD.width, CANVAS_W),
              aspectRatio: PAGE_CARD.aspectRatio,
            },
          ]}
        />
        <Image
          source={require('../assets/illustrations/permission-line.png')}
          style={[
            styles.absoluteImg,
            {
              left: pct(CONNECTING_LINE.left, CANVAS_W),
              top: pct(CONNECTING_LINE.top, CANVAS_H),
              width: pct(CONNECTING_LINE.width, CANVAS_W),
              height: pct(CONNECTING_LINE.height, CANVAS_H),
            },
          ]}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/illustrations/permission-pin-small.png')}
          style={[
            styles.absoluteImg,
            {
              left: pct(PIN_SMALL.left, CANVAS_W),
              top: pct(PIN_SMALL.top, CANVAS_H),
              width: pct(PIN_SMALL.width, CANVAS_W),
              height: pct(PIN_SMALL.height, CANVAS_H),
            },
          ]}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/illustrations/permission-pin-large.png')}
          style={[
            styles.absoluteImg,
            {
              left: pct(PIN_LARGE.left, CANVAS_W),
              top: pct(PIN_LARGE.top, CANVAS_H),
              width: pct(PIN_LARGE.width, CANVAS_W),
              height: pct(PIN_LARGE.height, CANVAS_H),
            },
          ]}
          resizeMode="contain"
        />
        <Image
          source={require('../assets/illustrations/permission-heading.png')}
          style={[
            styles.absoluteImg,
            {
              left: pct(HEADING.left, CANVAS_W),
              top: pct(HEADING.top, CANVAS_H),
              width: pct(HEADING.width, CANVAS_W),
              height: pct(HEADING.height, CANVAS_H),
            },
          ]}
          resizeMode="contain"
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={requestAndContinue}
          style={[
            styles.button,
            {
              left: pct(BUTTON.left, CANVAS_W),
              top: pct(BUTTON.top, CANVAS_H),
              width: pct(BUTTON.width, CANVAS_W),
              height: pct(BUTTON.height, CANVAS_H),
            },
          ]}
        >
          <Image
            source={require('../assets/illustrations/permission-button-label.png')}
            style={{
              width: pct(BUTTON_LABEL_WIDTH, BUTTON.width),
              height: pct(BUTTON_LABEL_HEIGHT, BUTTON.height),
            }}
            resizeMode="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.replace('Home')}
          style={[
            styles.maybeLaterWrap,
            { top: pct(MAYBE_LATER.top, CANVAS_H), height: pct(MAYBE_LATER.height, CANVAS_H) },
          ]}
        >
          <Image
            source={require('../assets/illustrations/permission-maybe-later.png')}
            style={{ width: pct(MAYBE_LATER.width, CANVAS_W), height: '100%' }}
            resizeMode="contain"
          />
        </TouchableOpacity>
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
  pageCard: {
    position: 'absolute',
    backgroundColor: colors.pink,
    borderRadius: radius.md,
  },
  absoluteImg: {
    position: 'absolute',
  },
  button: {
    position: 'absolute',
    backgroundColor: colors.pinkDeep,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maybeLaterWrap: {
    position: 'absolute',
    width: '100%',
    alignItems: 'center',
  },
});
