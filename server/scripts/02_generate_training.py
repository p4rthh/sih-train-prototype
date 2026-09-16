import sys
import time
import random
import datetime
from pathlib import Path
from typing import List, Dict, Any
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.config import TRAINING_DATA_FILE, get_train_priority
from server.database import get_db_connection, get_train_schedule
from server.features.pipeline import FeaturePipeline, FEATURE_NAMES, KNOWN_REVERSAL_STATIONS, KNOWN_JUNCTION_CODES
from server.simulator.kinematic_engine import TrainSimulator
from server.models.recovery_engine import HistoricalRecoveryEngine

def get_stratified_candidate_trains(target_count: int = 200) -> List[Dict[str, Any]]:
    conn = get_db_connection()
    c = conn.cursor()
    c.execute("""
        SELECT train_number, COUNT(*) as stop_count, train_name
        FROM schedules
        GROUP BY train_number
        HAVING stop_count >= 6
    """)
    all_rows = [dict(r) for r in c.fetchall()]
    conn.close()

    by_priority: Dict[int, List[Dict[str, Any]]] = {1: [], 2: [], 3: [], 4: [], 5: []}
    for r in all_rows:
        p = get_train_priority(r["train_number"], r.get("train_name", ""))
        p_clamped = min(5, max(1, p))
        by_priority[p_clamped].append(r)

    selected: List[Dict[str, Any]] = []
    quotas = {1: 45, 2: 70, 3: 50, 4: 20, 5: 15}
    for p, quota in quotas.items():
        pool = by_priority.get(p, [])
        if pool:
            sample_size = min(len(pool), quota)
            selected.extend(random.sample(pool, sample_size))

    if len(selected) < target_count:
        remaining = [r for r in all_rows if r not in selected]
        needed = min(len(remaining), target_count - len(selected))
        if needed > 0:
            selected.extend(random.sample(remaining, needed))

    random.shuffle(selected)
    return selected

