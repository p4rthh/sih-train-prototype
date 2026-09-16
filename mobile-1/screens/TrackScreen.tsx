import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { Check, Map as MapIcon, MapPin, Navigation, X, Zap } from 'lucide-react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { LiveMap } from '../components/ui/LiveMap';
import { colors, radius, space, type } from '../theme/tokens';
import { useTrainStream } from '../hooks/useTrainStream';
import type { RouteStop } from '../types';
import type { TrainTabsParamList } from '../navigation/types';

type Props = BottomTabScreenProps<TrainTabsParamList, 'Track'>;

const STATUS_LABEL: Record<RouteStop['status'], string> = {
  departed: 'Departed',
  current: 'At Platform',
  upcoming: 'Scheduled',
};

const formatClock = (timeStr?: string): string => {
  if (!timeStr || timeStr === 'None' || timeStr === 'START' || timeStr === 'TERMINAL' || timeStr === '—') {
    return '—';
  }
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeStr;
};

const calcActualTime = (schedStr?: string, delayMin?: number): string => {
  if (!schedStr || schedStr === 'None' || schedStr === 'START' || schedStr === 'TERMINAL' || schedStr === '—') {
    return '—';
  }
  const parts = schedStr.split(':');
  if (parts.length < 2) return schedStr;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h) || isNaN(m)) return schedStr;
  const delay = Math.round(delayMin ?? 0);
  const totalMins = (h * 60 + m + delay + 24 * 60) % (24 * 60);
  const newH = Math.floor(totalMins / 60);
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
};

