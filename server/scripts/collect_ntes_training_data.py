import os
import sys
import time
import argparse
import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.database import get_db_connection
from server.ingestion.ntes_anchor import ntes_client
from server.ingestion.weather_client import WeatherClient
from server.config import get_train_priority

weather_client = WeatherClient()

def init_observation_table():
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        CREATE TABLE IF NOT EXISTS delay_observations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_number TEXT NOT NULL,
            train_name TEXT,
            run_date TEXT NOT NULL,
            station_code TEXT NOT NULL,
            station_seq INTEGER,
            scheduled_arrival TEXT,
            actual_arrival TEXT,
            delay_min REAL,
            prev_station_code TEXT,
            prev_delay_min REAL,
            delay_delta REAL,
            timestamp_utc TEXT,
            weather_visibility_m REAL,
            weather_precip_mm REAL,
            weather_temp_c REAL,
            weather_fog_index REAL,
            train_priority INTEGER,
            is_overnight INTEGER,
            section_distance_km REAL,
            day_of_week INTEGER,
            hour_of_day REAL
        )
    """)
    c.execute("CREATE INDEX IF NOT EXISTS idx_obs_train ON delay_observations(train_number, run_date)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_obs_station ON delay_observations(station_code)")
    conn.commit()
    conn.close()

def get_candidate_trains(limit: int = 100) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT train_number, train_name, COUNT(*) as stops
        FROM schedules
        GROUP BY train_number
        HAVING stops >= 6
        ORDER BY stops DESC
        LIMIT ?
    """, (limit,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def poll_train_observation(train_row: Dict[str, Any], date_str: str) -> Optional[Dict[str, Any]]:
    train_no = train_row["train_number"]
    train_name = train_row.get("train_name", "")
    priority = get_train_priority(train_no, train_name)

    try:
        live = ntes_client.live_status(train_no, date_str)
        if not live or not isinstance(live, dict):
            return None

        trunst = str(live.get("TRUNST", "0"))
        if trunst != "1" and "departed" not in str(live.get("CPOS", "")).lower():
            return None

        stn_code = str(live.get("LSTN", "")).strip().upper()
        if not stn_code:
            return None

        delay_val = float(live.get("LDEL", 0.0) or 0.0)
        delay_val = max(0.0, min(360.0, delay_val))

        now_utc = datetime.datetime.utcnow()
        now_ist = now_utc + datetime.timedelta(hours=5, minutes=30)
        hour = now_ist.hour + (now_ist.minute / 60.0)
        is_overnight = 1 if (hour >= 22.5 or hour <= 5.5) else 0

        # Query weather for station
        weather = weather_client.get_weather(stn_code, None, None)

        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT station_code, delay_min
            FROM delay_observations
            WHERE train_number = ? AND run_date = ?
            ORDER BY id DESC LIMIT 1
        """, (train_no, date_str))
        prev_row = c.fetchone()

        prev_stn = prev_row["station_code"] if prev_row else None
        prev_delay = float(prev_row["delay_min"]) if prev_row else delay_val
        delay_delta = round(delay_val - prev_delay, 2)

        c.execute("""
            INSERT INTO delay_observations (
                train_number, train_name, run_date, station_code, station_seq,
                scheduled_arrival, actual_arrival, delay_min, prev_station_code,
                prev_delay_min, delay_delta, timestamp_utc, weather_visibility_m,
                weather_precip_mm, weather_temp_c, weather_fog_index, train_priority,
                is_overnight, section_distance_km, day_of_week, hour_of_day
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            train_no, train_name, date_str, stn_code, 0,
            "", "", delay_val, prev_stn,
            prev_delay, delay_delta, now_utc.isoformat(),
            float(weather.get("visibility_m", 10000.0)),
            float(weather.get("precipitation_mm", 0.0)),
            float(weather.get("temperature_c", 28.0)),
            float(weather.get("fog_severity_index", 0.0)),
            priority, is_overnight, 15.0, now_ist.weekday(), hour
        ))
        conn.commit()
        conn.close()

        return {
            "train_no": train_no,
            "station": stn_code,
            "delay_min": delay_val,
            "delay_delta": delay_delta
        }
    except Exception:
        return None

def main():
    parser = argparse.ArgumentParser(description="Collect live NTES train delay telemetry")
    parser.add_argument("--trains", type=int, default=50, help="Number of trains to poll")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    args = parser.parse_args()

    init_observation_table()
    now_ist = datetime.datetime.utcnow() + datetime.timedelta(hours=5, minutes=30)
    today_str = now_ist.strftime("%d-%b-%Y")

    candidates = get_candidate_trains(limit=args.trains)
    collected = 0

    for tr in candidates:
        res = poll_train_observation(tr, today_str)
        if res:
            collected += 1
            print(f"Logged {res['train_no']} at {res['station']}: delay={res['delay_min']}m, delta={res['delay_delta']}m")

    print(f"Collection round completed. Total live observations recorded: {collected}")

if __name__ == "__main__":
    main()
