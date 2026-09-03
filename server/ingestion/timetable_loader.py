import os
import json
import urllib.request
from typing import List, Dict, Optional, Any
from server.config import RAW_SCHEDULES_FILE, DATAMEET_SCHEDULES_URL
from server.database import get_db_connection

def ensure_schedules_downloaded() -> str:
    if not os.path.exists(RAW_SCHEDULES_FILE) or os.path.getsize(RAW_SCHEDULES_FILE) < 1000:
        urllib.request.urlretrieve(DATAMEET_SCHEDULES_URL, RAW_SCHEDULES_FILE)
    return str(RAW_SCHEDULES_FILE)

def calculate_halt_minutes(arr: Optional[str], dep: Optional[str]) -> int:
    if not arr or not dep or str(arr) in ["None", "START", "--", ""] or str(dep) in ["None", "DEST", "--", ""]:
        return 0
    try:
        arr_parts = str(arr).split(":")
        dep_parts = str(dep).split(":")
        arr_min = int(arr_parts[0]) * 60 + int(arr_parts[1])
        dep_min = int(dep_parts[0]) * 60 + int(dep_parts[1])
        diff = dep_min - arr_min
        return diff if diff >= 0 else diff + 1440
    except Exception:
        return 0

def populate_schedules_db() -> int:
    file_path = ensure_schedules_downloaded()

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    conn = get_db_connection()
    cursor = conn.cursor()

    train_seq_map: Dict[str, int] = {}
    records = []

    for item in data:
        t_num = str(item.get("train_number", "")).strip()
        if not t_num:
            continue
        
        train_seq_map[t_num] = train_seq_map.get(t_num, 0) + 1
        seq = train_seq_map[t_num]
        
        arr = item.get("arrival")
        dep = item.get("departure")
        arr_clean = str(arr) if arr and arr != "None" else ("START" if seq == 1 else None)
        dep_clean = str(dep) if dep and dep != "None" else None
        
        halt = calculate_halt_minutes(arr_clean, dep_clean)
        
        try:
            day = int(item.get("day", 1))
        except (ValueError, TypeError):
            day = 1

        records.append((
            t_num,
            item.get("train_name", "").strip(),
            seq,
            str(item.get("station_code", "")).strip().upper(),
            str(item.get("station_name", "")).strip(),
            arr_clean,
            dep_clean,
            day,
            halt
        ))

    cursor.execute("DELETE FROM schedules")
    cursor.executemany("""
        INSERT INTO schedules (train_number, train_name, seq, station_code, station_name, arrival, departure, day, halt_min)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, records)

    conn.commit()
    conn.close()
    return len(records)
