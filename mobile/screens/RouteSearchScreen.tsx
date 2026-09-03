import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { searchTrainsBetweenStations } from "../services/api";

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
  const [toStation, setToStation] = useState<string>("BCT");
  const [trains, setTrains] = useState<RouteItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searched, setSearched] = useState<boolean>(false);

  const fetchRoutes = async (fromCode: string, toCode: string) => {
    if (!fromCode || !toCode) return;
    setLoading(true);
    setSearched(true);
    const results = await searchTrainsBetweenStations(fromCode, toCode);
    setTrains(results);
    setLoading(false);
  };

  useEffect(() => {
    fetchRoutes(fromStation, toStation);
  }, []);

  const handleSwap = () => {
    const temp = fromStation;
    setFromStation(toStation);
    setToStation(temp);
    fetchRoutes(toStation, fromStation);
  };

  const handleQuickRoute = (from: string, to: string) => {
    setFromStation(from);
    setToStation(to);
    fetchRoutes(from, to);
  };

  return (
    <View style={styles.container}>
      {/* Route Input Card */}
      <View style={styles.searchCard}>
        <Text style={styles.cardHeader}>FIND UPCOMING TRAINS BETWEEN STATIONS</Text>

        <View style={styles.inputContainer}>
          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>FROM STATION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. NDLS (New Delhi)"
              placeholderTextColor="#94a3b8"
              value={fromStation}
              onChangeText={setFromStation}
              autoCapitalize="characters"
            />
          </View>

          <TouchableOpacity style={styles.swapBtn} onPress={handleSwap}>
            <Text style={styles.swapIcon}>⇅</Text>
          </TouchableOpacity>

          <View style={styles.inputCol}>
            <Text style={styles.inputLabel}>TO STATION</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. BCT (Mumbai)"
              placeholderTextColor="#94a3b8"
              value={toStation}
              onChangeText={setToStation}
              autoCapitalize="characters"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => fetchRoutes(fromStation, toStation)}
        >
          <Text style={styles.searchButtonText}>Search Available Trains ➔</Text>
        </TouchableOpacity>

        {/* Quick Route Pills */}
        <View style={styles.quickPillsRow}>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickRoute("NDLS", "BCT")}>
            <Text style={styles.quickPillText}>NDLS ➔ BCT</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickRoute("NDLS", "CNB")}>
            <Text style={styles.quickPillText}>NDLS ➔ CNB</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickRoute("NDLS", "HWH")}>
            <Text style={styles.quickPillText}>NDLS ➔ HWH</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Results Header */}
      {searched && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>
            {loading ? "Searching timetables..." : `${trains.length} Trains Found (Sorted by Departure)`}
          </Text>
          <Text style={styles.resultsSub}>
            {fromStation.toUpperCase()} ➔ {toStation.toUpperCase()}
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
          keyExtractor={(item) => item.train_number}
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
                  No direct trains found between {fromStation} and {toStation}.
                </Text>
                <Text style={styles.emptySub}>
                  Try major hub codes (e.g. NDLS, CNB, BCT, HWH, KOTA).
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
  },
  cardHeader: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2563eb",
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  inputCol: {
    flex: 1,
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
    fontSize: 14,
    color: "#0f172a",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    fontWeight: "700",
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
    marginTop: 14,
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
