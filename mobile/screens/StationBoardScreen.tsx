import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { StationBoardItem, StationSearchResult } from "../types";
import { getStationBoard, searchStations } from "../services/api";

interface Props {
  onSelectTrain: (trainNo: string) => void;
}

export const StationBoardScreen: React.FC<Props> = ({ onSelectTrain }) => {
  const [stationQuery, setStationQuery] = useState<string>("NDLS");
  const [inputQuery, setInputQuery] = useState<string>("NDLS");
  const [boardItems, setBoardItems] = useState<StationBoardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<StationSearchResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);

  const fetchBoard = async (query: string) => {
    if (!query) return;
    setLoading(true);
    setShowSuggestions(false);
    const items = await getStationBoard(query);
    setBoardItems(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchBoard(stationQuery);
  }, [stationQuery]);

  const handleInputChange = async (txt: string) => {
    setInputQuery(txt);
    if (txt.trim().length >= 2) {
      const sugs = await searchStations(txt);
      setSuggestions(sugs.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (s: StationSearchResult) => {
    setInputQuery(s.station_code);
    setStationQuery(s.station_code);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = () => {
    const clean = inputQuery.trim();
    if (clean) {
      setStationQuery(clean);
      setShowSuggestions(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Enter Station Code or Name (e.g. NDLS, Delhi, Mumbai, Kanpur)..."
            placeholderTextColor="#94a3b8"
            value={inputQuery}
            onChangeText={handleInputChange}
            onSubmitEditing={handleSubmit}
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSubmit}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>

        {/* Suggestions Autocomplete Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <View style={styles.suggestionsBox}>
            {suggestions.map((s) => (
              <TouchableOpacity
                key={s.station_code}
                style={styles.sugItem}
                onPress={() => handleSelectSuggestion(s)}
              >
                <Text style={styles.sugCode}>{s.station_code}</Text>
                <Text style={styles.sugName} numberOfLines={1}>{s.station_name}</Text>
                {s.state && <Text style={styles.sugState}>{s.state}</Text>}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Quick Station Filter Pills */}
      <View style={styles.quickPillsRow}>
        {[
          { code: "NDLS", label: "New Delhi" },
          { code: "CNB", label: "Kanpur" },
          { code: "BCT", label: "Mumbai Central" },
          { code: "HWH", label: "Howrah" },
          { code: "KOTA", label: "Kota" },
        ].map((item) => (
          <TouchableOpacity
            key={item.code}
            style={[styles.pill, stationQuery.toUpperCase() === item.code && styles.pillActive]}
            onPress={() => {
              setInputQuery(item.code);
              setStationQuery(item.code);
            }}
          >
            <Text
              style={[
                styles.pillText,
                stationQuery.toUpperCase() === item.code && styles.pillTextActive,
              ]}
            >
              {item.label} ({item.code})
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Status Header */}
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle}>
          {stationQuery.toUpperCase()} LIVE DEPARTURES & ARRIVALS
        </Text>
        <Text style={styles.boardSub}>
          {boardItems.length} Express Trains Scheduled • AI Delay Calibration
        </Text>
      </View>

      {/* Loading state */}
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Fetching pan-India live station board...</Text>
        </View>
      )}

      {/* Train Departure List */}
      {!loading && (
        <FlatList
          data={boardItems}
          keyExtractor={(item) => item.train_number}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemCard}
              onPress={() => onSelectTrain(item.train_number)}
            >
              <View style={styles.itemLeft}>
                <View style={styles.trainNumberRow}>
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>{item.train_number}</Text>
                  </View>
                  <Text style={styles.trainName} numberOfLines={1}>
                    {item.train_name}
                  </Text>
                </View>

                <View style={styles.timeScheduleRow}>
                  <Text style={styles.schedLabel}>SCHED: </Text>
                  <Text style={styles.schedVal}>{item.scheduled_time}</Text>
                  <Text style={styles.etaLabel}>  ➜  PREDICTED ETA: </Text>
                  <Text style={styles.etaVal}>{item.predicted_eta}</Text>
                </View>
              </View>

              <View style={styles.itemRight}>
                <View
                  style={[
                    styles.tagBadge,
                    item.status === "ON_TIME" ? styles.tagGreen : styles.tagAmber,
                  ]}
                >
                  <Text
                    style={[
                      styles.tagText,
                      item.status === "ON_TIME" ? styles.textGreen : styles.textAmber,
                    ]}
                  >
                    {item.delay_tag}
                  </Text>
                </View>
                <Text style={styles.trackPrompt}>Track on Map ➔</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.centerBox}>
                <Text style={styles.emptyText}>No express trains found for {stationQuery}.</Text>
                <Text style={styles.emptySub}>Search by station code (e.g. NDLS, BCT, CNB, HWH) or city name.</Text>
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
  searchWrapper: {
    position: "relative",
    zIndex: 100,
    marginBottom: 10,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0f172a",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    fontWeight: "700",
  },
  searchBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  searchBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  suggestionsBox: {
    position: "absolute",
    top: 50,
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
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sugCode: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563eb",
    width: 50,
  },
  sugName: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0f172a",
    flex: 1,
  },
  sugState: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
  },
  quickPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  pill: {
    backgroundColor: "#ffffff",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  pillActive: {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
  },
  pillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748b",
  },
  pillTextActive: {
    color: "#2563eb",
  },
  boardHeader: {
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  boardTitle: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  boardSub: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },
  listContent: {
    paddingBottom: 24,
    gap: 8,
  },
  itemCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },
  itemLeft: {
    flex: 1,
    marginRight: 10,
  },
  trainNumberRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  numberBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  numberText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#334155",
  },
  trainName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f172a",
    flex: 1,
  },
  timeScheduleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  schedLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94a3b8",
  },
  schedVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  etaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563eb",
  },
  etaVal: {
    fontSize: 13,
    fontWeight: "900",
    color: "#2563eb",
  },
  itemRight: {
    alignItems: "flex-end",
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 4,
  },
  tagGreen: {
    backgroundColor: "#dcfce7",
  },
  tagAmber: {
    backgroundColor: "#fef3c7",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "800",
  },
  textGreen: {
    color: "#16a34a",
  },
  textAmber: {
    color: "#d97706",
  },
  trackPrompt: {
    fontSize: 10,
    color: "#2563eb",
    fontWeight: "700",
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
