import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius, space } from '../../theme/tokens';

type Props = {
  children: React.ReactNode;
  /** Wrap children in a cream card body over the pink ground (most screens). */
  card?: boolean;
  style?: ViewStyle;
};

export function Screen({ children, card = false, style }: Props) {
  return (
    <SafeAreaView style={styles.ground} edges={['top', 'left', 'right', 'bottom']}>
      {card ? <View style={[styles.card, style]}>{children}</View> : <View style={[styles.flat, style]}>{children}</View>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ground: {
    flex: 1,
    backgroundColor: colors.pink,
  },
  flat: {
    flex: 1,
  },
  card: {
    flex: 1,
    backgroundColor: colors.cream,
    marginTop: space.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingTop: space.lg,
  },
});
