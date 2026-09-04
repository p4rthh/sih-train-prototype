import sys
import time
import random
import datetime
from pathlib import Path
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.config import TRAINING_DATA_FILE, get_train_priority
from server.database import get_db_connection, get_train_schedule
from server.features.pipeline import FeaturePipeline, FEATURE_NAMES
from server.simulator.kinematic_engine import TrainSimulator
from server.models.recovery_engine import HistoricalRecoveryEngine

def generate_training_dataset(num_trips_per_train: int = 15) -> pd.DataFrame:
    t0 = time.time()

    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT train_number, COUNT(*) as stop_count, train_name
        FROM schedules
        GROUP BY train_number
        HAVING stop_count >= 5
        ORDER BY RANDOM()
        LIMIT 40
    """)
    candidate_trains = cursor.fetchall()
    conn.close()

    rows = []
    total_trips = 0

    for train_row in candidate_trains:
        t_no = train_row["train_number"]
        t_name = train_row["train_name"]
        schedule = get_train_schedule(t_no)
        if len(schedule) < 4:
            continue

        priority = get_train_priority(t_no, t_name)
        profile = HistoricalRecoveryEngine.get_historical_train_profile(t_no, priority)

        for trip_idx in range(num_trips_per_train):
            total_trips += 1
            scenario = random.choices([0, 1, 2, 3], weights=[0.45, 0.25, 0.15, 0.15])[0]

            if scenario == 1:
                base_vis = random.uniform(80.0, 450.0)
                base_precip = 0.0
                base_temp = random.uniform(8.0, 16.0)
                fog_idx = round(max(0.0, (1000.0 - base_vis) / 900.0), 3)
            elif scenario == 2:
                base_vis = random.uniform(1500.0, 4000.0)
                base_precip = random.uniform(16.0, 45.0)
                base_temp = random.uniform(22.0, 29.0)
                fog_idx = 0.0
            elif scenario == 3:
                base_vis = 8000.0
                base_precip = 0.0
                base_temp = 32.0
                fog_idx = 0.0
            else:
                base_vis = random.uniform(7000.0, 10000.0)
                base_precip = 0.0
                base_temp = random.uniform(20.0, 36.0)
                fog_idx = 0.0

            # Initial departure delay
            start_delay = random.choice([0.0, 5.0, 15.0, 28.0, 40.0]) if random.random() < 0.6 else 0.0
            sim = TrainSimulator(t_no, schedule, start_delay_min=start_delay)

            # Assign trip starting time
            start_hour = random.choice([16.0, 17.0, 20.0, 22.0, 6.0, 10.0])
            current_sim_time = datetime.datetime(2026, 9, 4, int(start_hour), int((start_hour % 1) * 60))

            tot_stops = len(sim.route_stops)
            for stop_idx in range(tot_stops - 1):
                curr_state = sim.get_state()
                curr_state["priority_rank"] = priority
                curr_state["train_no"] = t_no
                curr_state["dist_to_destination_km"] = max(10.0, (tot_stops - stop_idx) * 22.0)
                
                upstream_delay = random.uniform(15.0, 45.0) if (scenario == 3 and random.random() < 0.35) else 0.0
                curr_state["upstream_train_delay"] = upstream_delay

                weather = {
                    "visibility_m": base_vis,
                    "precipitation_mm": base_precip,
                    "temperature_c": base_temp,
                    "wind_speed_kmh": random.uniform(5.0, 25.0),
                    "weather_code": 45 if scenario == 1 else (63 if scenario == 2 else 1),
                    "fog_severity_index": fog_idx
                }

                feat_df = FeaturePipeline.extract_features(curr_state, weather, dt=current_sim_time)
                feat_dict = feat_df.iloc[0].to_dict()

                target_dist = curr_state["section_distance_km"]
                eff_speed = sim.get_effective_max_speed(base_vis, base_precip)
                nominal_time_min = (target_dist / sim.max_speed_kmh) * 60.0
                actual_time_min = (target_dist / eff_speed) * 60.0
                
                delta = actual_time_min - nominal_time_min

                # Section perturbations
                if random.random() < 0.12:
                    delta += random.uniform(2.0, 6.0)
                if priority >= 4 and random.random() < 0.25:
                    delta += random.uniform(4.0, 12.0)
                if upstream_delay > 20.0:
                    delta += random.uniform(3.0, 8.0)

                # Historical delay catch-up & slack recovery dynamics:
                # If train is late, loco pilots run at MPS to make up time, especially overnight & near terminals
                hour = current_sim_time.hour + (current_sim_time.minute / 60.0)
                is_overnight = (hour >= 22.5 or hour <= 5.5)
                stops_from_dest = tot_stops - 1 - stop_idx

                if sim.current_delay_min > 2.0 and scenario in [0, 3]:
                    # Midnight corridor clearing recovery
                    if is_overnight and priority <= 2:
                        recovery_boost = random.uniform(1.5, 4.0) * profile["recovery_rate"]
                        delta -= recovery_boost
                    elif priority <= 2:
                        recovery_boost = random.uniform(0.5, 2.0) * profile["recovery_rate"]
                        delta -= recovery_boost

                    # Final terminal approach buffer padding
                    if stops_from_dest <= 3:
                        terminal_recovery = random.uniform(2.0, 5.0) * profile["recovery_rate"]
                        delta -= terminal_recovery

                delta = round(max(-5.0, delta), 2)

                sim.current_delay_min = max(0.0, sim.current_delay_min + delta)
                sim.delay_history.append(sim.current_delay_min)
                sim.current_stop_idx += 1

                # Advance simulation time
                current_sim_time += datetime.timedelta(minutes=max(5.0, actual_time_min + delta))

                feat_dict["delay_delta_next"] = delta
                rows.append(feat_dict)

    df = pd.DataFrame(rows)
    TRAINING_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(TRAINING_DATA_FILE, index=False)

    elapsed = time.time() - t0
    print(f"Generated {len(df)} samples across {total_trips} trips with historical behavioral recovery in {elapsed:.2f}s.")
    return df

if __name__ == "__main__":
    generate_training_dataset()
