import React, { useState, useEffect } from "react";
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { StationBoardItem } from "../types";
import { getStationBoard } from "../services/api";

interface Props {
  onSelectTrain: (trainNo: string) => void;
}

export const StationBoardScreen: React.FC<Props> = ({ onSelectTrain }) => {
  const [stationCode, setStationCode] = useState<string>("NDLS");
  const [inputCode, setInputCode] = useState<string>("NDLS");
  const [boardItems, setBoardItems] = useState<StationBoardItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchBoard = async (code: string) => {
    if (!code) return;
    setLoading(true);
    const items = await getStationBoard(code);
    setBoardItems(items);
    setLoading(false);
  };

  useEffect(() => {
    fetchBoard(stationCode);
  }, [stationCode]);

  const handleSubmit = () => {
    const clean = inputCode.trim().toUpperCase();
    if (clean) {
      setStationCode(clean);
    }
  };

  return (
    <View style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter Station Code (e.g. NDLS, KOTA, CNB, BCT)..."
          placeholderTextColor="#94a3b8"
          value={inputCode}
          onChangeText={setInputCode}
          autoCapitalize="characters"
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSubmit}>
          <Text style={styles.searchBtnText}>View</Text>
        </TouchableOpacity>
      </View>

      {/* Quick Station Filter Pills */}
      <View style={styles.quickPillsRow}>
        {["NDLS", "KOTA", "CNB", "BCT", "HWH"].map((code) => (
          <TouchableOpacity
            key={code}
            style={[styles.pill, stationCode === code && styles.pillActive]}
            onPress={() => {
              setInputCode(code);
              setStationCode(code);
            }}
          >
            <Text style={[styles.pillText, stationCode === code && styles.pillTextActive]}>{code}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Header Info */}
      <View style={styles.boardHeader}>
        <Text style={styles.boardTitle}>STATION LIVE DEPARTURE BOARD: {stationCode}</Text>
        <Text style={styles.boardSub}>Dynamic AI Predicted Platform Times</Text>
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.loadingText}>Loading station departures...</Text>
        </View>
      )}

      {/* Board List */}
      {!loading && (
        <FlatList
          data={boardItems}
          keyExtractor={(item, index) => `${item.train_number}-${index}`}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.trainCard} onPress={() => onSelectTrain(item.train_number)}>
              <View style={styles.trainTopRow}>
                <View style={styles.trainNumberBadge}>
                  <Text style={styles.trainNumberText}>{item.train_number}</Text>
                </View>
                <Text style={styles.trainName} numberOfLines={1}>
                  {item.train_name}
                </Text>
              </View>

              <View style={styles.timeDetailsRow}>
                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>SCHEDULED</Text>
                  <Text style={styles.schedTime}>{item.scheduled_time}</Text>
                </View>

                <Text style={styles.arrowIcon}>➔</Text>

                <View style={styles.timeBox}>
                  <Text style={styles.timeLabel}>AI PREDICTED ETA</Text>
                  <Text style={styles.predictedTime}>{item.predicted_eta}</Text>
                </View>

                <View style={styles.tagBox}>
                  <Text
                    style={[
                      styles.tagText,
                      item.delay_min > 20
                        ? styles.tagSevere
                        : item.delay_min > 0
                        ? styles.tagDelayed
                        : styles.tagOnTime,
                    ]}
                  >
                    {item.delay_tag}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.emptyText}>No upcoming train schedules found for station {stationCode}.</Text>
            </View>
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
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0f172a",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
  },
  searchBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBtnText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 14,
  },
  quickPillsRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  pill: {
    backgroundColor: "#e2e8f0",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  pillActive: {
    backgroundColor: "#1e3a8a",
  },
  pillText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "700",
  },
  pillTextActive: {
    color: "#ffffff",
  },
  boardHeader: {
    marginBottom: 12,
  },
  boardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  boardSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
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
  trainTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  trainNumberBadge: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginRight: 8,
  },
  trainNumberText: {
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
  timeDetailsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  timeBox: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 8,
    color: "#64748b",
    fontWeight: "700",
  },
  schedTime: {
    fontSize: 14,
    fontWeight: "800",
    color: "#475569",
    marginTop: 2,
  },
  predictedTime: {
    fontSize: 15,
    fontWeight: "900",
    color: "#1d4ed8",
    marginTop: 2,
  },
  arrowIcon: {
    fontSize: 12,
    color: "#94a3b8",
    marginHorizontal: 6,
  },
  tagBox: {
    alignItems: "flex-end",
  },
  tagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  tagOnTime: {
    color: "#15803d",
  },
  tagDelayed: {
    color: "#b45309",
  },
  tagSevere: {
    color: "#b91c1c",
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
    color: "#64748b",
    fontSize: 13,
    textAlign: "center",
  },
});
