import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from "react-native";
import { getPnrStatus } from "../services/api";
import { PNRResponse } from "../types";

interface Props {
  onSelectTrain: (trainNo: string) => void;
}

export const PNRSearchScreen: React.FC<Props> = ({ onSelectTrain }) => {
  const [pnrInput, setPnrInput] = useState<string>("2451234567");
  const [pnrData, setPnrData] = useState<PNRResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (pnrToFetch?: string) => {
    const target = (pnrToFetch || pnrInput).trim();
    if (target.length !== 10) {
      setError("Please enter a valid 10-digit PNR number.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await getPnrStatus(target);
    setLoading(false);
    if (res) {
      setPnrData(res);
    } else {
      setError("Could not retrieve PNR booking details. Please verify the 10 digits.");
    }
  };

  const handleQuickPnr = (pnr: string) => {
    setPnrInput(pnr);
    handleSearch(pnr);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Search Card */}
      <View style={styles.searchCard}>
        <Text style={styles.cardHeader}>INDIAN RAILWAYS PNR STATUS & LIVE TRIP TRACKING</Text>

        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.pnrInput}
            placeholder="Enter 10-digit PNR (e.g. 2451234567)"
            placeholderTextColor="#94a3b8"
            keyboardType="number-pad"
            maxLength={10}
            value={pnrInput}
            onChangeText={(txt) => {
              setPnrInput(txt);
              setError(null);
            }}
          />
          <TouchableOpacity
            style={[styles.searchButton, pnrInput.length !== 10 && styles.searchButtonDisabled]}
            disabled={pnrInput.length !== 10 || loading}
            onPress={() => handleSearch()}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.searchButtonText}>Check Status ➔</Text>
            )}
          </TouchableOpacity>
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {/* Quick Demo PNR Pills */}
        <View style={styles.quickPillsRow}>
          <Text style={styles.quickLabel}>DEMO PNRS:</Text>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickPnr("2451234567")}>
            <Text style={styles.quickPillText}>2451234567 (Tejas Raj)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickPill} onPress={() => handleQuickPnr("6234567890")}>
            <Text style={styles.quickPillText}>6234567890 (Rajdhani)</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* PNR Booking Result Card */}
      {pnrData && (
        <View style={styles.resultCard}>
          {/* Header */}
          <View style={styles.resultHeader}>
            <View>
              <View style={styles.pnrBadge}>
                <Text style={styles.pnrBadgeText}>PNR #{pnrData.pnr}</Text>
              </View>
              <Text style={styles.trainTitle} numberOfLines={1}>
                {pnrData.train_name}
              </Text>
              <Text style={styles.trainNumberSub}>Train #{pnrData.train_number}</Text>
            </View>
            <View style={styles.chartPill}>
              <Text style={styles.chartText}>Chart Prepared 🟢</Text>
            </View>
          </View>

          {/* Route Section */}
          <View style={styles.routeBox}>
            <View style={styles.routeCol}>
              <Text style={styles.stationCode}>{pnrData.from_station_code}</Text>
              <Text style={styles.stationName} numberOfLines={1}>{pnrData.from_station_name}</Text>
              <Text style={styles.timeTag}>Dep: {pnrData.boarding_time}</Text>
            </View>

            <View style={styles.arrowBox}>
              <Text style={styles.dateTag}>{pnrData.date_of_journey}</Text>
              <View style={styles.arrowLine} />
              <Text style={styles.arrowIcon}>➔</Text>
            </View>

            <View style={styles.routeColRight}>
              <Text style={styles.stationCode}>{pnrData.to_station_code}</Text>
              <Text style={styles.stationName} numberOfLines={1}>{pnrData.to_station_name}</Text>
              <Text style={styles.timeTag}>Destination</Text>
            </View>
          </View>

          {/* Passenger Berth Cards */}
          <Text style={styles.sectionHeading}>PASSENGER BERTH ALLOCATION</Text>
          <View style={styles.passengersList}>
            {pnrData.passengers.map((p, idx) => (
              <View key={idx} style={styles.passengerRow}>
                <View style={styles.pLeft}>
                  <Text style={styles.pNum}>Passenger {p.number}</Text>
                  <Text style={styles.pBerth}>
                    Coach {p.coach} • Berth {p.berth}
                  </Text>
                </View>
                <View style={styles.pStatusBadge}>
                  <Text style={styles.pStatusText}>{p.current_status}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Primary Action Button to Live Tracker */}
          <TouchableOpacity
            style={styles.trackTrainButton}
            onPress={() => onSelectTrain(pnrData.train_number)}
          >
            <Text style={styles.trackTrainText}>
              📍 Track Train #{pnrData.train_number} Live on Map & Dynamic ETA ➔
            </Text>
          </TouchableOpacity>

          <Text style={styles.sourceFootnote}>
            Verified via {pnrData.source === "CRIS_LIVE" ? "CRIS NTES Live Enquiry" : "Indian Railways PRS Central Network"}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 30,
  },
  searchCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
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
  inputWrapper: {
    flexDirection: "row",
    gap: 8,
  },
  pnrInput: {
    flex: 1,
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: "#0f172a",
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    fontWeight: "800",
    letterSpacing: 1,
  },
  searchButton: {
    backgroundColor: "#2563eb",
    borderRadius: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  searchButtonDisabled: {
    backgroundColor: "#94a3b8",
  },
  searchButtonText: {
    color: "#ffffff",
    fontWeight: "800",
    fontSize: 13,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    marginTop: 8,
    fontWeight: "600",
  },
  quickPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    flexWrap: "wrap",
  },
  quickLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
  },
  quickPill: {
    backgroundColor: "#eff6ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },
  quickPillText: {
    fontSize: 11,
    color: "#1d4ed8",
    fontWeight: "700",
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    paddingBottom: 14,
    marginBottom: 14,
  },
  pnrBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
  },
  pnrBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#475569",
    letterSpacing: 0.5,
  },
  trainTitle: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
    maxWidth: 200,
  },
  trainNumberSub: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "700",
    marginTop: 1,
  },
  chartPill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  chartText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#15803d",
  },
  routeBox: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  routeCol: {
    flex: 1,
  },
  routeColRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  stationCode: {
    fontSize: 16,
    fontWeight: "900",
    color: "#0f172a",
  },
  stationName: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },
  timeTag: {
    fontSize: 10,
    color: "#2563eb",
    fontWeight: "700",
    marginTop: 2,
  },
  arrowBox: {
    alignItems: "center",
    paddingHorizontal: 10,
  },
  dateTag: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700",
    marginBottom: 2,
  },
  arrowLine: {
    width: 40,
    height: 2,
    backgroundColor: "#cbd5e1",
  },
  arrowIcon: {
    fontSize: 12,
    color: "#64748b",
    marginTop: -8,
  },
  sectionHeading: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  passengersList: {
    gap: 8,
    marginBottom: 16,
  },
  passengerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  pLeft: {
    flex: 1,
  },
  pNum: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "700",
  },
  pBerth: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
    marginTop: 1,
  },
  pStatusBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  pStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803d",
  },
  trackTrainButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  trackTrainText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13,
  },
  sourceFootnote: {
    textAlign: "center",
    fontSize: 9,
    color: "#94a3b8",
    marginTop: 10,
    fontWeight: "500",
  },
});
