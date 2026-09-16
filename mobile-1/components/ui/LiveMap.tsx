import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { colors } from '../../theme/tokens';
import type { RouteStop } from '../../types';

type Props = {
  lat: number;
  lon: number;
  speedKmh: number;
  trainNo: string;
  trainName: string;
  stops: RouteStop[];
};

// Cross-platform real map, following the exact technique already proven in
// mobile/components/LiveTrackMap.tsx: a plain <iframe srcDoc> on web (react-native-webview has
// no web implementation — confirmed empty when tried directly, see UI_NOTES.md) and the real
// WebView native module everywhere else. Free CartoDB Voyager tiles, no API key, same as that
// file and the Stitch livemap.html reference.
export function LiveMap({ lat, lon, speedKmh, trainNo, trainName, stops }: Props) {
  const validStops = useMemo(() => stops.filter((s) => s.lat != null && s.lon != null), [stops]);

  const html = useMemo(() => {
    const latlngs = validStops.map((s) => `[${s.lat}, ${s.lon}]`).join(',');
    const markers = validStops
      .map((s) => {
        const color = s.status === 'departed' ? colors.onTime : s.status === 'current' ? colors.pinkDeep : colors.maroonMuted;
        const safeName = s.station_name.replace(/'/g, "\\'");
        return `L.circleMarker([${s.lat}, ${s.lon}], { radius: 5, fillColor: '${color}', color: '${colors.white}', weight: 2, opacity: 1, fillOpacity: 0.95 }).bindPopup('<b>${safeName} (${s.station_code})</b>').addTo(map);`;
      })
      .join('\n');

    return `<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  *{margin:0;padding:0;}
  html,body,#map{width:100%;height:100%;background:${colors.cream};}
  .leaflet-control-attribution{display:none!important;}
  .train-pulse{position:absolute;width:34px;height:34px;border-radius:17px;background:rgba(230,57,110,0.35);animation:pulse 1.8s cubic-bezier(0.215,0.61,0.355,1) infinite;}
  @keyframes pulse{0%{transform:scale(0.6);opacity:0.9;}100%{transform:scale(1.6);opacity:0;}}
  .train-badge{width:22px;height:22px;border-radius:11px;background:${colors.pinkDeep};border:2px solid ${colors.cream};box-shadow:0 1px 4px rgba(0,0,0,0.35);}
  .recenter-btn{position:absolute;bottom:12px;right:12px;z-index:1000;background:${colors.pinkDeep};color:${colors.white};border:none;border-radius:999px;padding:8px 14px;font-size:11px;font-weight:700;font-family:sans-serif;box-shadow:0 2px 6px rgba(0,0,0,0.25);}
</style>
</head><body>
<div id="map"></div>
<button class="recenter-btn" onclick="recenter()">⌖ Center</button>
<script>
  var map = L.map('map', { zoomControl: false, attributionControl: false }).setView([${lat}, ${lon}], 7);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { subdomains: 'abcd', maxZoom: 19 }).addTo(map);
  var trackPoints = [${latlngs}];
  if (trackPoints.length > 1) {
    L.polyline(trackPoints, { color: '${colors.pinkDeep}', weight: 5, opacity: 0.35 }).addTo(map);
    L.polyline(trackPoints, { color: '${colors.pinkDeep}', weight: 2, opacity: 0.9 }).addTo(map);
  }
  ${markers}
  var trainIcon = L.divIcon({ className: '', html: '<div class="train-pulse"></div><div class="train-badge"></div>', iconSize: [34,34], iconAnchor: [17,17] });
  L.marker([${lat}, ${lon}], { icon: trainIcon }).addTo(map).bindTooltip(${JSON.stringify(`${trainNo} · ${Math.round(speedKmh)} km/h`)}, { permanent: true, direction: 'top', offset: [0, -16] });
  function recenter() { map.setView([${lat}, ${lon}], 8, { animate: true }); }
</script>
</body></html>`;
  }, [lat, lon, speedKmh, trainNo, validStops]);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.fill}>
        <iframe srcDoc={html} style={{ width: '100%', height: '100%', border: 'none' }} title="Live train map" />
      </View>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { WebView } = require('react-native-webview');
  return (
    <View style={styles.fill}>
      <WebView originWhitelist={['*']} source={{ html }} style={styles.fill} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
});
