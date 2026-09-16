import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BarChart3 } from 'lucide-react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, radius, space, type } from '../theme/tokens';
import { useTrainStream } from '../hooks/useTrainStream';
import type { TrainTabsParamList } from '../navigation/types';

type Props = BottomTabScreenProps<TrainTabsParamList, 'Behavior'>;

// Rebuilt from the Stitch project's train_behavior.html. The 7-day punctuality bar chart in that
// design needs a per-day delay history the API doesn't expose anywhere in ETAResponse — only
// `historical_on_time_pct` (a single rolled-up number) exists. Per the brief's own precedent for
// data the API doesn't return (Frame 35's missing Platform field), this renders that one real
// number and an honest empty state for the chart rather than fabricating 7 days of numbers.
export function BehaviorScreen({ route }: Props) {
  const { trainNo } = route.params;
  const { data } = useTrainStream(trainNo);

  const reliabilityPct = data?.historical_on_time_pct;

  return (
    <ScrollView style={styles.ground} contentContainerStyle={styles.body}>
      <Text style={styles.title}>Train Behavior Analysis</Text>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.trainNo}>{data?.train_no ?? trainNo}</Text>
            <Text style={styles.trainName}>{data?.train_name ?? '—'}</Text>
          </View>
          <View style={styles.reliabilityCol}>
            <Text style={styles.reliabilityLabel}>7-Day Reliability</Text>
            <View style={styles.rowCenter}>
              <Text style={styles.reliabilityValue}>
                {reliabilityPct != null ? `${Math.round(reliabilityPct)}%` : '—'}
              </Text>
              {reliabilityPct != null && (
                <View style={styles.goodPill}>
                  <Text style={styles.goodPillText}>{reliabilityPct >= 80 ? 'Good' : 'Fair'}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Punctuality Pattern</Text>
        <View style={styles.chartEmpty}>
          <BarChart3 size={28} color={colors.maroonMuted} />
          <Text style={styles.chartEmptyText}>
            Day-by-day punctuality history isn't available from the API yet — only the rolled-up
            7-day reliability figure above is. See UI_NOTES.md.
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Insights</Text>
        <View style={styles.insightRow}>
          <View style={styles.insightIcon}>
            <BarChart3 size={18} color={colors.pinkDeep} />
          </View>
          <View style={styles.insightTextCol}>
            <Text style={styles.insightTitle}>Pattern Detected</Text>
            <Text style={styles.insightBody}>
              {data && data.current_delay_min > 0
                ? `This train is currently running ${data.current_delay_min} min late.`
                : 'No delay pattern detected in the current session.'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  ground: {
    flex: 1,
    backgroundColor: colors.pink,
  },
  body: {
    padding: space.md,
    gap: space.md,
    paddingBottom: space.xl,
  },
  title: {
    ...type.h1,
    color: colors.pinkDeep,
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  trainNo: {
    ...type.h2,
    color: colors.maroon,
  },
  trainName: {
    ...type.body,
    fontSize: 13,
    color: colors.maroonMuted,
  },
  reliabilityCol: {
    alignItems: 'flex-end',
  },
  reliabilityLabel: {
    ...type.micro,
    color: colors.maroonMuted,
    marginBottom: 2,
  },
  reliabilityValue: {
    ...type.h2,
    color: colors.onTime,
  },
  goodPill: {
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  goodPillText: {
    ...type.micro,
    color: colors.pinkDeep,
  },
  cardTitle: {
    ...type.h2,
    color: colors.pinkDeep,
  },
  chartEmpty: {
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.lg,
  },
  chartEmptyText: {
    ...type.body,
    fontSize: 12,
    color: colors.maroonMuted,
    textAlign: 'center',
  },
  insightRow: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'flex-start',
  },
  insightIcon: {
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    padding: space.sm,
  },
  insightTextCol: {
    flex: 1,
    gap: 2,
  },
  insightTitle: {
    ...type.body,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.maroon,
  },
  insightBody: {
    ...type.body,
    fontSize: 13,
    color: colors.maroonMuted,
  },
});
