import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, space, type } from '../../theme/tokens';

type Props<T extends string> = {
  options: { key: T; label: string }[];
  value: T;
  onChange: (key: T) => void;
};

export function SegmentedTabs<T extends string>({ options, value, onChange }: Props<T>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[styles.pill, active && styles.pillActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    padding: space.xs,
    gap: space.xs,
  },
  pill: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: space.sm,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: colors.pinkDeep,
  },
  label: {
    ...type.label,
    color: colors.crimson,
    letterSpacing: 0.4,
  },
  labelActive: {
    color: colors.cream,
  },
});
