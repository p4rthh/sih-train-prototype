import React, { useMemo } from "react";
import { View, Text, StyleSheet, Platform } from "react-native";
import { RouteStop } from "../types";

interface Props {
  lat: number;
  lon: number;
  speedKmh: number;
  stops: RouteStop[];
  trainNo: string;
}

export const LiveTrackMap: React.FC<Props> = ({ lat, lon, speedKmh, stops, trainNo }) => {
  // Extract coordinate points for the route polyline
  const validStops = useMemo(() => {
    return stops.filter((s) => s.lat != null && s.lon != null);
  }, [stops]);

  // Leaflet Interactive HTML Map for Web View
  const leafletHtml = useMemo(() => {
    const latlngs = validStops.map((s) => `[${s.lat}, ${s.lon}]`).join(",\n");
    const stationMarkers = validStops
      .filter((s, idx) => idx === 0 || idx === validStops.length - 1 || idx % 2 === 0)
      .map((s) => {
        const isPast = s.status === "departed";
        const color = isPast ? "#16a34a" : s.status === "current" ? "#2563eb" : "#64748b";
        return `
          L.circleMarker([${s.lat}, ${s.lon}], {
            radius: 5,
            fillColor: "${color}",
            color: "#ffffff",
            weight: 2,
            opacity: 1,
            fillOpacity: 0.9
          }).bindPopup("<b>${s.station_name} (${s.station_code})</b><br>Arr: ${s.scheduled_arrival || '--'} | Status: ${s.status}")
            .addTo(map);
        `;
      })
      .join("\n");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          html, body, #map {
            width: 100%;
            height: 100%;
            margin: 0;
            padding: 0;
            background: #090d16;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          }
          .train-marker-wrap {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .train-pulse {
            position: absolute;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: rgba(37, 99, 235, 0.35);
            animation: pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.6); opacity: 0.9; }
            100% { transform: scale(1.6); opacity: 0; }
          }
          .train-icon-badge {
            width: 30px;
            height: 30px;
            border-radius: 15px;
            background: #1d4ed8;
            border: 2px solid #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            box-shadow: 0 0 12px rgba(37, 99, 235, 0.8);
            z-index: 10;
          }
          .train-tooltip {
            background: rgba(15, 23, 42, 0.95);
            border: 1px solid #334155;
            border-radius: 6px;
            color: #ffffff;
            padding: 4px 8px;
            font-size: 11px;
            font-weight: 700;
            box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          }
          .recenter-btn {
            position: absolute;
            bottom: 12px;
            right: 12px;
            z-index: 1000;
            background: #2563eb;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 6px 10px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <button class="recenter-btn" onclick="recenter()">⌖ Center on Train</button>
        <script>
          const trainPos = [${lat}, ${lon}];
          const map = L.map('map', {
            zoomControl: true,
            attributionControl: false
          }).setView(trainPos, 7);

          // OpenStreetMap CartoDB Dark/Voyager tiles
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 18
          }).addTo(map);

          // Railway Track Polyline
          const trackPoints = [
            ${latlngs}
          ];

          if (trackPoints.length > 1) {
            // Glow border polyline
            L.polyline(trackPoints, {
              color: '#3b82f6',
              weight: 6,
              opacity: 0.5
            }).addTo(map);

            // Core track line
            L.polyline(trackPoints, {
              color: '#1d4ed8',
              weight: 3,
              opacity: 0.9
            }).addTo(map);
          }

          // Station milestone markers
          ${stationMarkers}

          // Custom animated Train Marker
          const trainIcon = L.divIcon({
            className: 'train-marker-wrap',
            html: '<div class="train-pulse"></div><div class="train-icon-badge">🚆</div>',
            iconSize: [42, 42],
            iconAnchor: [21, 21]
          });

          const trainMarker = L.marker(trainPos, { icon: trainIcon }).addTo(map);
          trainMarker.bindTooltip("<div class='train-tooltip'>Train #${trainNo}<br>${Math.round(speedKmh)} km/h</div>", {
            permanent: true,
            direction: 'top',
            offset: [0, -18]
          });

          function recenter() {
            map.setView([${lat}, ${lon}], 8, { animate: true });
          }
        </script>
      </body>
      </html>
    `;
  }, [lat, lon, speedKmh, validStops, trainNo]);

  return (
    <View style={styles.card}>
      {/* Map Header */}
      <View style={styles.headerRow}>
        <View style={styles.titleRow}>
          <Text style={styles.mapIcon}>🗺️</Text>
          <Text style={styles.title}>LIVE RAILWAY TRACK GEOMETRY & TRAIN POSITION</Text>
        </View>
        <View style={styles.speedPill}>
          <Text style={styles.speedText}>{Math.round(speedKmh)} km/h</Text>
        </View>
      </View>

      {/* Interactive Leaflet Map for Web / Browser */}
      {Platform.OS === "web" ? (
        <View style={styles.mapContainer}>
          <iframe
            srcDoc={leafletHtml}
            style={{
              width: "100%",
              height: "100%",
              border: "none",
              borderRadius: 12,
            }}
            title="Live Railway Track Map"
          />
        </View>
      ) : (
        /* Native Fallback Canvas */
        <View style={styles.mapCanvas}>
          <View style={styles.gridLine1} />
          <View style={styles.gridLine2} />
          <View style={styles.trackLine} />

          <View style={styles.stationsRow}>
            <View style={styles.stationMarkerBox}>
              <View style={[styles.stationDot, styles.dotPassed]} />
              <Text style={styles.stationCode} numberOfLines={1}>
                {stops[0]?.station_code || "START"}
              </Text>
              <Text style={styles.stationTime}>
                {stops[0]?.scheduled_departure && stops[0].scheduled_departure !== "START"
                  ? stops[0].scheduled_departure.slice(0, 5)
                  : "--:--"}
              </Text>
            </View>

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

            <View style={styles.stationMarkerBox}>
              <View style={[styles.stationDot, styles.dotUpcoming]} />
              <Text style={styles.stationCode} numberOfLines={1}>
                {stops[stops.length - 1]?.station_code || "DEST"}
              </Text>
              <Text style={styles.stationTime}>
                {stops[stops.length - 1]?.scheduled_arrival && stops[stops.length - 1].scheduled_arrival !== "None"
                  ? stops[stops.length - 1].scheduled_arrival.slice(0, 5)
                  : "END"}
              </Text>
            </View>
          </View>
        </View>
      )}

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
          <Text style={styles.telemLabel}>SATELLITE POSITION</Text>
          <Text style={styles.telemVal}>Real GPS Track</Text>
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
  mapContainer: {
    height: 340,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#cbd5e1",
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
