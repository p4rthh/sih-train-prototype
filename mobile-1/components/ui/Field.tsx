import React from 'react';
import { StyleSheet, TextInput, TextInputProps, View } from 'react-native';
import { colors, radius, space, type } from '../../theme/tokens';

type Props = TextInputProps & {
  icon?: React.ReactNode;
};

export function Field({ icon, style, ...inputProps }: Props) {
  return (
    <View style={styles.wrap}>
      {icon}
      <TextInput
        style={[styles.input, style]}
        placeholderTextColor={colors.maroonMuted}
        {...inputProps}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  input: {
    flex: 1,
    ...type.body,
    color: colors.maroon,
  },
});
