import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ETAResponse } from "../types";

interface Props {
  data: ETAResponse;
  isConnected: boolean;
}

export const TrainStatusBanner: React.FC<Props> = ({ data, isConnected }) => {
  const isDelayed = data.forecasted_delay_min > 5;
  const isSevere = data.forecasted_delay_min > 20;

  return (
    <View style={styles.card}>
      {/* Top Header */}
      <View style={styles.topRow}>
        <View style={styles.trainInfo}>
          <Text style={styles.trainNumberBadge}>TRAIN #{data.train_no}</Text>
          <Text style={styles.trainName} numberOfLines={1}>
            {data.train_name}
          </Text>
        </View>
        <View
          style={[
            styles.statusPill,
            isSevere ? styles.pillSevere : isDelayed ? styles.pillDelayed : styles.pillOnTime,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              isSevere ? styles.textSevere : isDelayed ? styles.textDelayed : styles.textOnTime,
            ]}
          >
            {isDelayed ? `Delayed ${Math.round(data.forecasted_delay_min)}m` : "On Time"}
          </Text>
        </View>
      </View>

      {/* Metric Counters */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>CURRENT STOP</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {data.current_station_name}
          </Text>
          <Text style={styles.metricSub}>{data.current_station_code}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>NEXT STOP</Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {data.next_station_name}
          </Text>
          <Text style={styles.metricSub}>{data.next_station_code}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>LIVE SPEED</Text>
          <Text style={styles.metricValue}>{Math.round(data.speed_kmh)}</Text>
          <Text style={styles.metricSub}>km/h</Text>
        </View>
      </View>

      {/* Streaming Health Dot */}
      <View style={styles.footerRow}>
        <View style={styles.streamIndicator}>
          <View style={[styles.dot, isConnected ? styles.dotLive : styles.dotOffline]} />
          <Text style={styles.streamText}>
            {isConnected ? "Live Satellite Telemetry (RTIS)" : "Connecting..."}
          </Text>
        </View>
        <Text style={styles.schedText}>Sched Arr: {data.scheduled_arrival}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  trainInfo: {
    flex: 1,
    marginRight: 8,
  },
  trainNumberBadge: {
    fontSize: 11,
    color: "#60a5fa",
    fontWeight: "800",
    letterSpacing: 1,
    marginBottom: 2,
  },
  trainName: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  pillOnTime: {
    backgroundColor: "#14532d",
  },
  pillDelayed: {
    backgroundColor: "#78350f",
  },
  pillSevere: {
    backgroundColor: "#7f1d1d",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  textOnTime: {
    color: "#4ade80",
  },
  textDelayed: {
    color: "#fbbf24",
  },
  textSevere: {
    color: "#f87171",
  },
  metricsRow: {
    flexDirection: "row",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 8,
    marginBottom: 12,
    alignItems: "center",
  },
  metricBox: {
    flex: 1,
    alignItems: "center",
  },
  metricLabel: {
    fontSize: 9,
    color: "#94a3b8",
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  metricValue: {
    fontSize: 15,
    fontWeight: "800",
    color: "#f8fafc",
  },
  metricSub: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
  metricDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#334155",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  streamIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  dotLive: {
    backgroundColor: "#22c55e",
  },
  dotOffline: {
    backgroundColor: "#eab308",
  },
  streamText: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "500",
  },
  schedText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
  },
});
