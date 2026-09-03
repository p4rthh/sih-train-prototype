import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { searchTrainsBetweenStations, searchStations } from "../services/api";
import { StationSearchResult } from "../types";

interface RouteItem {
  train_number: string;
  train_name: string;
  from_station_code: string;
  from_station_name: string;
  from_departure: string;
  to_station_code: string;
  to_station_name: string;
  to_arrival: string;
  duration: string;
  stop_count: number;
}

interface Props {
  onSelectTrain: (trainNo: string) => void;
}

export const RouteSearchScreen: React.FC<Props> = ({ onSelectTrain }) => {
  const [fromStation, setFromStation] = useState<string>("NDLS");
  const [toStation, setToStation] = useState<string>("CNB");
  const [expressOnly, setExpressOnly] = useState<boolean>(true);
  const [trains, setTrains] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  // Suggestions state
  const [fromSuggestions, setFromSuggestions] = useState<StationSearchResult[]>([]);
  const [toSuggestions, setToSuggestions] = useState<StationSearchResult[]>([]);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);

  const fetchRoutes = async (fromVal: string, toVal: string, exp: boolean = expressOnly) => {
    if (!fromVal || !toVal) return;
    setLoading(true);
    setSearched(true);
    setActiveField(null);
    const results = await searchTrainsBetweenStations(fromVal, toVal, exp);
    setTrains(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoutes(fromStation, toStation, expressOnly);
  }, []);

  const handleFromChange = async (txt: string) => {
    setFromStation(txt);
    if (txt.trim().length >= 2) {
      const sugs = await searchStations(txt);
      setFromSuggestions(sugs.slice(0, 5));
      setActiveField("from");
    } else {
      setFromSuggestions([]);
      setActiveField(null);
    }
  };

  const handleToChange = async (txt: string) => {
    setToStation(txt);
    if (txt.trim().length >= 2) {
      const sugs = await searchStations(txt);
      setToSuggestions(sugs.slice(0, 5));
      setActiveField("to");
    } else {
      setToSuggestions([]);
      setActiveField(null);
    }
  };

  const selectSuggestion = (field: "from" | "to", item: StationSearchResult) => {
    if (field === "from") {
      setFromStation(item.station_code);
      setFromSuggestions([]);
    } else {
      setToStation(item.station_code);
      setToSuggestions([]);
    }
    setActiveField(null);
  };

  const handleSwap = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
    fetchRoutes(toStation, fromStation, expressOnly);
  };

  const handleQuickRoute = (from: string, to: string) => {
    setFromStation(from);
    setToStation(to);
    fetchRoutes(from, to, expressOnly);
  };

  return (
    <View style={styles.container}>
      {/* Route Input Card */}
      <View style={styles.searchCard}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardHeader}>PAN-INDIA TRAIN ROUTE SEARCH</Text>
          <TouchableOpacity
            style={[styles.expressToggle, expressOnly && styles.expressToggleActive]}
            onPress={() => {
              const nextExp = !expressOnly;
              setExpressOnly(nextExp);
              fetchRoutes(fromStation, toStation, nextExp);
            }}
          >
            <Text style={[styles.expressToggleText, expressOnly && styles.expressToggleTextActive]}>
              {expressOnly ? "⚡ Express Trains Only" : "All Trains (Inc. Local)"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          {/* FROM Input */}
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>ORIGIN STATION / CITY</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. NDLS or New Delhi"
              placeholderTextColor="#94a3b8"
              value={fromStation}
              onChangeText={handleFromChange}
              onFocus={() => setActiveField("from")}
            />
            {activeField === "from" && fromSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {fromSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s.station_code}
                    style={styles.sugItem}
                    onPress={() => selectSuggestion("from", s)}
                  >
                    <Text style={styles.sugCode}>{s.station_code}</Text>
                    <Text style={styles.sugName} numberOfLines={1}>{s.station_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
            <Text style={styles.swapIcon}>⇅</Text>
          </TouchableOpacity>

          {/* TO Input */}
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>DESTINATION STATION / CITY</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. BCT or Mumbai"
              placeholderTextColor="#94a3b8"
              value={toStation}
              onChangeText={handleToChange}
              onFocus={() => setActiveField("to")}
            />
            {activeField === "to" && toSuggestions.length > 0 && (
              <View style={styles.suggestionsBox}>
                {toSuggestions.map((s) => (
                  <TouchableOpacity
                    key={s.station_code}
                    style={styles.sugItem}
                    onPress={() => selectSuggestion("to", s)}
                  >
                    <Text style={styles.sugCode}>{s.station_code}</Text>
                    <Text style={styles.sugName} numberOfLines={1}>{s.station_name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => fetchRoutes(fromStation, toStation, expressOnly)}
        >
          <Text style={styles.searchButtonText}>
            Search Available Express Trains ➔
          </Text>
        </TouchableOpacity>

        {/* Quick Corridor Pills */}
        <View style={styles.quickPillsRow}>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickRoute("NDLS", "CNB")}>
            <Text style={styles.quickPillText}>Delhi ➔ Kanpur</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickRoute("NDLS", "BCT")}>
            <Text style={styles.quickPillText}>Delhi ➔ Mumbai</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickRoute("NDLS", "HWH")}>
            <Text style={styles.quickPillText}>Delhi ➔ Howrah</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickRoute("CSMT", "PUNE")}>
            <Text style={styles.quickPillText}>Mumbai ➔ Pune</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Header */}
      {searched && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {loading ? "Searching Pan-India schedules..." : `${trains.length} Express Trains Available (Ascending Departure)`}
          </Text>
          <Text style={styles.resultsSub}>
            {fromStation.toUpperCase()} ➔ {toStation.toUpperCase()} • {expressOnly ? "Filtered: Express/Superfast/Mail" : "All Services"}
          </Text>
        </View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Filtering schedules across Indian Railways network...</Text>
        </View>
      )}

      {/* Train List */}
      {!loading && (
        <FlatList
          data={trains}
          keyExtractor={(item, idx) => `${item.train_number}-${idx}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.trainCard}
              onPress={() => onSelectTrain(item.train_number)}
            >
              <View style={styles.trainHeader}>
                <View style={styles.numberBadge}>
                  <Text style={styles.numberText}>{item.train_number}</Text>
                </View>
                <Text style={styles.trainName} numberOfLines={1}>
                  {item.train_name}
                </Text>
              </View>

              {/* Timing Row */}
              <View style={styles.timingRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>DEPARTS</Text>
                  <Text style={styles.timeText}>{item.from_departure}</Text>
                  <Text style={styles.stnText} numberOfLines={1}>{item.from_station_name}</Text>
                </View>

                <View style={styles.durationBox}>
                  <Text style={styles.durationText}>{item.duration}</Text>
                  <View style={styles.durationLine} />
                  <Text style={styles.stopCount}>{item.stop_count} stops</Text>
                </View>

                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>ARRIVES</Text>
                  <Text style={styles.timeText}>{item.to_arrival}</Text>
                  <Text style={styles.stnText} numberOfLines={1}>{item.to_station_name}</Text>
                </View>
              </View>

              {/* Action Button */}
              <View style={styles.trackButton}>
                <Text style={styles.trackButtonText}>📍 Track Live on Map & View Dynamic ETA ➔</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searched && !loading ? (
              <View style={styles.centerBox}>
                <Text style={styles.emptyText}>
                  No express trains found between {fromStation} and {toStation}.
                </Text>
                <Text style={styles.emptySub}>
                  Try major hub codes or city names (e.g. New Delhi, Mumbai, Kanpur, Howrah, Kota).
                </Text>
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 16,
  },
  searchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    zIndex: 100,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 0.8,
  },
  expressToggle: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  expressToggleActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  expressToggleText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
  },
  expressToggleTextActive: {
    color: "#1d4ed8",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
    position: "relative",
  },
  inputLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0f172a",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    fontWeight: "700",
  },
  suggestionsBox: {
    position: "absolute",
    top: 60,
    left: 0,
    right: 0,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 999,
  },
  sugItem: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sugCode: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563eb",
    width: 45,
  },
  sugName: {
    fontSize: 11,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  swapIcon: {
    fontSize: 16,
    color: "#1d4ed8",
    fontWeight: "bold",
  },
  searchButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  quickPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },
  quickPill: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quickPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  resultsHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  resultsTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  resultsSub: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 24,
    gap: 10,
  },
  trainCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  trainHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  numberBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginRight: 8,
  },
  numberText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
  },
  trainName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  timingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    marginBottom: 10,
  },
  timeBox: {
    width: 90,
  },
  timeLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#94a3b8",
  },
  timeText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    marginTop: 2,
  },
  stnText: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },
  durationBox: {
    flex: 1,
    alignItems: "center",
  },
  durationText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563eb",
  },
  durationLine: {
    height: 2,
    backgroundColor: "#cbd5e1",
    width: "70%",
    marginVertical: 4,
  },
  stopCount: {
    fontSize: 9,
    color: "#94a3b8",
  },
  trackButton: {
    backgroundColor: "#eff6ff",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  trackButtonText: {
    color: "#1d4ed8",
    fontSize: 12,
    fontWeight: "800",
  },
  centerBox: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    color: "#64748b",
    fontSize: 13,
  },
  emptyText: {
    fontSize: 14,
    color: "#0f172a",
    fontWeight: "700",
    textAlign: "center",
  },
  emptySub: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    textAlign: "center",
  },
});
