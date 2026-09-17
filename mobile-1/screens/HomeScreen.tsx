import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TextInputProps, TouchableOpacity, View } from 'react-native';
import { ArrowUpDown, ListTree, MapPin, Route, Search, Train } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, radius, space, stitchColors, stitchRadius, stitchType, type } from '../theme/tokens';
import { searchStations, searchTrains, searchTrainsBetweenStations } from '../services/api';
import type { StationSearchResult, TrainSearchResult } from '../types';
import type { RootStackParamList } from '../navigation/types';

interface RouteItem {
  train_number: string;
  train_name: string;
  from_station_code: string;
  from_departure: string;
  to_station_code: string;
  to_arrival: string;
}

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

// Rebuilt from the Stitch project (stitch.withgoogle.com/projects/11448949455890968462)
// home.html export — replaces the earlier segmented-tabs layout. Colors/type come from that
// file's own tailwind.config (stitchColors/stitchType in theme/tokens.ts), not the Figma-mined
// crimson/pink/cream tokens, per explicit instruction to match Stitch exactly. Icons substitute
// lucide-react-native equivalents for the design's Material Symbols glyphs (train, route, search,
// radio_button_unchecked, swap_vert, location_on).
export function HomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const goToTrain = (trainNo: string) => navigation.navigate('TrainTabs', { trainNo });
  const goToStation = (code: string) => navigation.navigate('StationSearch', { stationCode: code });

  return (
    <View style={styles.ground}>
      <View style={[styles.header, { paddingTop: insets.top, height: 60 + insets.top }]}>
        <Text style={styles.wordmark}>Navarail</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.archHeader}>
          <Text style={styles.archTitle}>Where to?</Text>
          <Text style={styles.archSubtitle}>Track live status and schedules</Text>
        </View>
        <View style={styles.cards}>
          <ByTrainCard onSelectTrain={goToTrain} />
          <BetweenStationsCard onSelectTrain={goToTrain} />
          <StationBoardCard onSelectStation={goToStation} />
        </View>
      </ScrollView>
    </View>
  );
}

// home.html's floating-label input — not the shared components/ui/Field (which follows the
// Figma-token design), since this screen deliberately follows Stitch's own type/spacing scale.
function Field({ label, icon, style, ...inputProps }: TextInputProps & { label: string; icon?: React.ReactNode }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {icon && <View style={styles.fieldIcon}>{icon}</View>}
      <TextInput
        style={[styles.fieldInput, icon ? styles.fieldInputWithIcon : null, style]}
        placeholderTextColor={stitchColors.outline}
        {...inputProps}
      />
    </View>
  );
}

