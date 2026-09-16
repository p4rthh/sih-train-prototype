import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, space, type } from '../../theme/tokens';
import type { StationBoardItem } from '../../types';

type Props = {
  status: StationBoardItem['status'];
  delayMin: number;
};

export function StatusPill({ status, delayMin }: Props) {
  const onTime = status === 'ON_TIME';
  const label = onTime ? 'On Time' : `Delayed ${delayMin}m`;
  return (
    <View style={[styles.pill, { backgroundColor: onTime ? colors.onTime : colors.delayed }]}>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: radius.pill,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    alignSelf: 'flex-start',
  },
  label: {
    ...type.micro,
    color: colors.white,
  },
});
