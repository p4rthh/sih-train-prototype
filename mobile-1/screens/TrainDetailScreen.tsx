import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Clock } from 'lucide-react-native';
import { colors, radius, space, type } from '../theme/tokens';
import { useTrainInstance } from '../context/TrainInstanceContext';
import type { TrainTabsParamList } from '../navigation/types';
import type { TrainInstanceSummary } from '../types';

function formatInstanceDate(inst: TrainInstanceSummary): string {
  try {
    const parts = inst.start_date.split('-');
    if (parts.length === 3) {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = parseInt(parts[2], 10);
      const month = months[parseInt(parts[1], 10) - 1];
      return `Started ${day} ${month}${inst.is_today ? ' (Today)' : ''}`;
    }
  } catch {}
  return inst.start_date_display || `Started ${inst.start_date}`;
}

type Props = BottomTabScreenProps<TrainTabsParamList, 'TrainView'>;

export function TrainDetailScreen({ route }: Props) {
  const { trainNo } = route.params;
  const { selectedStartDate, setSelectedStartDate, data, error, refresh } = useTrainInstance();
  const [showReasons, setShowReasons] = useState(true);

  return (
    <View style={styles.ground}>
      {!data ? (
        <View style={styles.centered}>
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorTitle}>Unable to Load Live Telemetry</Text>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={refresh}>
                <Text style={styles.retryButtonText}>Retry Connection</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ActivityIndicator color={colors.pinkDeep} size="large" />
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <Text style={styles.trainNo}>TRAIN #{data.train_no}</Text>
              {data.current_delay_min > 0 && (
                <View style={styles.delayPill}>
                  <View style={styles.pulseDot} />
                  <Text style={styles.delayPillText}>Delayed by {data.current_delay_min}m</Text>
                </View>
              )}
            </View>
            <Text style={styles.trainName}>{data.train_name}</Text>
            <View style={styles.statRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>{(data.speed_kmh ?? 0) > 0 ? 'DEPARTED' : 'AT STATION'}</Text>
                <Text style={styles.statValue}>{data.current_station_name || '—'}</Text>
                <Text style={styles.statSub}>{data.current_station_code}</Text>
              </View>
              <View style={[styles.statCol, styles.statColBorder]}>
                <Text style={styles.statLabel}>NEXT STOP</Text>
                <Text style={styles.statValue}>{data.next_station_name || '—'}</Text>
                <Text style={styles.statSub}>{data.next_station_code}</Text>
              </View>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>LIVE SPEED</Text>
                <Text style={styles.statValueLg}>{Math.round(data.speed_kmh)}</Text>
                <Text style={styles.statSub}>km/hr</Text>
              </View>
            </View>
            {data.live_position_desc ? (
              <View style={styles.liveDescWrap}>
                <View style={styles.pulseDotSm} />
                <Text style={styles.liveDescText} numberOfLines={2}>
                  {data.live_position_desc}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Simple Instance Switcher */}
          {data.active_instances && data.active_instances.length > 1 && (
            <View style={styles.instanceSwitchBar}>
              {data.active_instances.map((inst) => {
                const isSelected = selectedStartDate
                  ? inst.start_date === selectedStartDate
                  : inst.start_date === data.start_date;
                return (
                  <TouchableOpacity
                    key={inst.instance_id}
                    style={[
                      styles.instanceTab,
                      isSelected && styles.instanceTabActive,
                    ]}
                    onPress={() => setSelectedStartDate(inst.start_date)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.instanceTabText,
                        isSelected && styles.instanceTabTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {formatInstanceDate(inst)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          <View style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={styles.rowCenter}>
                <Clock size={16} color={colors.pinkDeep} />
                <Text style={styles.sectionLabel}>ARRIVAL WINDOW</Text>
              </View>
              <View style={styles.platformPill}>
                <Text style={styles.platformPillText}>Platform —</Text>
              </View>
            </View>
            <View style={[styles.rowBetween, { marginTop: space.xs }]}>
              <Text style={styles.arrivalWindow}>
                {data.dynamic_eta.confidence_90.lower} <Text style={styles.arrivalDash}>–</Text> {data.dynamic_eta.confidence_90.upper}
              </Text>
              <View style={styles.confidencePill}>
                <View style={styles.confidenceDot} />
                <Text style={styles.confidencePillText}>90% Confidence</Text>
              </View>
            </View>

            <View style={styles.sliderTrackWrap}>
              <View style={styles.sliderTrack}>
                <View style={styles.sliderActive} />
              </View>
            </View>

            <View style={styles.milestoneRow}>
              <View style={styles.milestoneCol}>
                <Text style={styles.milestoneLabel}>Earliest</Text>
                <Text style={styles.milestoneValue}>{data.dynamic_eta.confidence_90.lower}</Text>
              </View>
              <View style={[styles.milestoneCol, styles.milestoneColActive]}>
                <Text style={styles.milestoneLabelActive}>Most Probable</Text>
                <Text style={styles.milestoneValueActive}>{data.dynamic_eta.point_estimate}</Text>
              </View>
              <View style={styles.milestoneCol}>
                <Text style={styles.milestoneLabel}>Latest</Text>
                <Text style={styles.milestoneValue}>{data.dynamic_eta.confidence_90.upper}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <View style={styles.rowCenter}>
                <Text style={styles.summaryLabel}>Most Probable:</Text>
                <Text style={styles.summaryValue}>{data.dynamic_eta.point_estimate}</Text>
              </View>
              {data.forecasted_delay_min > 0 && (
                <View style={styles.delayPillSm}>
                  <Text style={styles.delayPillSmText}>+{data.forecasted_delay_min}m delay expected</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.card}>
            <TouchableOpacity style={styles.reasonHeader} onPress={() => setShowReasons((v) => !v)}>
              <Text style={styles.reasonHeaderText}>WHY IS THIS TRAIN DELAYED?</Text>
            </TouchableOpacity>
            {showReasons && (
              <View style={styles.reasonList}>
                {data.delay_reasons.length === 0 ? (
                  <Text style={styles.reasonEmpty}>No delay factors reported.</Text>
                ) : (
                  data.delay_reasons.map((r, idx) => (
                    <View key={idx}>
                      {idx > 0 && <View style={styles.reasonDivider} />}
                      <Text style={styles.reasonTitle}>{r.reason}</Text>
                      <Text style={styles.reasonSub}>
                        {r.severity} severity{r.impact_min > 0 ? ` · +${r.impact_min}m impact` : ''}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ground: {
    flex: 1,
    backgroundColor: colors.pink,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: space.md,
    gap: space.sm + 4,
    paddingBottom: space.xl,
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  trainNo: {
    ...type.label,
    color: colors.pinkDeep,
  },
  delayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.delayed,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.white,
  },
  delayPillText: {
    ...type.micro,
    color: colors.white,
  },
  trainName: {
    ...type.h1,
    color: colors.pinkDeep,
    marginTop: space.xs,
    marginBottom: space.sm,
  },
  statRow: {
    flexDirection: 'row',
    backgroundColor: colors.pink,
    borderRadius: radius.md,
    paddingVertical: space.sm,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statColBorder: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
  },
  statLabel: {
    ...type.micro,
    fontSize: 8.5,
    color: colors.maroonMuted,
  },
  statValue: {
    ...type.label,
    letterSpacing: 0,
    color: colors.pinkDeep,
  },
  statValueLg: {
    ...type.h2,
    color: colors.pinkDeep,
  },
  statSub: {
    ...type.micro,
    fontSize: 9,
    color: colors.maroonMuted,
  },
  sectionLabel: {
    ...type.label,
    color: colors.pinkDeep,
  },
  platformPill: {
    backgroundColor: 'rgba(248, 203, 200, 0.6)',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.line,
  },
  platformPillText: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  arrivalWindow: {
    ...type.h1,
    fontSize: 26,
    color: colors.pinkDeep,
  },
  arrivalDash: {
    color: colors.maroonMuted,
  },
  confidencePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.confidenceBg,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderWidth: 1,
    borderColor: colors.confidence,
  },
  confidenceDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.confidence,
  },
  confidencePillText: {
    ...type.micro,
    color: colors.confidence,
  },
  sliderTrackWrap: {
    marginTop: space.md,
    marginBottom: space.sm,
  },
  sliderTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(245, 200, 200, 0.8)',
    overflow: 'hidden',
  },
  sliderActive: {
    position: 'absolute',
    left: '23%',
    right: '30%',
    height: '100%',
    backgroundColor: colors.pinkDeep,
    borderRadius: radius.pill,
  },
  milestoneRow: {
    flexDirection: 'row',
    gap: space.xs,
    backgroundColor: 'rgba(248, 203, 200, 0.5)',
    borderRadius: radius.md,
    padding: space.xs,
  },
  milestoneCol: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.xs,
    borderRadius: radius.sm,
  },
  milestoneColActive: {
    backgroundColor: colors.cream,
    borderWidth: 1,
    borderColor: 'rgba(230, 57, 110, 0.25)',
  },
  milestoneLabel: {
    ...type.micro,
    fontSize: 9,
    color: colors.maroonMuted,
  },
  milestoneValue: {
    ...type.label,
    letterSpacing: 0,
    color: colors.ink,
  },
  milestoneLabelActive: {
    ...type.micro,
    fontSize: 9,
    color: colors.pinkDeep,
  },
  milestoneValueActive: {
    ...type.h2,
    color: colors.pinkDeep,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.sm,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  summaryLabel: {
    ...type.micro,
    color: colors.pinkDeep,
  },
  summaryValue: {
    ...type.label,
    letterSpacing: 0,
    color: colors.pinkDeep,
  },
  delayPillSm: {
    backgroundColor: colors.delayed,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  delayPillSmText: {
    ...type.micro,
    fontSize: 9,
    color: colors.white,
  },
  reasonHeader: {
    backgroundColor: colors.pink,
    borderRadius: radius.md,
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  reasonHeaderText: {
    ...type.label,
    color: colors.pinkDeep,
    textAlign: 'center',
  },
  reasonList: {
    marginTop: space.sm,
    gap: space.sm,
  },
  reasonEmpty: {
    ...type.body,
    color: colors.maroonMuted,
  },
  reasonDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginBottom: space.sm,
  },
  reasonTitle: {
    ...type.body,
    fontSize: 13,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.ink,
  },
  reasonSub: {
    ...type.micro,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  liveDescWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.sm,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  pulseDotSm: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.pinkDeep,
  },
  liveDescText: {
    ...type.micro,
    fontSize: 10,
    color: colors.inkMuted,
    flex: 1,
  },
  instanceSwitchBar: {
    flexDirection: 'row',
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
    padding: space.xs,
    borderWidth: 1,
    borderColor: colors.line,
  },
  instanceTab: {
    flex: 1,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  instanceTabActive: {
    backgroundColor: colors.pinkDeep,
  },
  instanceTabText: {
    ...type.label,
    fontSize: 12,
    letterSpacing: 0,
    color: colors.maroonMuted,
  },
  instanceTabTextActive: {
    color: colors.white,
  },
  errorContainer: {
    alignItems: 'center',
    paddingHorizontal: space.lg,
  },
  errorTitle: {
    ...type.h2,
    fontSize: 16,
    color: colors.ink,
    marginBottom: space.xs,
  },
  errorText: {
    ...type.body,
    fontSize: 13,
    color: colors.inkMuted,
    textAlign: 'center',
    marginBottom: space.md,
  },
  retryButton: {
    backgroundColor: colors.pinkDeep,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  retryButtonText: {
    ...type.label,
    color: colors.white,
  },
});