function ByTrainCard({ onSelectTrain }: { onSelectTrain: (trainNo: string) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TrainSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setResults(await searchTrains(query));
      setSearched(true);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  // Search button doesn't wait on the debounce/typing race — it runs the query right now, so
  // tapping it immediately after typing (or after the debounced call already found nothing,
  // e.g. backend unreachable) always does *something* visible instead of silently no-opping.
  const runSearch = async () => {
    if (!query.trim()) return;
    clearTimeout(debounceRef.current);
    setLoading(true);
    const found = await searchTrains(query);
    setLoading(false);
    setResults(found);
    setSearched(true);
    if (found.length > 0) onSelectTrain(found[0].train_number);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Train size={20} color={stitchColors.primary} />
        <Text style={styles.cardTitle}>By Train</Text>
      </View>
      <Field
        label="Train No. or Name"
        placeholder="e.g. 12952 or Rajdhani"
        value={query}
        onChangeText={setQuery}
      />
      {results.map((item) => (
        <TouchableOpacity key={item.train_number} style={styles.resultRow} onPress={() => onSelectTrain(item.train_number)}>
          <Text style={styles.resultCode}>{item.train_number}</Text>
          <Text style={styles.resultName} numberOfLines={1}>{item.train_name}</Text>
        </TouchableOpacity>
      ))}
      {searched && !loading && results.length === 0 && (
        <Text style={styles.emptyText}>No trains found. Check the backend is reachable (see hamburger menu).</Text>
      )}
      <TouchableOpacity style={styles.searchButton} onPress={runSearch}>
        <Text style={styles.searchButtonText}>{loading ? 'Searching…' : 'Search'}</Text>
        <Search size={20} color={stitchColors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function BetweenStationsCard({ onSelectTrain }: { onSelectTrain: (trainNo: string) => void }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [trains, setTrains] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    if (!from.trim() || !to.trim()) return;
    setLoading(true);
    const found = await searchTrainsBetweenStations(from.trim(), to.trim(), true);
    setLoading(false);
    setTrains(found);
    setSearched(true);
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Route size={20} color={stitchColors.primary} />
        <Text style={styles.cardTitle}>Between Stations</Text>
      </View>
      <View style={styles.stationFieldsWrap}>
        <Field
          label="From Station"
          placeholder="e.g. NDLS - New Delhi"
          value={from}
          onChangeText={setFrom}
          autoCapitalize="characters"
          icon={<MapPin size={16} color={stitchColors.outline} strokeWidth={1.5} />}
        />
        <TouchableOpacity style={styles.swapButton} onPress={swap}>
          <ArrowUpDown size={18} color={stitchColors.primary} />
        </TouchableOpacity>
        <Field
          label="To Station"
          placeholder="e.g. MMCT - Mumbai Central"
          value={to}
          onChangeText={setTo}
          autoCapitalize="characters"
          icon={<MapPin size={16} color={stitchColors.primary} strokeWidth={1.5} />}
        />
      </View>
      {trains.map((item, idx) => (
        <TouchableOpacity
          key={`${item.train_number}-${idx}`}
          style={styles.resultRow}
          onPress={() => onSelectTrain(item.train_number)}
        >
          <Text style={styles.resultCode}>{item.train_number}</Text>
          <Text style={styles.resultName} numberOfLines={1}>
            {item.from_departure} → {item.to_arrival}
          </Text>
        </TouchableOpacity>
      ))}
      {searched && !loading && trains.length === 0 && (
        <Text style={styles.emptyText}>No trains found. Check the backend is reachable (see hamburger menu).</Text>
      )}
      <TouchableOpacity style={styles.searchButton} onPress={runSearch}>
        <Text style={styles.searchButtonText}>{loading ? 'Searching…' : 'Search'}</Text>
        <Search size={20} color={stitchColors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

// Not part of the Stitch home.html mock (which only ships By Train / Between Stations) — kept as
// a third stacked card, same visual language, so Station Board search isn't lost. See UI_NOTES.md.
function StationBoardCard({ onSelectStation }: { onSelectStation: (code: string) => void }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<StationSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setSuggestions([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSuggestions((await searchStations(query)).slice(0, 5));
      setSearched(true);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const runSearch = async () => {
    if (!query.trim()) return;
    clearTimeout(debounceRef.current);
    setLoading(true);
    const found = (await searchStations(query)).slice(0, 5);
    setLoading(false);
    setSuggestions(found);
    setSearched(true);
    if (found.length > 0) onSelectStation(found[0].station_code);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <ListTree size={20} color={stitchColors.primary} />
        <Text style={styles.cardTitle}>Station Board</Text>
      </View>
      <Field label="Station name or code" placeholder="e.g. NDLS" value={query} onChangeText={setQuery} autoCapitalize="characters" />
      {suggestions.map((s) => (
        <TouchableOpacity key={s.station_code} style={styles.resultRow} onPress={() => onSelectStation(s.station_code)}>
          <Text style={styles.resultCode}>{s.station_code}</Text>
          <Text style={styles.resultName} numberOfLines={1}>{s.station_name}</Text>
        </TouchableOpacity>
      ))}
      {searched && !loading && suggestions.length === 0 && (
        <Text style={styles.emptyText}>No stations found. Check the backend is reachable (see hamburger menu).</Text>
      )}
      <TouchableOpacity style={styles.searchButton} onPress={runSearch}>
        <Text style={styles.searchButtonText}>{loading ? 'Searching…' : 'Search'}</Text>
        <Search size={20} color={stitchColors.onPrimary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  ground: {
    flex: 1,
    backgroundColor: colors.pink,
  },
  header: {
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.surfaceContainerHigh,
  },
  wordmark: {
    ...type.display,
    fontSize: 36,
    color: colors.pinkDeep,
  },
  scroll: {
    paddingHorizontal: space.md,
    paddingBottom: space.xl,
  },
  archHeader: {
    marginTop: space.lg,
    backgroundColor: stitchColors.surfaceContainerHigh,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderBottomWidth: 2,
    borderBottomColor: stitchColors.outlineVariant,
    paddingVertical: space.xl,
    paddingHorizontal: space.lg,
    alignItems: 'center',
  },
  archTitle: {
    ...stitchType.headlineLg,
    fontSize: 30,
    color: stitchColors.onSurface,
  },
  archSubtitle: {
    ...stitchType.bodyMd,
    color: stitchColors.onSurfaceVariant,
    marginTop: space.xs,
  },
  cards: {
    marginTop: -space.lg,
    gap: space.md,
  },
  card: {
    backgroundColor: colors.cream,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: colors.pink,
    padding: space.lg,
    gap: space.md,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  cardTitle: {
    ...stitchType.headlineMd,
    color: stitchColors.onSurface,
  },
  stationFieldsWrap: {
    gap: space.md,
  },
  fieldWrap: {
    position: 'relative',
  },
  fieldLabel: {
    ...stitchType.labelBold,
    position: 'absolute',
    top: -8,
    left: space.md,
    backgroundColor: colors.cream,
    paddingHorizontal: space.xs,
    color: stitchColors.onSurfaceVariant,
    zIndex: 1,
  },
  fieldInput: {
    ...stitchType.bodyLg,
    color: stitchColors.onSurface,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    borderRadius: stitchRadius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  fieldInputWithIcon: {
    paddingLeft: space.xl + space.md,
  },
  fieldIcon: {
    position: 'absolute',
    left: space.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    zIndex: 1,
  },
  swapButton: {
    position: 'absolute',
    right: space.md,
    top: 34,
    backgroundColor: colors.pink,
    borderRadius: stitchRadius.pill,
    borderWidth: 1,
    borderColor: stitchColors.outlineVariant,
    padding: space.xs + 2,
    zIndex: 10,
  },
  resultRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: stitchColors.surfaceContainerHigh,
  },
  resultCode: {
    ...stitchType.labelBold,
    color: stitchColors.primary,
  },
  resultName: {
    ...stitchType.bodyMd,
    color: stitchColors.onSurface,
    flex: 1,
  },
  emptyText: {
    ...stitchType.labelSm,
    color: colors.delayed,
    marginBottom: space.xs,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    backgroundColor: colors.pinkDeep,
    borderRadius: stitchRadius.pill,
    paddingVertical: space.md,
    marginTop: space.xs,
  },
  searchButtonText: {
    ...stitchType.headlineMd,
    fontSize: 18,
    color: stitchColors.onPrimary,
  },
});
