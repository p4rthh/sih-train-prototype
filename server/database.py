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

def search_stations(query: str, limit: int = 20) -> List[Dict[str, Any]]:
    """Search stations across India by code or name."""
    conn = get_db_connection()
    cursor = conn.cursor()
    q_clean = query.strip().upper()
    q_like = f"%{query.strip()}%"
    cursor.execute("""
        SELECT station_code, station_name, state, zone, lat, lon
        FROM stations
        WHERE station_code LIKE ? OR station_name LIKE ?
        ORDER BY 
            CASE 
                WHEN station_code = ? THEN 1
                WHEN station_code LIKE ? THEN 2
                WHEN station_name LIKE ? THEN 3
                ELSE 4
            END,
            CASE WHEN station_name LIKE '%JN%' OR station_name LIKE '%CENTRAL%' OR station_name LIKE '%TERMINUS%' THEN 1 ELSE 2 END,
            station_name ASC
        LIMIT ?
    """, (f"{q_clean}%", q_like, q_clean, f"{q_clean}%", f"{query.strip()}%", limit))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]

def resolve_station_code(query: str) -> str:
    """Resolves station code from code or station name (e.g. 'New Delhi' -> 'NDLS')."""
    if not query:
        return ""
    conn = get_db_connection()
    c = conn.cursor()
    q = query.strip().upper()
    # 1. Exact match code
    c.execute("SELECT station_code FROM stations WHERE station_code = ?", (q,))
    row = c.fetchone()
    if row:
        conn.close()
        return row["station_code"]
    # 2. Exact match name
    c.execute("SELECT station_code FROM stations WHERE UPPER(station_name) = ?", (q,))
    row = c.fetchone()
    if row:
        conn.close()
        return row["station_code"]
    # 3. Fuzzy search major junction / central
    c.execute("""
        SELECT station_code FROM stations 
        WHERE station_name LIKE ? 
        ORDER BY 
            CASE WHEN station_name LIKE '%CENTRAL%' OR station_name LIKE '%JN%' OR station_name LIKE '%TERMINUS%' THEN 1 ELSE 2 END 
        LIMIT 1
    """, (f"%{q}%",))
    row = c.fetchone()
    conn.close()
    return row["station_code"] if row else q

def find_trains_between_stations(from_stn: str, to_stn: str, express_only: bool = True, limit: int = 100) -> List[Dict[str, Any]]:
    """Finds all express trains running from origin to destination station ordered by departure time."""
    conn = get_db_connection()
    cursor = conn.cursor()
    from_code = resolve_station_code(from_stn)
    to_code = resolve_station_code(to_stn)
    from_like = f"%{from_stn.strip()}%"
    to_like = f"%{to_stn.strip()}%"

    sql = """
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
    """
    
    # Filter for Pan-India Express trains only
    if express_only:
        sql += """
          AND s1.train_name NOT LIKE '%Passenger%'
          AND s1.train_name NOT LIKE '%MEMU%'
          AND s1.train_name NOT LIKE '%DEMU%'
          AND s1.train_name NOT LIKE '%EMU%'
          AND s1.train_name NOT LIKE '%Local%'
          AND s1.train_name NOT LIKE '%Shuttle%'
        """

    sql += """
        ORDER BY s1.departure ASC
        LIMIT ?
    """

    cursor.execute(sql, (from_code, from_like, to_code, to_like, limit))
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
