import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { RouteStop } from "../types";

interface Props {
  stops: RouteStop[];
}

const formatClock = (timeStr?: string): string => {
  if (!timeStr || timeStr === "None" || timeStr === "START" || timeStr === "TERMINAL") {
    return "--:--";
  }
  const parts = timeStr.split(":");
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`;
  }
  return timeStr;
};

export const StationTimeline: React.FC<Props> = ({ stops }) => {
  const [showAllStops, setShowAllStops] = useState<boolean>(false);

  if (!stops || stops.length === 0) return null;

  // Filter view if route is very long (> 16 stops), allowing user toggle
  const hasManyStops = stops.length > 16;
  const displayStops = (!hasManyStops || showAllStops)
    ? stops
    : stops.filter((s, idx) => {
        // Keep first, last, current, adjacent to current, and major junctions (halt >= 5 min)
        if (idx === 0 || idx === stops.length - 1) return true;
        if (s.status === "current") return true;
        const currentIdx = stops.findIndex((st) => st.status === "current");
        if (currentIdx !== -1 && Math.abs(idx - currentIdx) <= 1) return true;
        if ((s.halt_min ?? 0) >= 5) return true;
        return idx % 3 === 0;
      });

  return (
    <View style={styles.card}>
      {/* Header with Title & Optional Filter Toggle */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.cardTitle}>ROUTE TIMETABLE & LIVE FORECAST</Text>
          <Text style={styles.cardSubtitle}>
            Comparing Scheduled vs AI Dynamic Forecast for Arrival & Departure
          </Text>
        </View>
        {hasManyStops && (
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowAllStops(!showAllStops)}
            activeOpacity={0.7}
          >
            <Text style={styles.filterBtnText}>
              {showAllStops ? "Compact" : `All (${stops.length})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.timelineList}>
        {displayStops.map((stop, idx) => {
          const isDeparted = stop.status === "departed";
          const isCurrent = stop.status === "current";
          const isUpcoming = stop.status === "upcoming";
          const isFirst = idx === 0 && stop.seq === 1;
          const isLast = idx === displayStops.length - 1 && stop.seq === stops.length;

          // Arrival Sched vs Forecast
          const schedArr = isFirst || stop.scheduled_arrival === "START"
            ? "Origin"
            : formatClock(stop.scheduled_arrival);
          
          let estArr = "--:--";
          if (isFirst) {
            estArr = "Source";
          } else if (isDeparted) {
            estArr = stop.eta_arrival === "PASSED" ? "Passed" : (formatClock(stop.eta_arrival) || "Passed");
          } else if (isCurrent) {
            estArr = "At Platform";
          } else {
            estArr = stop.eta_arrival && stop.eta_arrival !== "PASSED" 
              ? formatClock(stop.eta_arrival) 
              : (stop.eta ? formatClock(stop.eta) : schedArr);
          }

          // Departure Sched vs Forecast
          const schedDep = isLast || stop.scheduled_departure === "TERMINAL" || stop.scheduled_departure === "None"
            ? "Terminal"
            : formatClock(stop.scheduled_departure);

          let estDep = "--:--";
          if (isLast) {
            estDep = "Destination";
          } else if (isDeparted) {
            estDep = stop.eta_departure === "DEPARTED" ? "Departed" : (formatClock(stop.eta_departure) || "Departed");
          } else if (isCurrent) {
            estDep = stop.eta_departure === "NOW" ? "Departing" : (formatClock(stop.eta_departure) || "Departing");
          } else {
            estDep = stop.eta_departure && stop.eta_departure !== "DEPARTED" && stop.eta_departure !== "TERMINAL"
              ? formatClock(stop.eta_departure)
              : schedDep;
          }

          // Delay calculation for arrival and departure
          const delayMin = stop.delay_min ?? 0;
          const isLate = isUpcoming && delayMin > 3;
          const isOnTime = isUpcoming && delayMin <= 3;

          // Halt badge description
          const halt = stop.halt_min ?? 0;
          let haltText = "";
          if (isFirst) haltText = "Origin";
          else if (isLast) haltText = "Terminal";
          else if (halt > 0) haltText = `${halt}m halt`;
          else haltText = "1m halt";

          // Calculate halt dwell delay absorption if delay decreases between arrival and departure
          const hasDwellAbsorption = isUpcoming && halt >= 5 && (stop.recovered_min ?? 0) >= 2;

          return (
            <View key={idx} style={[styles.timelineRow, isCurrent && styles.rowCurrent]}>
              {/* Left Column: Node icon + connecting line */}
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

              {/* Right Column: Station metadata & Timetable Card */}
              <View style={styles.infoCol}>
                {/* Station Title & Status Badges */}
                <View style={styles.stationHeader}>
                  <View style={styles.stnNameGroup}>
                    <Text style={[styles.stnName, isCurrent && styles.stnNameCurrent]} numberOfLines={1}>
                      {stop.station_name}
                    </Text>
                    <View style={styles.stnCodeBadge}>
                      <Text style={styles.stnCodeText}>{stop.station_code}</Text>
                    </View>
                  </View>

                  <View style={styles.badgeGroup}>
                    <View style={[styles.haltBadge, halt >= 10 && styles.haltBadgeMajor]}>
                      <Text style={[styles.haltBadgeText, halt >= 10 && styles.haltBadgeTextMajor]}>
                        {haltText}
                      </Text>
                    </View>

                    {isCurrent && (
                      <View style={styles.liveBadge}>
                        <Text style={styles.liveBadgeText}>CURRENT</Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Dual Timetable Box: Arrival vs Departure */}
                <View style={styles.timetableCard}>
                  {/* Arrival Column */}
                  <View style={[styles.timeBox, styles.timeBoxBorderRight]}>
                    <View style={styles.timeBoxHeader}>
                      <Text style={styles.timeBoxTitle}>ARRIVAL</Text>
                      {isUpcoming && (
                        <Text style={[styles.miniDelayText, isLate ? styles.delayLate : styles.delayGreen]}>
                          {isLate ? `+${Math.round(delayMin)}m` : "On Time"}
                        </Text>
                      )}
                    </View>
                    <View style={styles.timeComparisonRow}>
                      <View style={styles.timeField}>
                        <Text style={styles.timeFieldLabel}>SCHED</Text>
                        <Text style={styles.timeFieldVal}>{schedArr}</Text>
                      </View>
                      <View style={styles.timeField}>
                        <Text style={styles.timeFieldLabel}>
                          {isDeparted ? "ACTUAL" : isCurrent ? "STATUS" : "FORECAST"}
                        </Text>
                        <Text
                          style={[
                            styles.timeFieldVal,
                            styles.timeFieldValBold,
                            isLate && styles.delayLate,
                            isCurrent && styles.textCurrent,
                          ]}
                        >
                          {estArr}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Departure Column */}
                  <View style={styles.timeBox}>
                    <View style={styles.timeBoxHeader}>
                      <Text style={styles.timeBoxTitle}>DEPARTURE</Text>
                      {isUpcoming && !isLast && (
                        <Text
                          style={[
                            styles.miniDelayText,
                            isLate && !stop.is_recovered ? styles.delayLate : styles.delayGreen,
                          ]}
                        >
                          {stop.is_recovered
                            ? "On Time"
                            : isLate
                            ? `+${Math.max(0, Math.round(delayMin - (stop.recovered_min ?? 0)))}m`
                            : "On Time"}
                        </Text>
                      )}
                    </View>
                    <View style={styles.timeComparisonRow}>
                      <View style={styles.timeField}>
                        <Text style={styles.timeFieldLabel}>SCHED</Text>
                        <Text style={styles.timeFieldVal}>{schedDep}</Text>
                      </View>
                      <View style={styles.timeField}>
                        <Text style={styles.timeFieldLabel}>
                          {isDeparted ? "ACTUAL" : isCurrent ? "STATUS" : "FORECAST"}
                        </Text>
                        <Text
                          style={[
                            styles.timeFieldVal,
                            styles.timeFieldValBold,
                            isLate && !stop.is_recovered && styles.delayLate,
                            isCurrent && styles.textCurrent,
                          ]}
                        >
                          {estDep}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {/* Delay & Slack Absorption Notice */}
                {isUpcoming && (stop.is_recovered || hasDwellAbsorption) && (
                  <View style={styles.recoveryNoticeRow}>
                    <Text style={styles.recoveryNoticeText}>
                      {stop.is_recovered
                        ? "🟢 Full delay recovery predicted at this station"
                        : `⚡ ~${Math.round(stop.recovered_min!)}m delay absorbed during ${halt}m scheduled halt`}
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
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  cardTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0f172a",
    letterSpacing: 0.8,
  },
  cardSubtitle: {
    fontSize: 10,
    color: "#64748b",
    marginTop: 2,
    fontWeight: "500",
  },
  filterBtn: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  filterBtnText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#334155",
  },
  timelineList: {
    paddingLeft: 2,
  },
  timelineRow: {
    flexDirection: "row",
    minHeight: 88,
  },
  rowCurrent: {
    backgroundColor: "rgba(37, 99, 235, 0.03)",
    borderRadius: 12,
    marginHorizontal: -6,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  nodeCol: {
    width: 24,
    alignItems: "center",
    position: "relative",
    paddingTop: 4,
  },
  nodeDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },
  dotDeparted: {
    backgroundColor: "#16a34a",
  },
  dotCurrent: {
    backgroundColor: "#2563eb",
    borderWidth: 3,
    borderColor: "#bfdbfe",
  },
  dotUpcoming: {
    backgroundColor: "#ffffff",
    borderWidth: 2,
    borderColor: "#cbd5e1",
  },
  dotCheck: {
    color: "#ffffff",
    fontSize: 11,
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
    top: 24,
    bottom: 0,
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
    paddingBottom: 14,
  },
  stationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  stnNameGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 6,
  },
  stnName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e293b",
    maxWidth: "75%",
  },
  stnNameCurrent: {
    color: "#1d4ed8",
    fontWeight: "900",
  },
  stnCodeBadge: {
    backgroundColor: "#f8fafc",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginLeft: 6,
  },
  stnCodeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  badgeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  haltBadge: {
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  haltBadgeMajor: {
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderColor: "#bfdbfe",
  },
  haltBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748b",
  },
  haltBadgeTextMajor: {
    color: "#2563eb",
  },
  liveBadge: {
    backgroundColor: "#2563eb",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  timetableCard: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  timeBox: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timeBoxBorderRight: {
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
  },
  timeBoxHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  timeBoxTitle: {
    fontSize: 9,
    fontWeight: "800",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  miniDelayText: {
    fontSize: 9,
    fontWeight: "800",
  },
  timeComparisonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeField: {
    flex: 1,
  },
  timeFieldLabel: {
    fontSize: 8,
    fontWeight: "700",
    color: "#94a3b8",
    letterSpacing: 0.3,
  },
  timeFieldVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginTop: 1,
  },
  timeFieldValBold: {
    fontWeight: "800",
    color: "#0f172a",
  },
  delayGreen: {
    color: "#16a34a",
  },
  delayLate: {
    color: "#d97706",
  },
  textCurrent: {
    color: "#2563eb",
  },
  recoveryNoticeRow: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  recoveryNoticeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#059669",
  },
});
