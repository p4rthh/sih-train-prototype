import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  ratio: number; // width / height
  children: React.ReactNode;
  style?: ViewStyle;
};

// Fits an aspect-ratio-locked canvas inside the screen's safe-area content box, without ever
// overflowing — the "min(available width, available height * ratio)" behavior CSS object-fit
// gives you for free on <img>, but plain Views don't get automatically.
//
// Two approaches were tried and rejected before this one:
// 1. A View with width:'100%', height:'100%', aspectRatio all set at once is ambiguous on
//    react-native-web — per the Yoga/CSS aspect-ratio algorithm, the aspectRatio-derived
//    dimension can win over the explicit one. On a viewport shape narrower/taller than the
//    target ratio wants, that silently makes the canvas *taller* than its container, and since
//    the parent doesn't clip overflow by default, the extra height overflows past the visible
//    area — this was the "MAYBE LATER cut off" bug.
// 2. Measuring the container via a plain View's onLayout looked like the fix, but onLayout
//    never actually fired at all in this RN-web setup (confirmed by rendering the measured state
//    directly on screen — it stayed `null` through a full page load), so the canvas silently
//    stayed unrendered forever. Not a viewport-shape edge case — total render failure.
// `useSafeAreaFrame()` + `useSafeAreaInsets()` sidestep both: they're reactive hooks (update on
// resize/orientation) that work reliably on web, and combine to the actual usable content box —
// frame minus insets — rather than the raw window, which would ignore notches on native.
export function AspectCanvas({ ratio, children, style }: Props) {
  const frame = useSafeAreaFrame();
  const insets = useSafeAreaInsets();

  const availableWidth = frame.width - insets.left - insets.right;
  const availableHeight = frame.height - insets.top - insets.bottom;

  const widthIfHeightBound = availableHeight * ratio;
  const canvasSize =
    widthIfHeightBound <= availableWidth
      ? { width: widthIfHeightBound, height: availableHeight }
      : { width: availableWidth, height: availableWidth / ratio };

  return (
    <View style={[styles.fill, style]}>
      <View style={[styles.canvas, canvasSize]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  canvas: {
    position: 'relative',
  },
});
