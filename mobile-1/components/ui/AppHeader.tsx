import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, Menu } from 'lucide-react-native';
import { colors, space, type } from '../../theme/tokens';

type Props = {
  onMenuPress?: () => void;
  /** Renders a back chevron on the left instead of the wordmark's leading space. Screens pushed
   * on top of Home (all of them except Home itself) need this — headerShown is false on the
   * native-stack navigator everywhere, so this is the only back affordance on web. */
  onBackPress?: () => void;
};

export function AppHeader({ onMenuPress, onBackPress }: Props) {
  return (
    <View style={styles.bar}>
      <View style={styles.leading}>
        {onBackPress && (
          <TouchableOpacity
            onPress={onBackPress}
            hitSlop={{ top: space.sm, bottom: space.sm, left: space.sm, right: space.sm }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.backBtn}
          >
            <ArrowLeft color={colors.cream} size={22} />
          </TouchableOpacity>
        )}
        <Text style={styles.wordmark}>navarail</Text>
      </View>
      {onMenuPress && (
        <TouchableOpacity
          onPress={onMenuPress}
          hitSlop={{ top: space.sm, bottom: space.sm, left: space.sm, right: space.sm }}
          accessibilityRole="button"
          accessibilityLabel="Open menu"
        >
          <Menu color={colors.cream} size={24} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    backgroundColor: colors.pinkDeep,
  },
  leading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  backBtn: {
    marginRight: space.xs,
  },
  wordmark: {
    ...type.display,
    fontSize: 30,
    lineHeight: 36,
    color: colors.cream,
  },
});