export function TrackScreen({ route }: Props) {
  const { trainNo } = route.params;
  const { data } = useTrainStream(trainNo);
  const [tracking, setTracking] = useState(true);
  const [showMap, setShowMap] = useState(false);

  if (!data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.pinkDeep} size="large" />
      </View>
    );
  }

  if (showMap) {
    return (
      <View style={styles.mapGround}>
        <LiveMap
          lat={data.lat}
          lon={data.lon}
          speedKmh={data.speed_kmh}
          trainNo={data.train_no}
          trainName={data.train_name}
          stops={data.route_progress}
        />
        <View style={styles.mapHeader}>
          <Text style={styles.mapHeaderTitle}>Live Track View</Text>
          <TouchableOpacity onPress={() => setShowMap(false)} style={styles.mapCloseBtn}>
            <X size={20} color={colors.pinkDeep} />
          </TouchableOpacity>
        </View>
        <View style={styles.mapStatusCard}>
          <View style={styles.rowCenter}>
            <View style={styles.activeDot} />
            <Text style={styles.mapStatusLabel}>GPS TRACKING ACTIVE</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.mapStatusSub}>
                Train {data.train_no} · {data.train_name}
              </Text>
              <Text style={styles.mapStatusMain}>{data.live_position_desc || data.current_station_name}</Text>
            </View>
            <View style={styles.speedCol}>
              <Text style={styles.speedValue}>{Math.round(data.speed_kmh)}</Text>
              <Text style={styles.speedUnit}>km/h</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.ground}>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.card}>
          <Text style={styles.trainNo}>{data.train_no}</Text>
          <Text style={styles.trainName}>{data.train_name}</Text>
          {data.live_position_desc ? (
            <View style={styles.positionBanner}>
              <View style={styles.activeDot} />
              <Text style={styles.positionBannerText}>{data.live_position_desc}</Text>
            </View>
          ) : null}
          <View style={styles.statusRow}>
            <View>
              <Text style={styles.statusLabel}>STATUS</Text>
              <Text style={[styles.statusValue, data.current_delay_min > 0 && styles.statusValueDelayed]}>
                {data.current_delay_min > 0 ? `Delayed (+${Math.round(data.current_delay_min)}m)` : 'On Time'}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statusLabel}>NEXT STOP</Text>
              <Text style={styles.statusValue}>{data.next_station_name}</Text>
            </View>
          </View>
        </View>

        <View style={styles.trackToggleRow}>
          <View style={styles.rowCenter}>
            <View style={styles.trackIcon}>
              <MapPin size={18} color={colors.pinkDeep} />
            </View>
            <View>
              <Text style={styles.trackToggleTitle}>Track My Train</Text>
              <Text style={styles.trackToggleSub}>Live GPS Tracking</Text>
            </View>
          </View>
          <Switch
            value={tracking}
            onValueChange={setTracking}
            trackColor={{ true: colors.pinkDeep, false: colors.line }}
            thumbColor={colors.white}
          />
        </View>

        <View style={styles.timeline}>
          {(() => {
            const isMoving = (data.speed_kmh ?? 0) > 0 || data.run_status === 'RUNNING';
            let lastDepartedIdx = -1;
            data.route_progress.forEach((s, i) => {
              const isDep = s.status === 'departed' || (s.status === 'current' && isMoving);
              if (isDep) lastDepartedIdx = i;
            });
            const nextStopIdx = data.route_progress.findIndex((s, i) => {
              if (s.station_code === data.next_station_code) return true;
              const isDep = s.status === 'departed' || (s.status === 'current' && isMoving);
              return !isDep;
            });

            return data.route_progress.map((stop, idx) => {
              const isLast = idx === data.route_progress.length - 1;
              const isFirst = idx === 0 && stop.seq === 1;

              // True operational status
              const isActuallyDeparted =
                stop.status === 'departed' ||
                (stop.status === 'current' && (isMoving || stop.eta_departure === 'DEPARTED' || stop.eta_arrival === 'PASSED'));

              const isActuallyAtPlatform =
                stop.status === 'current' && !isActuallyDeparted && !isMoving;

              const isNextStop =
                !isActuallyDeparted &&
                !isActuallyAtPlatform &&
                (idx === nextStopIdx || stop.station_code === data.next_station_code);

              const isUpcoming = !isActuallyDeparted && !isActuallyAtPlatform;

              // Arrival Sched vs Live/Forecast
              const schedArr = isFirst || stop.scheduled_arrival === 'START'
                ? 'Origin'
                : formatClock(stop.scheduled_arrival);

              let arrDisplay = '—';
              if (isFirst) {
                arrDisplay = 'Source';
              } else if (isActuallyDeparted) {
                arrDisplay = calcActualTime(stop.scheduled_arrival, stop.delay_min);
              } else if (isActuallyAtPlatform) {
                arrDisplay = calcActualTime(stop.scheduled_arrival, stop.delay_min);
              } else {
                arrDisplay = stop.eta_arrival && stop.eta_arrival !== 'PASSED'
                  ? formatClock(stop.eta_arrival)
                  : (stop.eta ? formatClock(stop.eta) : schedArr);
              }

              // Departure Sched vs Live/Forecast
              const schedDep = isLast || stop.scheduled_departure === 'TERMINAL' || stop.scheduled_departure === 'None'
                ? 'Terminus'
                : formatClock(stop.scheduled_departure);

              let depDisplay = '—';
              if (isLast) {
                depDisplay = 'Destination';
              } else if (isActuallyDeparted) {
                depDisplay = calcActualTime(stop.scheduled_departure, stop.delay_min);
              } else if (isActuallyAtPlatform) {
                depDisplay = stop.eta_departure && stop.eta_departure !== 'NOW' && stop.eta_departure !== 'DEPARTED'
                  ? formatClock(stop.eta_departure)
                  : 'Departing soon';
              } else {
                depDisplay = stop.eta_departure && stop.eta_departure !== 'DEPARTED' && stop.eta_departure !== 'TERMINAL'
                  ? formatClock(stop.eta_departure)
                  : schedDep;
              }

              const delayMin = Math.round(stop.delay_min ?? 0);
              const isLate = delayMin > 3;
              const halt = stop.halt_min ?? 0;
              const hasDwellSlack = isUpcoming && halt >= 5 && (stop.recovered_min ?? 0) >= 2;

              const statusText = isActuallyDeparted
                ? 'Departed'
                : isActuallyAtPlatform
                ? 'At Platform'
                : isNextStop
                ? 'Next Stop'
                : 'Scheduled';

              return (
                <View key={`${stop.station_code}-${stop.seq}`}>
                  <View style={styles.stopRow}>
                    <View style={styles.stopIconCol}>
                      <View style={[
                        styles.stopDot,
                        isActuallyDeparted && styles.stopDotDeparted,
                        isActuallyAtPlatform && styles.stopDotCurrent,
                        isNextStop && styles.stopDotNext,
                      ]}>
                        {isActuallyDeparted ? (
                          <Check size={14} color={colors.white} />
                        ) : isActuallyAtPlatform ? (
                          <View style={styles.innerDot} />
                        ) : null}
                      </View>
                      {!isLast && (
                        <View style={[
                          styles.stopLine,
                          isActuallyDeparted && styles.stopLineFilled,
                        ]} />
                      )}
                    </View>
                    <View style={[
                      styles.stopCard,
                      isActuallyAtPlatform && styles.stopCardCurrent,
                      isNextStop && styles.stopCardNext,
                    ]}>
                      <View style={styles.rowBetween}>
                        <View style={styles.rowCenter}>
                          <Text style={[
                            styles.stopCode,
                            isActuallyAtPlatform && styles.stopCodeCurrent,
                            isNextStop && styles.stopCodeNext,
                          ]}>
                            {stop.station_code}
                          </Text>
                          {idx === 0 && (
                            <View style={styles.tagPill}>
                              <Text style={styles.tagPillText}>Origin</Text>
                            </View>
                          )}
                          {isLast && (
                            <View style={styles.tagPill}>
                              <Text style={styles.tagPillText}>Terminus</Text>
                            </View>
                          )}
                          {isActuallyDeparted && (
                            <View style={styles.tagPillDeparted}>
                              <Text style={styles.tagPillTextDeparted}>Departed</Text>
                            </View>
                          )}
                          {isActuallyAtPlatform && (
                            <View style={styles.tagPillCurrent}>
                              <Text style={styles.tagPillTextCurrent}>At Platform</Text>
                            </View>
                          )}
                          {isNextStop && (
                            <View style={styles.tagPillNext}>
                              <Text style={styles.tagPillTextNext}>Next Stop</Text>
                            </View>
                          )}
                          {halt > 0 && (
                            <View style={[styles.tagPill, halt >= 10 && styles.tagPillMajor]}>
                              <Text style={[styles.tagPillText, halt >= 10 && styles.tagPillTextMajor]}>
                                {halt}m halt
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[
                          styles.stopTime,
                          isLate && isUpcoming && styles.textLate,
                          isActuallyAtPlatform && styles.textPink,
                          isNextStop && styles.textPink,
                        ]}>
                          {isActuallyDeparted
                            ? (arrDisplay !== '—' ? arrDisplay : (stop.scheduled_arrival ? formatClock(stop.scheduled_arrival) : 'Passed'))
                            : (stop.eta ?? stop.scheduled_arrival ?? '—')}
                        </Text>
                      </View>
                      <Text style={[
                        styles.stopName,
                        isActuallyAtPlatform && styles.stopNameCurrent,
                        isNextStop && styles.stopNameNext,
                      ]}>
                        {stop.station_name}
                      </Text>

                      {/* Dual Timetable Box: Arrival vs Departure */}
                      <View style={styles.timetableRow}>
                        {/* Arrival */}
                        <View style={[styles.timeCol, styles.timeColBorder]}>
                          <View style={styles.timeHeader}>
                            <Text style={styles.timeHeaderLabel}>ARRIVAL</Text>
                            <Text style={[styles.timeHeaderBadge, isLate ? styles.textLate : styles.textGreen]}>
                              {isActuallyDeparted
                                ? (delayMin > 0 ? `+${delayMin}m` : 'On Time')
                                : isActuallyAtPlatform
                                ? 'At Platform'
                                : isLate
                                ? `+${delayMin}m`
                                : 'On Time'}
                            </Text>
                          </View>
                          <View style={styles.timeSubRow}>
                            <View style={styles.timeSubField}>
                              <Text style={styles.timeSubLabel}>Sched</Text>
                              <Text style={styles.timeSubValue}>{schedArr}</Text>
                            </View>
                            <View style={styles.timeSubField}>
                              <Text style={styles.timeSubLabel}>
                                {isActuallyDeparted ? 'ACTUAL' : isActuallyAtPlatform ? 'LIVE' : 'FORECAST'}
                              </Text>
                              <Text style={[styles.timeSubValue, styles.timeSubValueBold, isLate && isUpcoming && styles.textLate]}>
                                {arrDisplay}
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Departure */}
                        <View style={styles.timeCol}>
                          <View style={styles.timeHeader}>
                            <Text style={styles.timeHeaderLabel}>DEPARTURE</Text>
                            <Text style={[styles.timeHeaderBadge, (isLate && !stop.is_recovered) || isActuallyAtPlatform ? styles.textLate : styles.textGreen]}>
                              {isActuallyDeparted
                                ? 'Departed'
                                : isActuallyAtPlatform
                                ? 'At Station'
                                : isLast
                                ? 'Terminus'
                                : stop.is_recovered
                                ? 'On Time'
                                : isLate
                                ? `+${Math.max(0, delayMin - Math.round(stop.recovered_min ?? 0))}m`
                                : 'On Time'}
                            </Text>
                          </View>
                          <View style={styles.timeSubRow}>
                            <View style={styles.timeSubField}>
                              <Text style={styles.timeSubLabel}>Sched</Text>
                              <Text style={styles.timeSubValue}>{schedDep}</Text>
                            </View>
                            <View style={styles.timeSubField}>
                              <Text style={styles.timeSubLabel}>
                                {isActuallyDeparted ? 'ACTUAL' : isActuallyAtPlatform ? 'LIVE' : 'FORECAST'}
                              </Text>
                              <Text style={[styles.timeSubValue, styles.timeSubValueBold, isLate && !stop.is_recovered && isUpcoming && styles.textLate]}>
                                {depDisplay}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {/* Delay Slack Absorption Callout */}
                      {isUpcoming && (stop.is_recovered || hasDwellSlack) && (
                        <View style={styles.slackRow}>
                          <Zap size={10} color={colors.confidence} />
                          <Text style={styles.slackText}>
                            {stop.is_recovered
                              ? 'Full delay recovery predicted at this station'
                              : `~${Math.round(stop.recovered_min!)}m delay absorbed during ${halt}m scheduled halt`}
                          </Text>
                        </View>
                      )}

                      <View style={styles.stopFooter}>
                        <Text style={styles.stopFooterText}>
                          {isActuallyDeparted
                            ? (delayMin > 0 ? `Departed with +${delayMin}m delay` : 'Departed on time')
                            : isActuallyAtPlatform
                            ? (delayMin > 0 ? `At platform · +${delayMin}m delay` : 'At platform on time')
                            : isNextStop
                            ? (delayMin > 0 ? `Next stop · +${delayMin}m delay expected` : 'Next stop · On schedule')
                            : typeof stop.delay_min === 'number' && stop.delay_min > 0
                            ? `+${delayMin}m delay expected`
                            : 'On schedule'}
                        </Text>
                        <Text style={[
                          styles.stopStatusText,
                          isActuallyDeparted && styles.stopStatusTextDeparted,
                          isActuallyAtPlatform && styles.stopStatusTextCurrent,
                          isNextStop && styles.stopStatusTextNext,
                        ]}>
                          {statusText}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Train In-Transit Marker between last departed stop and next stop */}
                  {idx === lastDepartedIdx && isMoving && !isLast && (
                    <View style={styles.transitRow}>
                      <View style={styles.transitIconCol}>
                        <View style={styles.transitLine} />
                        <View style={styles.transitDot}>
                          <Navigation size={12} color={colors.white} />
                        </View>
                        <View style={styles.transitLine} />
                      </View>
                      <View style={styles.transitCard}>
                        <View style={styles.rowBetween}>
                          <View style={styles.rowCenter}>
                            <View style={styles.activeDot} />
                            <Text style={styles.transitHeading}>
                              IN TRANSIT · {Math.round(data.speed_kmh)} KM/H
                            </Text>
                          </View>
                          <Text style={styles.transitSub}>GPS Live</Text>
                        </View>
                        <Text style={styles.transitNextText}>
                          En route to {data.next_station_name} ({data.next_station_code})
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            });
          })()}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.mapFab} onPress={() => setShowMap(true)}>
        <MapIcon size={18} color={colors.white} />
        <Text style={styles.mapFabText}>Map View</Text>
      </TouchableOpacity>
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
    backgroundColor: colors.pink,
  },
  body: {
    padding: space.md,
    gap: space.md,
    paddingBottom: space.xl * 2,
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
    gap: space.sm,
  },
  trainNo: {
    ...type.label,
    color: colors.maroonMuted,
  },
  trainName: {
    ...type.h2,
    color: colors.maroon,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  statusLabel: {
    ...type.micro,
    fontSize: 9,
    color: colors.maroonMuted,
  },
  statusValue: {
    ...type.body,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.maroon,
  },
  statusValueDelayed: {
    color: colors.delayed,
  },
  trackToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trackIcon: {
    backgroundColor: colors.pink,
    borderRadius: radius.pill,
    padding: space.sm,
  },
  trackToggleTitle: {
    ...type.body,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.maroon,
  },
  trackToggleSub: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  timeline: {
    marginTop: space.xs,
  },
  stopRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  stopIconCol: {
    alignItems: 'center',
    width: 36,
  },
  stopDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.cream,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopDotFilled: {
    backgroundColor: colors.pinkDeep,
    borderColor: colors.pinkDeep,
  },
  stopLine: {
    flex: 1,
    width: 3,
    backgroundColor: colors.line,
    borderRadius: 1.5,
    marginVertical: 2,
  },
  stopLineFilled: {
    backgroundColor: colors.pinkDeep,
  },
  stopCard: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.sm + 2,
    marginBottom: space.sm,
  },
  stopCode: {
    ...type.h2,
    fontSize: 17,
    color: colors.maroon,
  },
  tagPill: {
    backgroundColor: colors.pink,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
  },
  tagPillText: {
    ...type.micro,
    fontSize: 9,
    color: colors.maroonMuted,
  },
  stopTime: {
    ...type.body,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.maroon,
  },
  stopName: {
    ...type.body,
    fontSize: 13,
    color: colors.maroonMuted,
  },
  stopFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  stopFooterText: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  stopStatusText: {
    ...type.micro,
    color: colors.onTime,
  },
  stopStatusTextDeparted: {
    color: colors.onTime,
  },
  stopStatusTextCurrent: {
    color: colors.delayed,
  },
  stopStatusTextNext: {
    color: colors.pinkDeep,
    fontFamily: 'Poppins_600SemiBold',
  },
  stopCardCurrent: {
    borderColor: colors.pinkDeep,
    borderWidth: 1.5,
  },
  stopCardNext: {
    borderColor: colors.pinkDeep,
    borderWidth: 1.5,
  },
  stopCodeCurrent: {
    color: colors.pinkDeep,
  },
  stopCodeNext: {
    color: colors.pinkDeep,
  },
  stopNameCurrent: {
    color: colors.maroon,
  },
  stopNameNext: {
    color: colors.maroon,
  },
  stopDotDeparted: {
    backgroundColor: colors.onTime,
    borderColor: colors.onTime,
  },
  stopDotCurrent: {
    backgroundColor: colors.pinkDeep,
    borderColor: colors.pinkDeep,
  },
  stopDotNext: {
    borderColor: colors.pinkDeep,
    borderWidth: 2.5,
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.white,
  },
  tagPillDeparted: {
    backgroundColor: colors.confidenceBg,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
  },
  tagPillTextDeparted: {
    ...type.micro,
    fontSize: 9,
    color: colors.onTime,
    fontFamily: 'Poppins_600SemiBold',
  },
  tagPillCurrent: {
    backgroundColor: 'rgba(230, 57, 110, 0.15)',
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
  },
  tagPillTextCurrent: {
    ...type.micro,
    fontSize: 9,
    color: colors.pinkDeep,
    fontFamily: 'Poppins_600SemiBold',
  },
  tagPillNext: {
    backgroundColor: 'rgba(230, 57, 110, 0.15)',
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 1,
  },
  tagPillTextNext: {
    ...type.micro,
    fontSize: 9,
    color: colors.pinkDeep,
    fontFamily: 'Poppins_600SemiBold',
  },
  positionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs + 2,
    backgroundColor: colors.pink,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs + 2,
    borderRadius: radius.sm,
  },
  positionBannerText: {
    ...type.micro,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.pinkDeep,
    flex: 1,
  },
  transitRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
  },
  transitIconCol: {
    alignItems: 'center',
    width: 36,
  },
  transitLine: {
    width: 3,
    flex: 1,
    minHeight: 12,
    backgroundColor: colors.line,
    borderRadius: 1.5,
  },
  transitDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.pinkDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 2,
  },
  transitCard: {
    flex: 1,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.pinkDeep,
    padding: space.sm,
    gap: 2,
  },
  transitHeading: {
    ...type.micro,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.pinkDeep,
    letterSpacing: 0.5,
  },
  transitSub: {
    ...type.micro,
    fontSize: 9,
    color: colors.maroonMuted,
  },
  transitNextText: {
    ...type.body,
    fontSize: 12,
    color: colors.maroon,
  },
  tagPillMajor: {
    backgroundColor: 'rgba(230, 57, 110, 0.15)',
  },
  tagPillTextMajor: {
    color: colors.pinkDeep,
  },
  timetableRow: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: space.xs + 2,
    overflow: 'hidden',
  },
  timeCol: {
    flex: 1,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  timeColBorder: {
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  timeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  timeHeaderLabel: {
    ...type.micro,
    fontSize: 8,
    color: colors.maroonMuted,
    letterSpacing: 0.5,
  },
  timeHeaderBadge: {
    ...type.micro,
    fontSize: 8.5,
    fontFamily: 'Poppins_600SemiBold',
  },
  timeSubRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timeSubField: {
    flex: 1,
  },
  timeSubLabel: {
    ...type.micro,
    fontSize: 7.5,
    color: colors.maroonMuted,
  },
  timeSubValue: {
    ...type.body,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 1,
  },
  timeSubValueBold: {
    fontFamily: 'Poppins_600SemiBold',
    color: colors.ink,
  },
  slackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.confidenceBg,
    paddingHorizontal: space.xs + 2,
    paddingVertical: 2,
    borderRadius: radius.sm,
    marginTop: space.xs,
  },
  slackText: {
    ...type.micro,
    fontSize: 8.5,
    color: colors.confidence,
  },
  textGreen: {
    color: colors.onTime,
  },
  textLate: {
    color: colors.delayed,
  },
  textPink: {
    color: colors.pinkDeep,
  },
  mapFab: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.pinkDeep,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
  },
  mapFabText: {
    ...type.label,
    letterSpacing: 0,
    color: colors.white,
  },
  mapGround: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  mapHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    backgroundColor: colors.cream,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
  },
  mapHeaderTitle: {
    ...type.h2,
    color: colors.pinkDeep,
  },
  mapCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(230, 57, 110, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapStatusCard: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    bottom: space.xl,
    backgroundColor: colors.cream,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.md,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.onTime,
  },
  mapStatusLabel: {
    ...type.micro,
    color: colors.onTime,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: space.sm,
  },
  mapStatusSub: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  mapStatusMain: {
    ...type.body,
    fontFamily: 'Poppins_600SemiBold',
    color: colors.maroon,
  },
  speedCol: {
    alignItems: 'center',
  },
  speedValue: {
    ...type.h1,
    fontSize: 28,
    color: colors.pinkDeep,
  },
  speedUnit: {
    ...type.micro,
    color: colors.maroonMuted,
  },
});
