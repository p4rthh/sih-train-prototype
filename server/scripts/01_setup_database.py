import sys
import time
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.database import init_db, search_trains, get_train_schedule, get_db_connection
from server.ingestion.station_coords import populate_stations_db
from server.ingestion.timetable_loader import populate_schedules_db

def main():
    print("=" * 60)
    print("🚆 SIH Train Platform — Database Setup Pipeline")
    print("=" * 60)
    start_time = time.time()

    # 1. Initialize schema
    init_db()

    # 2. Ingest stations
    stn_count = populate_stations_db()

    # 3. Ingest schedules
    sched_count = populate_schedules_db()

    # 4. Verify & test query
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(DISTINCT train_number) FROM schedules")
    distinct_trains = c.fetchone()[0]
    conn.close()

    elapsed = time.time() - start_time
    print("-" * 60)
    print(f"✅ Setup Complete in {elapsed:.2f} seconds!")
    print(f"📊 Total Stations Ingested: {stn_count:,}")
    print(f"📊 Total Schedule Records:  {sched_count:,}")
    print(f"📊 Total Distinct Trains:   {distinct_trains:,}")
    print("-" * 60)

    # Verification test
    print("\n🔍 Running test lookup for Train 12952 (Mumbai Rajdhani):")
    results = search_trains("12952")
    print(f"Search Results: {results}")

    schedule = get_train_schedule("12952")
    print(f"Total Stop Segments for 12952: {len(schedule)}")
    if schedule:
        print("First 3 stops:")
        for s in schedule[:3]:
            print(f"  Seq {s['seq']:2d} | {s['station_code']:5s} | {s['station_name']:20s} | Arr: {s['arrival']} | Dep: {s['departure']} | Lat/Lon: ({s['lat']}, {s['lon']})")
        print("Last 2 stops:")
        for s in schedule[-2:]:
            print(f"  Seq {s['seq']:2d} | {s['station_code']:5s} | {s['station_name']:20s} | Arr: {s['arrival']} | Dep: {s['departure']} | Lat/Lon: ({s['lat']}, {s['lon']})")

if __name__ == "__main__":
    main()
