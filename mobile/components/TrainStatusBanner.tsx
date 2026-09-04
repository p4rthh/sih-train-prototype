import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ETAResponse } from "../types";

interface Props {
  data: ETAResponse;
  isConnected: boolean;
}

export const TrainStatusBanner: React.FC<Props> = ({ data, isConnected }) => {
  const isNotRunning = data.run_status === "NOT_RUNNING_TODAY";
  const isCancelled = data.run_status === "CANCELLED";
  const isYetToStart = data.run_status === "YET_TO_START";
  const isCompleted = data.run_status === "COMPLETED";
  const isDelayed = data.forecasted_delay_min > 5;
  const isSevere = data.forecasted_delay_min > 20;

  let pillStyle = styles.pillOnTime;
  let textStyle = styles.textOnTime;
  let statusTitle = "On Time";

  if (isCancelled) {
    pillStyle = styles.pillSevere;
    textStyle = styles.textSevere;
    statusTitle = "Cancelled";
  } else if (isNotRunning) {
    pillStyle = styles.pillNotRunning;
    textStyle = styles.textNotRunning;
    statusTitle = "Not Running Today";
  } else if (isYetToStart) {
    pillStyle = styles.pillYetToStart;
    textStyle = styles.textYetToStart;
    statusTitle = "Yet to Start";
  } else if (isCompleted) {
    pillStyle = styles.pillCompleted;
    textStyle = styles.textCompleted;
    statusTitle = "Arrived";
  } else if (isSevere) {
    pillStyle = styles.pillSevere;
    textStyle = styles.textSevere;
    statusTitle = `Delayed ${Math.round(data.forecasted_delay_min)}m`;
  } else if (isDelayed) {
    pillStyle = styles.pillDelayed;
    textStyle = styles.textDelayed;
    statusTitle = `Delayed ${Math.round(data.forecasted_delay_min)}m`;
  }

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
        <View style={[styles.statusPill, pillStyle]}>
          <Text style={[styles.statusText, textStyle]}>{statusTitle}</Text>
        </View>
      </View>

      {/* Metric Counters */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>
            {isNotRunning || isCancelled ? "SOURCE" : isYetToStart ? "ORIGIN (PLATFORM)" : isCompleted ? "TERMINAL" : "CURRENT STOP"}
          </Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {data.current_station_name}
          </Text>
          <Text style={styles.metricSub}>{data.current_station_code}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>
            {isNotRunning || isCancelled ? "DESTINATION" : isYetToStart ? "FIRST STOP" : isCompleted ? "SERVICE" : "NEXT STOP"}
          </Text>
          <Text style={styles.metricValue} numberOfLines={1}>
            {isCompleted ? "Completed" : data.next_station_name}
          </Text>
          <Text style={styles.metricSub}>{isCompleted ? "FINAL" : data.next_station_code}</Text>
        </View>

        <View style={styles.metricDivider} />

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>LIVE SPEED</Text>
          <Text style={styles.metricValue}>
            {isNotRunning || isCancelled || isYetToStart || isCompleted ? "0" : Math.round(data.speed_kmh)}
          </Text>
          <Text style={styles.metricSub}>
            {isNotRunning ? "Not Running" : isCancelled ? "Cancelled" : isYetToStart ? "Waiting" : isCompleted ? "Arrived" : "km/h"}
          </Text>
        </View>
      </View>

      {/* Real-time NTES Position Callout */}
      {data.live_position_desc && (
        <View style={styles.livePosBanner}>
          <Text style={styles.livePosIcon}>📡</Text>
          <Text style={styles.livePosText} numberOfLines={2}>
            {data.live_position_desc}
          </Text>
        </View>
      )}

      {/* Model B ST-GCN + Model A Ensemble Badge */}
      <View style={styles.ensembleRow}>
        <View style={styles.ensembleTag}>
          <Text style={styles.ensembleTagText}>⚡ ST-GCN + LightGBM Ensemble</Text>
        </View>
        {data.model_b_stgcn_delta !== undefined && (
          <Text style={styles.modelBText}>
            Graph Cascade: {data.model_b_stgcn_delta >= 0 ? `+${data.model_b_stgcn_delta}` : data.model_b_stgcn_delta}m
          </Text>
        )}
      </View>

      {/* Historical Behavioral Recovery Badge */}
      {data.dest_delay_recovery_min !== undefined && data.dest_delay_recovery_min > 3 && (
        <View style={styles.recoveryBanner}>
          <Text style={styles.recoveryIcon}>🌙</Text>
          <View style={styles.recoveryTextCol}>
            <Text style={styles.recoveryTitle}>
              Catch-Up Dynamic: -{Math.round(data.dest_delay_recovery_min)}m Projected Recovery
            </Text>
            <Text style={styles.recoverySub}>
              {data.is_overnight_recovery_active
                ? "Overnight green corridor & timetable slack recovering delay before terminal"
                : "Scheduled buffer margin absorption closing intermediate delay before arrival"}
              {data.historical_on_time_pct ? ` • ${Math.round(data.historical_on_time_pct)}% Punctuality Score` : ""}
            </Text>
          </View>
        </View>
      )}

      {/* Streaming Health Dot */}
      <View style={styles.footerRow}>
        <View style={styles.streamIndicator}>
          <View style={[styles.dot, isConnected ? styles.dotLive : styles.dotOffline]} />
          <Text style={styles.streamText}>
            {data.telemetry_source === "NTES_REALTIME"
              ? "Live NTES Telemetry + Kinematic AI"
              : "Real-Time Operational Schedule + Kinematic AI"}
          </Text>
        </View>
        <Text style={styles.schedText}>Sched: {data.scheduled_arrival}</Text>
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
  pillNotRunning: {
    backgroundColor: "#334155",
  },
  pillYetToStart: {
    backgroundColor: "#1e3a8a",
  },
  pillCompleted: {
    backgroundColor: "#134e4a",
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
  textNotRunning: {
    color: "#cbd5e1",
  },
  textYetToStart: {
    color: "#93c5fd",
  },
  textCompleted: {
    color: "#5eead4",
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
  livePosBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    borderWidth: 1,
    borderColor: "#3b82f6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  livePosIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  livePosText: {
    fontSize: 11,
    color: "#93c5fd",
    fontWeight: "600",
    flex: 1,
  },
  ensembleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.3)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  ensembleTag: {
    flexDirection: "row",
    alignItems: "center",
  },
  ensembleTagText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#c4b5fd",
    letterSpacing: 0.5,
  },
  modelBText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#a78bfa",
  },
  recoveryBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.35)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  recoveryIcon: {
    fontSize: 16,
    marginRight: 8,
    marginTop: 1,
  },
  recoveryTextCol: {
    flex: 1,
  },
  recoveryTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#6ee7b7",
    marginBottom: 2,
  },
  recoverySub: {
    fontSize: 11,
    color: "#a7f3d0",
    lineHeight: 15,
  },
});
