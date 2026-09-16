import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { Field } from '../components/ui/Field';
import { PillButton } from '../components/ui/PillButton';
import { Card } from '../components/ui/Card';
import { colors, radius, space, type } from '../theme/tokens';
import { getPnrStatus } from '../services/api';
import type { PNRResponse } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PNR'>;

export function PNRScreen({ navigation }: Props) {
  const [pnr, setPnr] = useState('');
  const [data, setData] = useState<PNRResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    const target = pnr.trim();
    if (target.length !== 10) {
      setError('Enter a valid 10-digit PNR number.');
      return;
    }
    setError(null);
    setLoading(true);
    const res = await getPnrStatus(target);
    setLoading(false);
    if (res) {
      setData(res);
    } else {
      setError('Could not retrieve PNR details. Please verify the 10 digits.');
    }
  };

  return (
    <Screen>
      <AppHeader onBackPress={navigation.goBack} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.title}>PNR Status</Text>
        <Field
          placeholder="10-digit PNR"
          keyboardType="number-pad"
          maxLength={10}
          value={pnr}
          onChangeText={(t) => {
            setPnr(t);
            setError(null);
          }}
        />
        <PillButton
          label={loading ? 'Checking…' : 'Check status'}
          onPress={handleSearch}
          disabled={pnr.length !== 10 || loading}
          style={styles.searchBtn}
        />
        {loading && <ActivityIndicator color={colors.pinkDeep} style={styles.loader} />}
        {error && <Text style={styles.error}>{error}</Text>}

        {data && (
          <Card style={styles.resultCard}>
            <Text style={styles.pnrBadge}>PNR #{data.pnr}</Text>
            <Text style={styles.trainName}>{data.train_name}</Text>
            <Text style={styles.trainSub}>Train #{data.train_number}</Text>

            <View style={styles.routeRow}>
              <View>
                <Text style={styles.stationCode}>{data.from_station_code}</Text>
                <Text style={styles.stationTime}>Dep {data.boarding_time}</Text>
              </View>
              <Text style={styles.arrow}>→</Text>
              <View>
                <Text style={styles.stationCode}>{data.to_station_code}</Text>
                <Text style={styles.stationTime}>{data.date_of_journey}</Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>PASSENGERS</Text>
            {data.passengers.map((p) => (
              <View key={p.number} style={styles.passengerRow}>
                <Text style={styles.passengerText}>
                  Passenger {p.number} · Coach {p.coach} · Berth {p.berth}
                </Text>
                <Text style={styles.passengerStatus}>{p.current_status}</Text>
              </View>
            ))}

            <PillButton
              label="Track this train"
              onPress={() => navigation.navigate('TrainTabs', { trainNo: data.train_number })}
              style={styles.trackBtn}
            />
          </Card>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    padding: space.md,
    gap: space.sm,
    paddingBottom: space.xl,
  },
  title: {
    ...type.h1,
    color: colors.crimson,
  },
  searchBtn: {
    marginTop: space.xs,
  },
  loader: {
    marginTop: space.sm,
  },
  error: {
    ...type.body,
    fontSize: 12,
    color: colors.delayed,
  },
  resultCard: {
    marginTop: space.md,
    gap: space.xs,
  },
  pnrBadge: {
    ...type.label,
    color: colors.maroonMuted,
  },
  trainName: {
    ...type.h2,
    color: colors.crimson,
  },
  trainSub: {
    ...type.body,
    fontSize: 12,
    color: colors.maroonMuted,
    marginBottom: space.sm,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.pink,
    borderRadius: radius.md,
    padding: space.sm,
  },
  stationCode: {
    ...type.h2,
    color: colors.crimson,
  },
  stationTime: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  arrow: {
    ...type.h2,
    color: colors.crimson,
  },
  sectionLabel: {
    ...type.label,
    color: colors.maroonMuted,
    marginTop: space.sm,
  },
  passengerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  passengerText: {
    ...type.body,
    fontSize: 13,
    color: colors.maroon,
    flex: 1,
  },
  passengerStatus: {
    ...type.micro,
    color: colors.crimson,
  },
  trackBtn: {
    marginTop: space.md,
  },
});
