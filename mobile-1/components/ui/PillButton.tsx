import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { colors, radius, shadow, space, type } from '../../theme/tokens';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  style?: ViewStyle;
};

export function PillButton({ label, onPress, variant = 'primary', disabled = false, style }: Props) {
  const isPrimary = variant === 'primary';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      accessibilityRole="button"
      style={[
        styles.base,
        isPrimary ? styles.primary : styles.ghost,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelGhost]}>
        {label.toUpperCase()}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.pill,
    paddingVertical: space.sm + 4,
    paddingHorizontal: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.button,
  },
  primary: {
    backgroundColor: colors.pinkDeep,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.pinkDeep,
    shadowOpacity: 0,
    elevation: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...type.label,
  },
  labelPrimary: {
    color: colors.cream,
  },
  labelGhost: {
    color: colors.pinkDeep,
  },
});
