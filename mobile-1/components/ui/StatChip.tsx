import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, radius, space, type } from '../../theme/tokens';

type Props = {
  label: string;
  value: string;
  style?: ViewStyle;
};

export function StatChip({ label, value, style }: Props) {
  return (
    <View style={[styles.chip, style]}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
    alignItems: 'flex-start',
    gap: space.xs / 2,
  },
  label: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  value: {
    ...type.h2,
    color: colors.crimson,
  },
});
