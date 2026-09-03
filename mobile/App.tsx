import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View, Text, TouchableOpacity, Modal, TextInput, Alert } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { TrainDetailScreen } from "./screens/TrainDetailScreen";
import { StationBoardScreen } from "./screens/StationBoardScreen";
import { getActiveHost, setCustomHost, getApiBaseUrl } from "./services/api";

export default function App() {
  const [activeTab, setActiveTab] = useState<"tracker" | "station">("tracker");
  const [activeTrainNo, setActiveTrainNo] = useState<string>("12952");
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);
  const [tempHost, setTempHost] = useState<string>(getActiveHost());
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const handleSelectTrainFromBoard = (trainNo: string) => {
    setActiveTrainNo(trainNo);
    setActiveTab("tracker");
  };

  const handleSaveHost = () => {
    if (tempHost.trim()) {
      setCustomHost(tempHost.trim());
      setShowConfigModal(false);
      setRefreshKey((k) => k + 1);
      Alert.alert("Server Configured", `Backend set to ${getApiBaseUrl()}`);
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        {/* Top Application Header */}
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <View style={styles.headerTitleRow}>
              <Text style={styles.headerIcon}>🚆</Text>
              <View>
                <Text style={styles.headerBrand}>RailPravah AI</Text>
                <Text style={styles.headerSub}>Dynamic ETA & Explainable Delay Engine</Text>
              </View>
            </View>

            {/* Configurable Server IP Pill */}
            <TouchableOpacity style={styles.serverPill} onPress={() => setShowConfigModal(true)}>
              <View style={styles.serverDot} />
              <Text style={styles.serverPillText} numberOfLines={1}>
                {getActiveHost()}:8000
              </Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Tabs */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "tracker" && styles.tabBtnActive]}
              onPress={() => setActiveTab("tracker")}
            >
              <Text style={[styles.tabText, activeTab === "tracker" && styles.tabTextActive]}>
                Live Train Tracker
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "station" && styles.tabBtnActive]}
              onPress={() => setActiveTab("station")}
            >
              <Text style={[styles.tabText, activeTab === "station" && styles.tabTextActive]}>
                Station Board
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Screen Content */}
        <View style={styles.content} key={refreshKey}>
          {activeTab === "tracker" ? (
            <TrainDetailScreen initialTrainNo={activeTrainNo} />
          ) : (
            <StationBoardScreen onSelectTrain={handleSelectTrainFromBoard} />
          )}
        </View>

        {/* Server IP Config Modal */}
        <Modal visible={showConfigModal} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Configure Backend Server IP</Text>
              <Text style={styles.modalDesc}>
                If running on a physical phone via Expo Go, enter your computer's local Wi-Fi IP address (e.g. 192.168.1.x) or localhost:
              </Text>
              <TextInput
                style={styles.modalInput}
                value={tempHost}
                onChangeText={setTempHost}
                placeholder="e.g. 192.168.1.15 or 10.0.2.2"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setShowConfigModal(false)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveHost}>
                  <Text style={styles.modalSaveText}>Connect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090d16",
  },
  header: {
    backgroundColor: "#090d16",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  headerIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  headerBrand: {
    fontSize: 18,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "500",
  },
  serverPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    maxWidth: 130,
  },
  serverDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#22c55e",
    marginRight: 5,
  },
  serverPillText: {
    color: "#94a3b8",
    fontSize: 10,
    fontWeight: "600",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 3,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#2563eb",
  },
  tabText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94a3b8",
  },
  tabTextActive: {
    color: "#ffffff",
  },
  content: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalBox: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    width: "100%",
    maxWidth: 380,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: 8,
  },
  modalDesc: {
    fontSize: 12,
    color: "#64748b",
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: "#0f172a",
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  modalCancelText: {
    color: "#64748b",
    fontWeight: "600",
    fontSize: 13,
  },
  modalSaveBtn: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
});
