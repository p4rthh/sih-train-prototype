import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { RouteStop } from "../types";

interface Props {
  lat: number;
  lon: number;
  speedKmh: number;
  stops: RouteStop[];
  trainNo: string;
}

const { width } = Dimensions.get("window");

export const LiveTrackMap: React.FC<Props> = ({ lat, lon, speedKmh, stops, trainNo }) => {
  // Find current active stop
  const currentStop = stops.find((s) => s.status === "current") || stops[0];
  const nextStop = stops.find((s) => s.status === "upcoming") || stops[1] || stops[0];

  return (
    <View style={styles.card}>
      {/* Map Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.title}>LIVE RAILWAY TRACK GEOMETRY</Text>
        </View>
        <View style={styles.speedPill}>
          <Text style={styles.speedText}>{Math.round(speedKmh)} km/h</Text>
        </View>
      </View>

      {/* Visual Track Map Canvas */}
      <View style={styles.mapCanvas}>
        {/* Background Track Grid Lines */}
        <View style={styles.gridLine1} />
        <View style={styles.gridLine2} />

        {/* The Track Polyline */}
        <View style={styles.trackLine} />

        {/* Station Markers along track */}
        <View style={styles.stationsRow}>
          {/* Origin Station */}
          <View style={styles.stationMarkerBox}>
            <View style={[styles.stationDot, styles.dotPassed]} />
            <Text style={styles.stationCode} numberOfLines={1}>
              {stops[0]?.station_code || "START"}
            </Text>
            <Text style={styles.stationTime}>{stops[0]?.scheduled_departure || "16:30"}</Text>
          </View>

          {/* Current Section & Moving Train Dot */}
          <View style={styles.activeSectionBox}>
            <View style={styles.trainMarkerWrapper}>
              <View style={styles.trainGlowRing} />
              <View style={styles.trainDot}>
                <Text style={styles.locoIcon}>🚆</Text>
              </View>
            </View>
            <View style={styles.trainLabelCard}>
              <Text style={styles.trainLabelText}>Train #{trainNo}</Text>
              <Text style={styles.telemetryMini}>
                {lat.toFixed(3)}°N, {lon.toFixed(3)}°E
              </Text>
            </View>
          </View>

          {/* Next Approaching Station */}
          <View style={styles.stationMarkerBox}>
            <View style={[styles.stationDot, styles.dotNext]} />
            <Text style={styles.stationCode} numberOfLines={1}>
              {nextStop?.station_code || "NEXT"}
            </Text>
            <Text style={styles.stationTime}>{nextStop?.eta || nextStop?.scheduled_arrival || "ETA"}</Text>
          </View>

          {/* Final Destination */}
          <View style={styles.stationMarkerBox}>
            <View style={[styles.stationDot, styles.dotUpcoming]} />
            <Text style={styles.stationCode} numberOfLines={1}>
              {stops[stops.length - 1]?.station_code || "DEST"}
            </Text>
            <Text style={styles.stationTime}>{stops[stops.length - 1]?.scheduled_arrival || "END"}</Text>
          </View>
        </View>
      </View>

      {/* Telemetry Footer Bar */}
      <View style={styles.telemetryBar}>
        <View style={styles.telemetryCol}>
          <Text style={styles.telemLabel}>LATITUDE</Text>
          <Text style={styles.telemVal}>{lat.toFixed(5)}° N</Text>
        </View>
        <View style={styles.telemetryDivider} />
        <View style={styles.telemetryCol}>
          <Text style={styles.telemLabel}>LONGITUDE</Text>
          <Text style={styles.telemVal}>{lon.toFixed(5)}° E</Text>
        </View>
        <View style={styles.telemetryDivider} />
        <View style={styles.telemetryCol}>
          <Text style={styles.telemLabel}>NAV SATELLITES</Text>
          <Text style={styles.telemVal}>NavIC (Lock)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  mapIcon: {
    fontSize: 14,
    marginRight: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.8,
  },
  speedPill: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  speedText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#15803d",
  },
  mapCanvas: {
    height: 140,
    backgroundColor: "#090d16",
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
    justifyContent: "center",
  },
  gridLine1: {
    position: "absolute",
    top: 40,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#1e293b",
  },
  gridLine2: {
    position: "absolute",
    top: 90,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#1e293b",
  },
  trackLine: {
    position: "absolute",
    left: 20,
    right: 20,
    height: 4,
    backgroundColor: "#334155",
    borderRadius: 2,
  },
  stationsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    zIndex: 10,
  },
  stationMarkerBox: {
    alignItems: "center",
    width: 60,
  },
  stationDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: "#ffffff",
    marginBottom: 4,
  },
  dotPassed: {
    backgroundColor: "#22c55e",
  },
  dotNext: {
    backgroundColor: "#eab308",
    borderColor: "#fef08a",
  },
  dotUpcoming: {
    backgroundColor: "#64748b",
  },
  stationCode: {
    color: "#f8fafc",
    fontSize: 11,
    fontWeight: "800",
  },
  stationTime: {
    color: "#94a3b8",
    fontSize: 9,
    fontWeight: "600",
  },
  activeSectionBox: {
    alignItems: "center",
    flex: 1,
  },
  trainMarkerWrapper: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  trainGlowRing: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(59, 130, 246, 0.3)",
  },
  trainDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#ffffff",
    shadowColor: "#3b82f6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  locoIcon: {
    fontSize: 12,
  },
  trainLabelCard: {
    backgroundColor: "rgba(15, 23, 42, 0.9)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#334155",
    alignItems: "center",
  },
  trainLabelText: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "800",
  },
  telemetryMini: {
    color: "#94a3b8",
    fontSize: 8,
    fontFamily: "monospace",
  },
  telemetryBar: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginTop: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  telemetryCol: {
    flex: 1,
    alignItems: "center",
  },
  telemetryDivider: {
    width: 1,
    height: 20,
    backgroundColor: "#e2e8f0",
  },
  telemLabel: {
    fontSize: 8,
    color: "#64748b",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  telemVal: {
    fontSize: 11,
    color: "#0f172a",
    fontWeight: "800",
    marginTop: 1,
  },
});
