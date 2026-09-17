import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AlertTriangle, CheckCircle2, MapPin, Train } from 'lucide-react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { colors, radius, space, type } from '../theme/tokens';
import { useTrainInstance } from '../context/TrainInstanceContext';
import type { TrainTabsParamList } from '../navigation/types';

type Props = BottomTabScreenProps<TrainTabsParamList, 'Alerts'>;

export function AlertsScreen({ route }: Props) {
  const { trainNo } = route.params;
  const { data, error, refresh } = useTrainInstance();

  if (!data) {
    return (
      <View style={styles.centered}>
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Unable to Load Live Alerts</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refresh}>
              <Text style={styles.retryButtonText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ActivityIndicator color={colors.pinkDeep} size="large" />
        )}
      </View>
    );
  }

  const isDelayed = data.current_delay_min > 0;

  return (
    <ScrollView style={styles.ground} contentContainerStyle={styles.body}>
      <Text style={styles.title}>Live Alerts</Text>
      <View style={styles.trainChip}>
        <Train size={14} color={colors.pinkDeep} />
        <Text style={styles.trainChipText}>
          Train {data.train_no} - {data.train_name}
        </Text>
      </View>

      <View style={styles.statusCard}>
        <View>
          <Text style={styles.statusLabel}>TRACKING STATUS</Text>
          <Text style={styles.statusValue}>Track My Train</Text>
        </View>
        <View style={styles.activePill}>
          <View style={styles.activeDot} />
          <Text style={styles.activePillText}>ACTIVE</Text>
        </View>
      </View>

      <View style={[styles.alertCard, isDelayed ? styles.alertCardWarn : styles.alertCardGood]}>
        <View style={styles.alertIconCol}>
          {isDelayed ? (
            <AlertTriangle size={20} color={colors.pinkDeep} />
          ) : (
            <CheckCircle2 size={20} color={colors.onTime} />
          )}
        </View>
        <View style={styles.alertBody}>
          <View style={styles.rowBetween}>
            <Text style={styles.alertTitle}>{isDelayed ? `Delayed ${data.current_delay_min}m` : 'On Time'}</Text>
            <Text style={styles.alertTime}>Live</Text>
          </View>
          <Text style={styles.alertText}>
            {isDelayed
              ? `Train ${data.train_no} is running ${data.current_delay_min} min late. Currently at ${data.current_station_name}.`
              : `Train ${data.train_no} is running on time. Currently at ${data.current_station_name}.`}
          </Text>
        </View>
      </View>

      <View style={styles.alertCard}>
        <View style={styles.alertIconCol}>
          <MapPin size={20} color={colors.pinkDeep} />
        </View>
        <View style={styles.alertBody}>
          <View style={styles.rowBetween}>
            <Text style={styles.alertTitle}>Next Stop</Text>
            <Text style={styles.alertTime}>Live</Text>
          </View>
          <Text style={styles.alertText}>
            Approaching {data.next_station_name}. Expected arrival {data.dynamic_eta.point_estimate}.
          </Text>
        </View>
      </View>

      {data.delay_reasons.map((reason, idx) => (
        <View key={idx} style={[styles.alertCard, styles.alertCardWarn]}>
          <View style={styles.alertIconCol}>
            <AlertTriangle size={20} color={colors.pinkDeep} />
          </View>
          <View style={styles.alertBody}>
            <View style={styles.rowBetween}>
              <Text style={styles.alertTitle}>{reason.severity} severity</Text>
              {reason.impact_min > 0 && <Text style={styles.alertTime}>+{reason.impact_min}m</Text>}
            </View>
            <Text style={styles.alertText}>{reason.reason}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
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
    backgroundColor: colors.pink,
  },
  body: {
    padding: space.md,
    gap: space.md,
    paddingBottom: space.xl,
  },
  title: {
    ...type.h1,
    color: colors.maroon,
  },
  trainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.cream,
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    alignSelf: 'flex-start',
  },
  trainChipText: {
    ...type.label,
    letterSpacing: 0,
    color: colors.maroon,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  statusLabel: {
    ...type.micro,
    fontSize: 9,
    color: colors.maroonMuted,
  },
  statusValue: {
    ...type.h2,
    color: colors.maroon,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: 'rgba(0, 105, 41, 0.1)',
    borderRadius: radius.pill,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.onTime,
  },
  activePillText: {
    ...type.micro,
    color: colors.onTime,
  },
  alertCard: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.pinkDeep,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  alertCardGood: {
    borderLeftColor: colors.onTime,
  },
  alertCardWarn: {
    borderLeftColor: colors.delayed,
  },
  alertIconCol: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.pink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertBody: {
    flex: 1,
    gap: 2,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTitle: {
    ...type.h2,
    fontSize: 15,
    color: colors.pinkDeep,
  },
  alertTime: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  alertText: {
    ...type.body,
    fontSize: 13,
    color: colors.maroon,
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
