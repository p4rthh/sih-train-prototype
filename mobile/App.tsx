import React, { useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity } from "react-native";
import { TrainDetailScreen } from "./screens/TrainDetailScreen";
import { StationBoardScreen } from "./screens/StationBoardScreen";

export default function App() {
  const [activeTab, setActiveTab] = useState<"tracker" | "station">("tracker");
  const [activeTrainNo, setActiveTrainNo] = useState<string>("12952");

  const handleSelectTrainFromBoard = (trainNo: string) => {
    setActiveTrainNo(trainNo);
    setActiveTab("tracker");
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Top Application Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerIcon}>🚆</Text>
          <View>
            <Text style={styles.headerBrand}>RailPravah AI</Text>
            <Text style={styles.headerSub}>Indian Railways Dynamic ETA & Explainable Delay Engine</Text>
          </View>
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
      <View style={styles.content}>
        {activeTab === "tracker" ? (
          <TrainDetailScreen initialTrainNo={activeTrainNo} />
        ) : (
          <StationBoardScreen onSelectTrain={handleSelectTrainFromBoard} />
        )}
      </View>
    </SafeAreaView>
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
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: "900",
    color: "#ffffff",
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "500",
    marginTop: 1,
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
});
