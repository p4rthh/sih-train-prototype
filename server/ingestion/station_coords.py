import os
import json
import math
import urllib.request
from typing import Dict, Optional, Tuple
from server.config import RAW_STATIONS_FILE, DATAMEET_STATIONS_URL
from server.database import get_db_connection

def ensure_stations_downloaded() -> str:
    """Ensures stations.json is downloaded in data/raw."""
    if not os.path.exists(RAW_STATIONS_FILE) or os.path.getsize(RAW_STATIONS_FILE) < 1000:
        print("[Stations] Downloading DataMeet stations.json (~10MB)...")
        urllib.request.urlretrieve(DATAMEET_STATIONS_URL, RAW_STATIONS_FILE)
        print("[Stations] Download complete.")
    return str(RAW_STATIONS_FILE)

def populate_stations_db() -> int:
    """Parses stations.json and inserts records into SQLite stations table."""
    file_path = ensure_stations_downloaded()
    print("[Stations] Parsing stations GeoJSON into SQLite...")

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    features = data.get("features", [])
    conn = get_db_connection()
    cursor = conn.cursor()

    records = []
    seen = set()
    for feat in features:
        props = feat.get("properties", {}) or {}
        code = str(props.get("code", "")).strip().upper()
        if not code or code in seen:
            continue
        seen.add(code)

        geom = feat.get("geometry", {}) or {}
        coords = geom.get("coordinates", [None, None])
        lon = coords[0] if len(coords) > 0 else None
        lat = coords[1] if len(coords) > 1 else None

        records.append((
            code,
            props.get("name", ""),
            lat,
            lon,
            props.get("zone", ""),
            props.get("state", "")
        ))

    cursor.executemany("""
        INSERT OR REPLACE INTO stations (station_code, station_name, lat, lon, zone, state)
        VALUES (?, ?, ?, ?, ?, ?)
    """, records)

    conn.commit()
    conn.close()
    print(f"[Stations] Successfully loaded {len(records)} stations into database.")
    return len(records)

def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculates great-circle distance between two points in kilometers."""
    if None in (lat1, lon1, lat2, lon2):
        return 15.0 # fallback average section distance in India
    R = 6371.0 # Earth radius in km
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2.0) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(R * c, 2)
