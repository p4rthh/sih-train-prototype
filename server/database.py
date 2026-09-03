import sqlite3
from typing import List, Dict, Optional, Any
from server.config import DB_PATH

def get_db_connection() -> sqlite3.Connection:
    """Returns a connection to the SQLite database with Row factory."""
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes the database schema and indexes."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.executescript("""
    CREATE TABLE IF NOT EXISTS schedules (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        train_number TEXT NOT NULL,
        train_name TEXT,
        seq INTEGER,
        station_code TEXT NOT NULL,
        station_name TEXT,
        arrival TEXT,
        departure TEXT,
        day INTEGER DEFAULT 1,
        halt_min INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_schedules_train ON schedules(train_number);
    CREATE INDEX IF NOT EXISTS idx_schedules_station ON schedules(station_code);

    CREATE TABLE IF NOT EXISTS stations (
        station_code TEXT PRIMARY KEY,
        station_name TEXT,
        lat REAL,
        lon REAL,
        zone TEXT,
        state TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_stations_code ON stations(station_code);

    CREATE TABLE IF NOT EXISTS weather_cache (
        station_code TEXT,
        timestamp TEXT,
        visibility_m REAL,
        precipitation_mm REAL,
        temperature_c REAL,
        wind_speed_kmh REAL,
        weather_code INTEGER,
        PRIMARY KEY (station_code, timestamp)
    );
    """)

    conn.commit()
    conn.close()
    print(f"[DB] Initialized database schema at {DB_PATH}")

def search_trains(query: str, limit: int = 15) -> List[Dict[str, Any]]:
    """Search trains by train number or train name prefix/substring."""
    conn = get_db_connection()
    cursor = conn.cursor()
    q = f"%{query.strip()}%"
    cursor.execute("""
        SELECT DISTINCT train_number, train_name 
        FROM schedules 
        WHERE train_number LIKE ? OR train_name LIKE ? 
        ORDER BY 
            CASE WHEN train_number LIKE ? THEN 1 ELSE 2 END,
            train_number
        LIMIT ?
    """, (q, q, f"{query.strip()}%", limit))
    rows = cursor.fetchall()
    conn.close()
    return [{"train_number": r["train_number"], "train_name": r["train_name"]} for r in rows]

def get_train_schedule(train_no: str) -> List[Dict[str, Any]]:
    """Retrieve ordered stop schedule for a train, joining station coordinates."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT 
            s.seq,
            s.train_name,
            s.station_code,
            s.station_name,
            s.arrival,
            s.departure,
            s.day,
            s.halt_min,
            st.lat,
            st.lon
        FROM schedules s
        LEFT JOIN stations st ON s.station_code = st.station_code
        WHERE s.train_number = ?
        ORDER BY s.seq ASC
    """, (str(train_no).strip(),))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_station_info(station_code: str) -> Optional[Dict[str, Any]]:
    """Retrieve station metadata and coordinates."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM stations WHERE station_code = ?", (station_code.strip().upper(),))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

def find_trains_between_stations(from_stn: str, to_stn: str, limit: int = 30) -> List[Dict[str, Any]]:
    """Finds all trains running from origin to destination station ordered by departure time."""
    conn = get_db_connection()
    cursor = conn.cursor()
    from_clean = from_stn.strip().upper()
    to_clean = to_stn.strip().upper()
    from_like = f"%{from_stn.strip()}%"
    to_like = f"%{to_stn.strip()}%"

    cursor.execute("""
        SELECT 
            s1.train_number,
            s1.train_name,
            s1.departure AS from_departure,
            s1.station_code AS from_code,
            s1.station_name AS from_name,
            s2.arrival AS to_arrival,
            s2.station_code AS to_code,
            s2.station_name AS to_name,
            s1.day AS from_day,
            s2.day AS to_day,
            (s2.seq - s1.seq) AS stop_count
        FROM schedules s1
        JOIN schedules s2 ON s1.train_number = s2.train_number
        WHERE (s1.station_code = ? OR s1.station_name LIKE ?)
          AND (s2.station_code = ? OR s2.station_name LIKE ?)
          AND s1.seq < s2.seq
        ORDER BY s1.departure ASC
        LIMIT ?
    """, (from_clean, from_like, to_clean, to_like, limit))
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        dep = r["from_departure"] or "00:00:00"
        arr = r["to_arrival"] or "00:00:00"
        try:
            dep_h, dep_m = map(int, str(dep).split(":")[:2])
            arr_h, arr_m = map(int, str(arr).split(":")[:2])
            day_diff = max(0, int(r["to_day"]) - int(r["from_day"]))
            dur_mins = (day_diff * 1440) + (arr_h * 60 + arr_m) - (dep_h * 60 + dep_m)
            if dur_mins < 0:
                dur_mins += 1440
            dur_str = f"{dur_mins // 60}h {dur_mins % 60}m"
        except Exception:
            dur_str = "--"

        results.append({
            "train_number": r["train_number"],
            "train_name": r["train_name"],
            "from_station_code": r["from_code"],
            "from_station_name": r["from_name"],
            "from_departure": str(dep)[:5],
            "to_station_code": r["to_code"],
            "to_station_name": r["to_name"],
            "to_arrival": str(arr)[:5],
            "duration": dur_str,
            "stop_count": r["stop_count"]
        })

    return results
