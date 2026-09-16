import React, { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Search } from 'lucide-react-native';
import { Screen } from '../components/ui/Screen';
import { AppHeader } from '../components/ui/AppHeader';
import { Field } from '../components/ui/Field';
import { StatusPill } from '../components/ui/StatusPill';
import { colors, radius, space, type } from '../theme/tokens';
import { getStationBoard, searchStations } from '../services/api';
import type { StationBoardItem, StationSearchResult } from '../types';
import type { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'StationSearch'>;

export function StationSearchScreen({ route, navigation }: Props) {
  const initial = route.params?.stationCode ?? 'NDLS';
  const [stationCode, setStationCode] = useState(initial);
  const [query, setQuery] = useState(initial);
  const [items, setItems] = useState<StationBoardItem[]>([]);
  const [suggestions, setSuggestions] = useState<StationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setItems(await getStationBoard(stationCode));
      setLoading(false);
    })();
  }, [stationCode]);

  const handleQueryChange = async (txt: string) => {
    setQuery(txt);
    if (txt.trim().length >= 2) {
      setSuggestions((await searchStations(txt)).slice(0, 5));
    } else {
      setSuggestions([]);
    }
  };

  return (
    <Screen>
      <AppHeader onBackPress={navigation.goBack} />
      <View style={styles.body}>
        <Field
          value={query}
          onChangeText={handleQueryChange}
          placeholder="Station name or code"
          autoCapitalize="characters"
          icon={<Search size={18} color={colors.maroonMuted} />}
          onSubmitEditing={() => setStationCode(query.trim() || stationCode)}
        />
        {suggestions.length > 0 && (
          <View style={styles.suggestions}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.station_code}
                style={styles.suggestionRow}
                onPress={() => {
                  setStationCode(s.station_code);
                  setQuery(s.station_code);
                  setSuggestions([]);
                }}
              >
                <Text style={styles.suggestionCode}>{s.station_code}</Text>
                <Text style={styles.suggestionName} numberOfLines={1}>
                  {s.station_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.heading}>{stationCode.toUpperCase()} — LIVE BOARD</Text>

        <FlatList
          data={items}
          keyExtractor={(item) => item.train_number}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            !loading ? <Text style={styles.empty}>No trains found for {stationCode}.</Text> : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => navigation.navigate('TrainTabs', { trainNo: item.train_number })}
            >
              <View style={styles.rowTop}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{item.train_number}</Text>
                </View>
                <Text style={styles.trainName} numberOfLines={1}>
                  {item.train_name}
                </Text>
                <StatusPill status={item.status} delayMin={item.delay_min} />
              </View>
              <View style={styles.rowBottom}>
                <Text style={styles.time}>
                  SCHED {item.scheduled_time} · ETA {item.predicted_eta}
                </Text>
                <TouchableOpacity
                  onPress={() => navigation.navigate('TrainTabs', { trainNo: item.train_number })}
                >
                  <Text style={styles.trackLink}>Track on map</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    padding: space.md,
    gap: space.sm,
  },
  suggestions: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  suggestionCode: {
    ...type.label,
    letterSpacing: 0,
    color: colors.crimson,
    width: 56,
  },
  suggestionName: {
    ...type.body,
    fontSize: 13,
    color: colors.maroon,
    flex: 1,
  },
  heading: {
    ...type.label,
    color: colors.maroonMuted,
    marginTop: space.sm,
  },
  list: {
    gap: space.sm,
    paddingBottom: space.lg,
  },
  row: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: space.sm,
    gap: space.xs,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  chip: {
    backgroundColor: colors.pink,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  chipText: {
    ...type.micro,
    color: colors.crimson,
  },
  trainName: {
    ...type.body,
    fontSize: 13,
    color: colors.maroon,
    flex: 1,
  },
  rowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  time: {
    ...type.micro,
    color: colors.maroonMuted,
  },
  trackLink: {
    ...type.micro,
    color: colors.crimson,
  },
  empty: {
    ...type.body,
    color: colors.maroonMuted,
    textAlign: 'center',
    paddingVertical: space.lg,
  },
});
