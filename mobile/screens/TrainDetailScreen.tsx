import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from "react-native";
import { useTrainStream } from "../hooks/useTrainStream";
import { TrainSearchBar } from "../components/TrainSearchBar";
import { TrainStatusBanner } from "../components/TrainStatusBanner";
import { ETACard } from "../components/ETACard";
import { DelayReasonCard } from "../components/DelayReasonCard";
import { LiveTrackMap } from "../components/LiveTrackMap";
import { StationTimeline } from "../components/StationTimeline";

interface Props {
  initialTrainNo?: string;
  onSelectStation?: (stationCode: string) => void;
}

export const TrainDetailScreen: React.FC<Props> = ({ initialTrainNo = "12952", onSelectStation }) => {
  const [selectedTrainNo, setSelectedTrainNo] = useState<string>(initialTrainNo);
  const { data, isConnected, error, refresh } = useTrainStream(selectedTrainNo);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleTrainSelected = (trainNo: string) => {
    setSelectedTrainNo(trainNo);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#2563eb" />}
      >
        {/* Search Header */}
        <TrainSearchBar onSelectTrain={handleTrainSelected} />

        {/* Loading State */}
        {!data && !error && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.loadingText}>Fetching live telemetry for Train #{selectedTrainNo}...</Text>
          </View>
        )}

        {/* Error State */}
        {error && !data && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Could not connect to train telemetry</Text>
            <Text style={styles.errorMsg}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
              <Text style={styles.retryBtnText}>Retry Connection</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Main Telemetry & Prediction Content */}
        {data && (
          <>
            {/* 1. Status Banner */}
            <TrainStatusBanner data={data} isConnected={isConnected} />

            {/* 2. Hero CQR Dynamic ETA Card */}
            <ETACard dynamicETA={data.dynamic_eta} forecastedDelayMin={data.forecasted_delay_min} />

            {/* 3. SHAP Explainable Delay Reasons */}
            <DelayReasonCard reasons={data.delay_reasons} />

            {/* 4. Live Railway Track Map */}
            <LiveTrackMap
              lat={data.lat}
              lon={data.lon}
              speedKmh={data.speed_kmh}
              stops={data.route_progress}
              trainNo={data.train_no}
            />

            {/* 5. Route Journey Timeline */}
            <StationTimeline stops={data.route_progress} />
          </>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: "#64748b",
    marginTop: 12,
    fontSize: 14,
    fontWeight: "500",
  },
  errorBox: {
    backgroundColor: "#fef2f2",
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: "#fca5a5",
    alignItems: "center",
    marginTop: 20,
  },
  errorTitle: {
    color: "#991b1b",
    fontWeight: "700",
    fontSize: 15,
    marginBottom: 4,
  },
  errorMsg: {
    color: "#b91c1c",
    fontSize: 12,
    textAlign: "center",
    marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
});
