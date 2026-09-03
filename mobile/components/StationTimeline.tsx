import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RouteStop } from "../types";

interface Props {
  stops: RouteStop[];
}

export const StationTimeline: React.FC<Props> = ({ stops }) => {
  if (!stops || stops.length === 0) return null;

  // Filter to major stops or sample every N if > 25 to keep clean view
  const displayStops = stops.length > 25 
    ? stops.filter((s, idx) => idx === 0 || idx === stops.length - 1 || s.status === "current" || idx % 4 === 0)
    : stops;

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>ROUTE JOURNEY & LIVE MILESTONES</Text>

      <View style={styles.timelineList}>
        {displayStops.map((stop, idx) => {
          const isDeparted = stop.status === "departed";
          const isCurrent = stop.status === "current";
          const isUpcoming = stop.status === "upcoming";

          return (
            <View key={idx} style={styles.timelineRow}>
              {/* Left Column: Scheduled & ETA times */}
              <View style={styles.timeCol}>
                <Text style={styles.timeMain}>
                  {isUpcoming ? (stop.eta || "--:--") : (stop.scheduled_arrival || stop.scheduled_departure || "--:--")}
                </Text>
                <Text style={styles.timeSub}>
                  {isUpcoming ? "Forecast" : (isCurrent ? "At Station" : "Departed")}
                </Text>
              </View>

              {/* Center Column: Node icon + connecting line */}
              <View style={styles.nodeCol}>
                <View
                  style={[
                    styles.nodeDot,
                    isDeparted ? styles.dotDeparted : isCurrent ? styles.dotCurrent : styles.dotUpcoming,
                  ]}
                >
                  {isDeparted && <Text style={styles.dotCheck}>✓</Text>}
                  {isCurrent && <View style={styles.dotInner} />}
                </View>
                {idx < displayStops.length - 1 && (
                  <View
                    style={[
                      styles.connectorLine,
                      isDeparted ? styles.lineDeparted : styles.lineUpcoming,
                    ]}
                  />
                )}
              </View>

              {/* Right Column: Station metadata & delay pill */}
              <View style={styles.infoCol}>
                <View style={styles.stationNameRow}>
                  <Text style={[styles.stnName, isCurrent && styles.stnNameCurrent]} numberOfLines={1}>
                    {stop.station_name}
                  </Text>
                  <Text style={styles.stnCode}>({stop.station_code})</Text>
                </View>

                {stop.delay_min !== undefined && stop.delay_min !== null && (
                  <View style={styles.delayTagRow}>
                    <Text
                      style={[
                        styles.delayTag,
                        stop.delay_min > 5 ? styles.delayLate : styles.delayOnTime,
                      ]}
                    >
                      {stop.delay_min > 0 ? `+${Math.round(stop.delay_min)}m` : "On Time"}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0f172a",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 52,
  },
  timeCol: {
    width: 65,
    alignItems: "flex-end",
    paddingRight: 12,
  },
  timeMain: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0f172a",
  },
  timeSub: {
    fontSize: 9,
    color: "#64748b",
    fontWeight: "600",
  },
  nodeCol: {
    width: 20,
    alignItems: "center",
    position: "relative",
  },
  nodeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  dotDeparted: {
    backgroundColor: "#22c55e",
  },
  dotCurrent: {
    backgroundColor: "#2563eb",
    borderWidth: 3,
    borderColor: "#bfdbfe",
  },
  dotUpcoming: {
    backgroundColor: "#e2e8f0",
    borderWidth: 2,
    borderColor: "#cbd5e1",
  },
  dotCheck: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
  },
  dotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#ffffff",
  },
  connectorLine: {
    position: "absolute",
    top: 18,
    bottom: -6,
    width: 2,
    zIndex: 1,
  },
  lineDeparted: {
    backgroundColor: "#86efac",
  },
  lineUpcoming: {
    backgroundColor: "#e2e8f0",
  },
  infoCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  stationNameRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stnName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
  },
  stnNameCurrent: {
    color: "#1d4ed8",
    fontWeight: "900",
  },
  stnCode: {
    fontSize: 11,
    color: "#64748b",
    marginLeft: 4,
    fontWeight: "500",
  },
  delayTagRow: {
    marginTop: 2,
  },
  delayTag: {
    fontSize: 10,
    fontWeight: "700",
  },
  delayLate: {
    color: "#d97706",
  },
  delayOnTime: {
    color: "#16a34a",
  },
});
