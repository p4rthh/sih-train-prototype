import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.database import init_db, search_trains, get_train_schedule, get_db_connection
from server.ingestion.station_coords import populate_stations_db
from server.ingestion.timetable_loader import populate_schedules_db

def main():
    start_time = time.time()

    init_db()
    stn_count = populate_stations_db()
    sched_count = populate_schedules_db()

    conn = get_db_connection()
    c = conn.cursor()
    c.execute("SELECT COUNT(DISTINCT train_number) FROM schedules")
    distinct_trains = c.fetchone()[0]
    conn.close()

    elapsed = time.time() - start_time
    print(f"Setup complete in {elapsed:.2f}s: {stn_count} stations, {sched_count} schedule records, {distinct_trains} distinct trains.")

if __name__ == "__main__":
    main()
