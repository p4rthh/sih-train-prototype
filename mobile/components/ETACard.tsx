import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DynamicETA } from "../types";

interface Props {
  dynamicETA: DynamicETA;
  forecastedDelayMin: number;
}

export const ETACard: React.FC<Props> = ({ dynamicETA, forecastedDelayMin }) => {
  const { point_estimate, confidence_90 } = dynamicETA;

  return (
    <View style={styles.card}>
      {/* Top Tagline */}
      <View style={styles.headerRow}>
        <Text style={styles.subtitle}>AI PREDICTED ARRIVAL WINDOW</Text>
        <View style={styles.guaranteeBadge}>
          <Text style={styles.guaranteeText}>90% CQR Verified</Text>
        </View>
      </View>

      {/* Hero Interval */}
      <View style={styles.intervalContainer}>
        <Text style={styles.intervalText}>
          {confidence_90.lower} – {confidence_90.upper}
        </Text>
      </View>

      {/* Visual Confidence Range Bar */}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View style={styles.barFill} />
          {/* Target marker in middle */}
          <View style={styles.pointMarker}>
            <View style={styles.markerDot} />
          </View>
        </View>
        <View style={styles.barLabels}>
          <Text style={styles.boundLabel}>Earliest ({confidence_90.lower})</Text>
          <Text style={styles.pointLabel}>Target ({point_estimate})</Text>
          <Text style={styles.boundLabel}>Latest ({confidence_90.upper})</Text>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footerRow}>
        <Text style={styles.probableText}>
          Most probable arrival: <Text style={styles.highlightText}>{point_estimate}</Text>
        </Text>
        <Text style={styles.delayNote}>
          {forecastedDelayMin > 0 ? `(+${Math.round(forecastedDelayMin)}m delay expected)` : "(On Time)"}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: "#bfdbfe",
    shadowColor: "#2563eb",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1e40af",
    letterSpacing: 0.8,
  },
  guaranteeBadge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  guaranteeText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
  },
  intervalContainer: {
    marginVertical: 4,
  },
  intervalText: {
    fontSize: 30,
    fontWeight: "900",
    color: "#1e3a8a",
    letterSpacing: -0.5,
  },
  barContainer: {
    marginVertical: 10,
  },
  barBackground: {
    height: 8,
    backgroundColor: "#dbeafe",
    borderRadius: 4,
    position: "relative",
    justifyContent: "center",
  },
  barFill: {
    position: "absolute",
    left: "10%",
    right: "10%",
    height: 8,
    backgroundColor: "#3b82f6",
    borderRadius: 4,
  },
  pointMarker: {
    position: "absolute",
    left: "50%",
    marginLeft: -6,
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#1d4ed8",
    alignItems: "center",
    justifyContent: "center",
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1d4ed8",
  },
  barLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  boundLabel: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
  },
  pointLabel: {
    fontSize: 10,
    color: "#1d4ed8",
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#dbeafe",
    paddingTop: 8,
  },
  probableText: {
    fontSize: 12,
    color: "#334155",
  },
  highlightText: {
    fontWeight: "800",
    color: "#0f172a",
  },
  delayNote: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
  },
});
