import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { DelayReason } from "../types";

interface Props {
  reasons: DelayReason[];
}

export const DelayReasonCard: React.FC<Props> = ({ reasons }) => {
  if (!reasons || reasons.length === 0) return null;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.headerIcon}>⚠️</Text>
        <Text style={styles.headerTitle}>WHY IS THIS TRAIN DELAYED?</Text>
      </View>

      <View style={styles.reasonsList}>
        {reasons.map((item, idx) => {
          const isHigh = item.severity === "HIGH";
          const isMed = item.severity === "MEDIUM";

          // Extract leading emoji if present
          const parts = item.reason.split(" ");
          const emoji = parts[0];
          const text = parts.slice(1).join(" ");

          return (
            <View key={idx} style={styles.reasonRow}>
              <View style={styles.leftCol}>
                <Text style={styles.reasonEmoji}>{emoji}</Text>
                <Text style={styles.reasonText}>{text || item.reason}</Text>
              </View>

              <View style={styles.rightCol}>
                <View
                  style={[
                    styles.severityBadge,
                    isHigh ? styles.badgeHigh : isMed ? styles.badgeMed : styles.badgeLow,
                  ]}
                >
                  <Text
                    style={[
                      styles.severityText,
                      isHigh ? styles.textHigh : isMed ? styles.textMed : styles.textLow,
                    ]}
                  >
                    {item.impact_min > 0 ? `+${item.impact_min}m` : "Normal"}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      <Text style={styles.footerNote}>
        🔍 Causal explanation generated in real-time via Tree-SHAP interpretability engine
      </Text>
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
    alignItems: "center",
    marginBottom: 12,
  },
  headerIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.5,
  },
  reasonsList: {
    gap: 8,
  },
  reasonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  leftCol: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  reasonEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  reasonText: {
    fontSize: 12,
    color: "#1e293b",
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  rightCol: {
    alignItems: "flex-end",
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  badgeHigh: {
    backgroundColor: "#fef2f2",
    borderColor: "#fca5a5",
  },
  badgeMed: {
    backgroundColor: "#fffbeb",
    borderColor: "#fcd34d",
  },
  badgeLow: {
    backgroundColor: "#f0fdf4",
    borderColor: "#86efac",
  },
  severityText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textHigh: {
    color: "#b91c1c",
  },
  textMed: {
    color: "#b45309",
  },
  textLow: {
    color: "#15803d",
  },
  footerNote: {
    fontSize: 10,
    color: "#94a3b8",
    fontStyle: "italic",
    marginTop: 10,
    textAlign: "center",
  },
});
