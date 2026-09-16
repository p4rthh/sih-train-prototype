import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, space, type } from '../../theme/tokens';
import type { RouteStop } from '../../types';

type Props = {
  stops: RouteStop[];
};

const STATE_LABEL: Record<RouteStop['status'], string> = {
  departed: 'Departed',
  current: 'Arrived',
  upcoming: 'Passed',
};

export function TimelineRail({ stops }: Props) {
  return (
    <View>
      {stops.map((stop, i) => {
        const isLast = i === stops.length - 1;
        return (
          <View key={`${stop.station_code}-${stop.seq}`} style={styles.row}>
            <View style={styles.timeGutter}>
              <Text style={styles.time}>{stop.eta ?? stop.scheduled_arrival ?? '—'}</Text>
              <Text style={styles.state}>{STATE_LABEL[stop.status]}</Text>
            </View>
            <View style={styles.railCol}>
              <View
                style={[
                  styles.dot,
                  stop.status === 'departed' && styles.dotFilled,
                  stop.status === 'current' && styles.dotRinged,
                ]}
              />
              {!isLast && <View style={styles.line} />}
            </View>
            <View style={styles.stationCol}>
              <Text style={styles.stationName}>
                {stop.station_name.toUpperCase()} ({stop.station_code})
              </Text>
              {typeof stop.delay_min === 'number' && stop.delay_min > 0 && (
                <Text style={styles.delay}>+{stop.delay_min}m</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const DOT_SIZE = 14;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    minHeight: 56,
  },
  timeGutter: {
    width: 72,
    alignItems: 'flex-end',
    paddingRight: space.sm,
  },
  time: {
    ...type.label,
    letterSpacing: 0,
    color: colors.crimson,
  },
  state: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  railCol: {
    width: DOT_SIZE + 4,
    alignItems: 'center',
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
    borderColor: colors.pinkDeep,
    backgroundColor: colors.cream,
  },
  dotFilled: {
    backgroundColor: colors.pinkDeep,
  },
  dotRinged: {
    backgroundColor: colors.cream,
    borderColor: colors.crimson,
    borderWidth: 3,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.line,
  },
  stationCol: {
    flex: 1,
    paddingLeft: space.sm,
    justifyContent: 'center',
  },
  stationName: {
    ...type.body,
    color: colors.maroon,
  },
  delay: {
    ...type.micro,
    color: colors.delayed,
  },
});