def generate_training_dataset(num_trips_per_train: int = 15) -> pd.DataFrame:
    t0 = time.time()
    candidate_trains = get_stratified_candidate_trains(target_count=200)
    print(f"Selected {len(candidate_trains)} stratified candidate trains across all priority tiers.")

    rows = []
    total_trips = 0

    for train_row in candidate_trains:
        t_no = str(train_row["train_number"]).strip()
        t_name = str(train_row.get("train_name", ""))
        schedule = get_train_schedule(t_no)
        if len(schedule) < 5:
            continue

        priority = get_train_priority(t_no, t_name)
        profile = HistoricalRecoveryEngine.get_historical_train_profile(t_no, priority)

        for trip_idx in range(num_trips_per_train):
            total_trips += 1
            scenario = random.choices([0, 1, 2, 3], weights=[0.50, 0.20, 0.15, 0.15])[0]

            if scenario == 1:
                base_vis = random.uniform(80.0, 450.0)
                base_precip = 0.0
                base_temp = random.uniform(7.0, 16.0)
                fog_idx = round(max(0.0, (1000.0 - base_vis) / 900.0), 3)
                weather_code = 45
            elif scenario == 2:
                base_vis = random.uniform(1200.0, 4000.0)
                base_precip = random.uniform(15.0, 50.0)
                base_temp = random.uniform(22.0, 30.0)
                fog_idx = 0.0
                weather_code = 63
            elif scenario == 3:
                base_vis = 8000.0
                base_precip = 0.0
                base_temp = 34.0
                fog_idx = 0.0
                weather_code = 1
            else:
                base_vis = random.uniform(6000.0, 10000.0)
                base_precip = 0.0
                base_temp = random.uniform(18.0, 36.0)
                fog_idx = 0.0
                weather_code = 1

            # Departure delay distribution
            start_delay = random.choices(
                [0.0, 3.0, 8.0, 15.0, 25.0, 40.0],
                weights=[0.55, 0.15, 0.12, 0.10, 0.05, 0.03]
            )[0]
            sim = TrainSimulator(t_no, schedule, start_delay_min=start_delay)

            # Assign trip departure time
            start_hour = random.choice([6.0, 8.5, 11.0, 14.0, 16.5, 18.0, 20.0, 22.0, 23.5])
            trip_date = datetime.date(2026, random.choice([1, 4, 7, 10]), random.randint(1, 28))
            current_sim_time = datetime.datetime(trip_date.year, trip_date.month, trip_date.day, int(start_hour), int((start_hour % 1) * 60))

            tot_stops = len(sim.route_stops)
            for stop_idx in range(tot_stops - 1):
                curr_stop = sim.route_stops[stop_idx]
                next_stop = sim.route_stops[stop_idx + 1]

                target_dist = float(next_stop.get("section_km") or 15.0)
                if target_dist <= 0.1:
                    target_dist = 5.0

                # Compute scheduled transit time
                sched_transit = 15.0
                p_dep = curr_stop.get("departure") or curr_stop.get("arrival")
                c_arr = next_stop.get("arrival") or next_stop.get("departure")
                if p_dep and c_arr:
                    try:
                        dh, dm = map(int, str(p_dep).split(":")[:2])
                        ah, am = map(int, str(c_arr).split(":")[:2])
                        dur = (ah * 60 + am) - (dh * 60 + dm)
                        if dur < 0:
                            dur += 1440
                        if 3.0 <= dur <= 360.0:
                            sched_transit = float(dur)
                    except Exception:
                        pass

                min_physical = (target_dist / sim.max_speed_kmh) * 60.0 + 1.5
                sec_slack = max(0.0, sched_transit - min_physical)
                sec_slack = min(sec_slack, max(2.0, target_dist * 0.25))

                # Build state representation
                curr_state = sim.get_state()
                curr_state["priority_rank"] = priority
                curr_state["train_no"] = t_no
                curr_state["section_distance_km"] = target_dist
                curr_state["section_scheduled_transit_min"] = sched_transit
                curr_state["recovery_slack_min"] = sec_slack
                curr_state["section_slack_min"] = sec_slack
                curr_state["sched_dwell_min"] = float(curr_stop.get("halt_min", 2.0))
                curr_state["prev_departure_time"] = p_dep
                curr_state["scheduled_arrival_time"] = c_arr
                curr_state["is_loco_reversal"] = 1 if (
                    float(curr_stop.get("halt_min", 2.0)) >= 20.0
                    or curr_stop.get("station_code", "") in KNOWN_REVERSAL_STATIONS
                ) else 0

                upstream_delay = random.uniform(10.0, 35.0) if (scenario == 3 and random.random() < 0.35) else 0.0
                curr_state["upstream_train_delay"] = upstream_delay

                weather = {
                    "visibility_m": base_vis,
                    "precipitation_mm": base_precip,
                    "temperature_c": base_temp,
                    "wind_speed_kmh": random.uniform(5.0, 25.0),
                    "weather_code": weather_code,
                    "fog_severity_index": fog_idx
                }

                feat_df = FeaturePipeline.extract_features(curr_state, weather, dt=current_sim_time)
                feat_dict = feat_df.iloc[0].to_dict()

                # Physical movement delta calculation
                eff_speed = sim.get_effective_max_speed(base_vis, base_precip)
                nominal_time_min = (target_dist / sim.max_speed_kmh) * 60.0
                actual_time_min = (target_dist / eff_speed) * 60.0
                delta = actual_time_min - nominal_time_min

                # Operational perturbations
                if random.random() < 0.10:
                    delta += random.uniform(1.5, 5.0)
                if priority >= 4 and random.random() < 0.20:
                    delta += random.uniform(3.0, 10.0)
                if upstream_delay > 15.0:
                    delta += random.uniform(2.5, 7.0)

                # Behavioral catch-up dynamics
                hour = current_sim_time.hour + (current_sim_time.minute / 60.0)
                is_overnight = (hour >= 22.5 or hour <= 5.5)
                stops_from_dest = tot_stops - 1 - stop_idx

                # Section-specific profile recovery
                p_code = curr_stop.get("station_code", "")
                c_code = next_stop.get("station_code", "")
                sec_rec_delta = HistoricalRecoveryEngine.get_section_recovery_delta(
                    t_no, p_code, c_code, is_overnight, sim.current_delay_min, priority
                )
                if sec_rec_delta < 0.0:
                    delta += sec_rec_delta

                # Timetable buffer slack & overnight clearing recovery
                if sim.current_delay_min > 2.0:
                    rec_rate = float(profile.get("median_recovery_rate", 0.70))
                    if is_overnight:
                        overnight_rec = random.uniform(1.0, 3.5) * rec_rate
                        delta -= overnight_rec
                    elif priority <= 2:
                        daytime_rec = random.uniform(0.5, 1.8) * rec_rate
                        delta -= daytime_rec

                    # Final terminal approach buffer padding
                    if stops_from_dest <= 3:
                        terminal_rec = random.uniform(2.0, 5.5) * rec_rate
                        delta -= terminal_rec

                    # Slack consumption when running late
                    slack_absorption = min(sec_slack * 0.4, sim.current_delay_min)
                    delta -= slack_absorption

                # Clamp delta to realistic limits per block section
                delta = round(max(-6.0, min(15.0, delta)), 2)

                # Cap cumulative delay at 120 min to prevent runaway compounding bug
                sim.current_delay_min = min(120.0, max(0.0, sim.current_delay_min + delta))
                sim.delay_history.append(sim.current_delay_min)
                sim.current_stop_idx += 1

                # Advance simulation clock
                elapsed_step_min = max(4.0, actual_time_min + max(0.0, delta))
                current_sim_time += datetime.timedelta(minutes=elapsed_step_min)

                feat_dict["delay_delta_next"] = delta
                rows.append(feat_dict)

    df = pd.DataFrame(rows)
    TRAINING_DATA_FILE.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(TRAINING_DATA_FILE, index=False)

    elapsed = time.time() - t0
    print(f"Generated {len(df)} samples across {total_trips} trips with bounded delays and 42 features in {elapsed:.2f}s.")
    return df

if __name__ == "__main__":
    generate_training_dataset()
