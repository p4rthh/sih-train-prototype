import sys
import time
import random
import datetime
from pathlib import Path
import pandas as pd
import numpy as np

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.config import TRAINING_DATA_FILE, get_train_priority
from server.database import get_db_connection, get_train_schedule
from server.features.pipeline import FeaturePipeline, FEATURE_NAMES
from server.simulator.kinematic_engine import TrainSimulator

def generate_training_dataset(num_trips_per_train: int = 15) -> pd.DataFrame:
    print("=" * 60)
    print("🚂 SIH Train Platform — Dataset Generation Pipeline")
    print("=" * 60)
    t0 = time.time()

    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Pick 40 diverse trains that have at least 5 stops
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

    print(f"[Dataset] Selected {len(candidate_trains)} distinct routes for multi-scenario simulation.")

    rows = []
    total_trips = 0

    for train_row in candidate_trains:
        t_no = train_row["train_number"]
        t_name = train_row["train_name"]
        schedule = get_train_schedule(t_no)
        if len(schedule) < 4:
            continue

        priority = get_train_priority(t_no, t_name)

        # Simulate multiple trips across randomized weather/congestion seasons
        for trip_idx in range(num_trips_per_train):
            total_trips += 1
            # Scenarios: 0=Clear, 1=Foggy, 2=Monsoon, 3=Congested
            scenario = random.choices([0, 1, 2, 3], weights=[0.45, 0.25, 0.15, 0.15])[0]

            if scenario == 1: # Fog
                base_vis = random.uniform(80.0, 450.0)
                base_precip = 0.0
                base_temp = random.uniform(8.0, 16.0)
                fog_idx = round(max(0.0, (1000.0 - base_vis) / 900.0), 3)
            elif scenario == 2: # Heavy rain
                base_vis = random.uniform(1500.0, 4000.0)
                base_precip = random.uniform(16.0, 45.0)
                base_temp = random.uniform(22.0, 29.0)
                fog_idx = 0.0
            elif scenario == 3: # Congested
                base_vis = 8000.0
                base_precip = 0.0
                base_temp = 32.0
                fog_idx = 0.0
            else: # Clear
                base_vis = random.uniform(7000.0, 10000.0)
                base_precip = 0.0
                base_temp = random.uniform(20.0, 36.0)
                fog_idx = 0.0

            # Initial departure delay
            start_delay = random.choice([0.0, 0.0, 5.0, 12.0, 25.0]) if random.random() < 0.4 else 0.0
            sim = TrainSimulator(t_no, schedule, start_delay_min=start_delay)

            # Step through each stop in the schedule
            for stop_idx in range(len(sim.route_stops) - 1):
                curr_state = sim.get_state()
                curr_state["priority_rank"] = priority
                
                # Upstream delay injection
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

                feat_df = FeaturePipeline.extract_features(curr_state, weather)
                feat_dict = feat_df.iloc[0].to_dict()

                # Fast-forward simulation across this block section
                target_dist = curr_state["section_distance_km"]
                eff_speed = sim.get_effective_max_speed(base_vis, base_precip)
                nominal_time_min = (target_dist / sim.max_speed_kmh) * 60.0
                actual_time_min = (target_dist / eff_speed) * 60.0
                
                delta = actual_time_min - nominal_time_min

                # Signal & meet waits
                if random.random() < 0.15:
                    delta += random.uniform(2.0, 7.0)
                if priority >= 4 and random.random() < 0.25:
                    delta += random.uniform(4.0, 12.0)
                if upstream_delay > 20.0:
                    delta += random.uniform(3.0, 10.0)

                delta = round(max(-2.0, delta), 2) # can recover up to 2 min on slack

                # Advance simulator delay state
                sim.current_delay_min = max(0.0, sim.current_delay_min + delta)
                sim.delay_history.append(sim.current_delay_min)
                sim.current_stop_idx += 1

                feat_dict["delay_delta_next"] = delta
                rows.append(feat_dict)

    df = pd.DataFrame(rows)
    TRAINING_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(TRAINING_DATA_FILE, index=False)

    elapsed = time.time() - t0
    print(f"✅ Generated {len(df):,} training examples across {total_trips} trips in {elapsed:.2f}s.")
    print(f"📁 Saved to: {TRAINING_DATA_FILE}")
    print("-" * 60)
    print("Sample feature distributions:")
    print(df[["current_delay_min", "section_distance_km", "visibility_m", "delay_delta_next"]].describe())
    return df

if __name__ == "__main__":
    generate_training_dataset()
