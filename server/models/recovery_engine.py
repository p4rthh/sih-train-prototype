import math
import datetime
from typing import List, Dict, Any, Optional, Tuple

class HistoricalRecoveryEngine:
    """
    Models Indian Railways operational catch-up dynamics based on historical logs:
    1. Overnight/midnight track clearance (22:30 - 05:30) where freight is looped and line utilization drops.
    2. Scheduled timetable slack (10-15% recovery margin built into working timetables).
    3. Terminal buffer time padding in the final 50-80 km approach into destination hubs.
    4. Train priority tiers (Rajdhani/Superfast loco pilots running at MPS to recover lost time).
    5. Station-specific bottleneck congestion delays and section-specific catchup rates.
    """

    @staticmethod
    def get_historical_train_profile(train_no: str, priority_rank: int = 2) -> Dict[str, Any]:
        from server.ingestion.historical_profiles import HistoricalProfileManager
        return HistoricalProfileManager.get_profile(train_no, priority_rank)

    @staticmethod
    def is_overnight_window(dt: datetime.datetime) -> bool:
        """Returns True if time falls in the low-congestion midnight clearing slot (22:30 to 05:30)."""
        hour = dt.hour + (dt.minute / 60.0)
        return hour >= 22.5 or hour <= 5.5

    @classmethod
    def calculate_section_slack(cls, section_km: float, scheduled_transit_min: float, max_speed_kmh: float = 110.0) -> float:
        """
        Calculates timetable buffer slack in minutes.
        Physical minimum time = section_km / max_speed_kmh * 60 + 1.5 min accel/decel.
        Slack = ScheduledTransit - PhysicalMinTime.
        """
        if section_km <= 0 or scheduled_transit_min <= 0:
            return 2.0
        min_physical = (section_km / max_speed_kmh) * 60.0 + 1.5
        slack = max(0.0, scheduled_transit_min - min_physical)
        return round(min(slack, max(2.0, section_km * 0.25)), 2)

    @classmethod
    def get_section_recovery_delta(
        cls,
        train_no: str,
        from_station: str,
        to_station: str,
        is_overnight: bool,
        current_delay: float,
        priority_rank: int = 2
    ) -> float:
        """
        Returns estimated delay delta (negative for recovery, positive for delay additions)
        for a specific block section based on historical profiles and operational slack.
        """
        profile = cls.get_historical_train_profile(train_no, priority_rank)
        sec_key = f"{from_station.strip().upper()}-{to_station.strip().upper()}"
        
        per_sec = profile.get("per_section_recovery", {})
        if sec_key in per_sec:
            base_delta = float(per_sec[sec_key])
            if current_delay > 5.0 and base_delta < 0:
                mult = float(profile.get("overnight_recovery_mps", 1.45)) if is_overnight else 1.0
                return round(base_delta * mult, 2)
            return round(base_delta, 2)

        # Fallback based on priority and overnight slot
        if current_delay > 3.0:
            rec_rate = float(profile.get("median_recovery_rate", 0.70))
            step = -1.0 * rec_rate * (1.4 if is_overnight else 1.0)
            return round(max(-3.5, step), 2)

        return 0.0

    @classmethod
    def compute_corridor_recovery_trajectory(
        cls,
        train_no: str,
        priority_rank: int,
        route_stops: List[Dict[str, Any]],
        current_stop_idx: int,
        current_delay_min: float,
        start_time_ist: datetime.datetime,
        has_live_anchor: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Computes the realistic station-by-station forecasted delay and dynamic ETA
        accounting for historical arrival/departure patterns, junction bottlenecks,
        overnight catchup, station dwell slack, and terminal buffer absorption.
        """
        profile = cls.get_historical_train_profile(train_no, priority_rank)
        total_stops = len(route_stops)
        
        trajectory = []
        hist_avg_arr = float(profile.get("avg_arrival_delay_min", 18.0))
        
        # When live NTES telemetry is present, honor actual current delay strictly
        if has_live_anchor:
            running_delay = max(0.0, float(current_delay_min))
        else:
            progress_frac = current_stop_idx / max(1, total_stops - 1)
            hist_baseline = hist_avg_arr * min(1.0, 0.35 + 0.65 * progress_frac)
            running_delay = max(float(current_delay_min), round(hist_baseline, 1))

        sim_time = start_time_ist

        for idx in range(total_stops):
            stop = route_stops[idx]

            if idx < current_stop_idx:
                trajectory.append({
                    "seq": stop["seq"],
                    "station_code": stop["station_code"],
                    "forecasted_delay_min": None,
                    "departure_delay_min": None,
                    "halt_min": int(stop.get("halt_min") or 0),
                    "is_recovered": False,
                    "recovered_min": 0.0
                })
                continue

            if idx == current_stop_idx:
                trajectory.append({
                    "seq": stop["seq"],
                    "station_code": stop["station_code"],
                    "forecasted_delay_min": running_delay,
                    "departure_delay_min": running_delay,
                    "halt_min": int(stop.get("halt_min") or 0),
                    "is_recovered": False,
                    "recovered_min": 0.0
                })
                continue

            # Upcoming stations: compute delay progression & recovery
            prev_stop = route_stops[idx - 1]
            sec_dist = float(stop.get("section_km") or 15.0)

            sched_transit = 15.0
            p_dep = prev_stop.get("departure") or prev_stop.get("arrival")
            c_arr = stop.get("arrival") or stop.get("departure")
            c_dep = stop.get("departure")

            if p_dep and c_arr:
                try:
                    ph, pm = map(int, str(p_dep).split(":")[:2])
                    ah, am = map(int, str(c_arr).split(":")[:2])
                    day_diff = max(0, int(stop.get("day", 1)) - int(prev_stop.get("day", 1)))
                    dur = (day_diff * 1440) + (ah * 60 + am) - (ph * 60 + pm)
                    if dur > 0:
                        sched_transit = float(dur)
                except Exception:
                    pass

            # Calculate halt dwell time
            halt_m = int(stop.get("halt_min") or 0)
            if halt_m <= 0 and c_arr and c_dep and c_arr != "START" and c_dep != "None":
                try:
                    ah, am = map(int, str(c_arr).split(":")[:2])
                    dh, dm = map(int, str(c_dep).split(":")[:2])
                    diff_m = (dh * 60 + dm) - (ah * 60 + am)
                    if diff_m < 0:
                        diff_m += 1440
                    halt_m = max(0, diff_m)
                except Exception:
                    pass
            if halt_m <= 0 and c_arr != "START" and c_dep != "None" and idx < total_stops - 1:
                halt_m = 2

            sec_slack = cls.calculate_section_slack(sec_dist, sched_transit)
            is_overnight = cls.is_overnight_window(sim_time)
            overnight_mult = float(profile.get("overnight_recovery_mps", 1.4)) if is_overnight else 1.0

            stops_from_end = (total_stops - 1) - idx
            terminal_boost = 1.6 if stops_from_end <= 3 else 1.0

            p_code = prev_stop.get("station_code", "")
            c_code = stop.get("station_code", "")
            sec_delta = cls.get_section_recovery_delta(
                train_no, p_code, c_code, is_overnight, running_delay, priority_rank
            )

            rec_rate = float(profile.get("median_recovery_rate", 0.70))
            
            # Bottleneck junction queueing from historical records (e.g. BRC, KOTA, MTJ, CNB)
            bottleneck_probs = profile.get("station_bottleneck_probability", {})
            b_prob = float(bottleneck_probs.get(c_code, 0.0))
            bottleneck_delay = round((b_prob * 6.0), 1) if b_prob > 0.15 else 0.0

            if sec_delta > 0.0:
                running_delay += sec_delta
            elif sec_delta < 0.0:
                rec_amount = min(running_delay, abs(sec_delta))
                running_delay = max(0.0, running_delay - rec_amount)
            elif running_delay > 5.0:
                base_recovery = sec_slack * rec_rate * overnight_mult * terminal_boost * 0.3
                running_delay = max(0.0, running_delay - min(running_delay, base_recovery))
            elif not has_live_anchor and running_delay < 15.0:
                # Gradual progressive section accumulation for pure simulations
                running_delay = min(hist_avg_arr, running_delay + min(1.5, sec_dist * 0.02))

            running_delay += bottleneck_delay

            # Terminal slack buffer absorption in final 1-2 approaches (working timetables pad 20-30 min)
            term_buffer = float(profile.get("terminal_slack_buffer_min", 20.0))
            if stops_from_end == 0:
                absorb = min(running_delay, term_buffer * 0.6)
                running_delay = max(0.0, running_delay - absorb)
            elif stops_from_end == 1:
                absorb = min(running_delay, term_buffer * 0.3)
                running_delay = max(0.0, running_delay - absorb)

            # Departure delay calculation: dwell buffer can absorb arrival delay
            min_dwell = min(halt_m, 2 if halt_m <= 3 else (5 if halt_m <= 15 else 8))
            dwell_slack = max(0, halt_m - min_dwell)
            dep_delay = max(0.0, running_delay - dwell_slack)

            sim_time += datetime.timedelta(minutes=max(4.0, sched_transit))

            is_fully_recovered = (current_delay_min > 5.0 and running_delay <= 2.0)
            total_recovered_so_far = max(0.0, float(current_delay_min) - running_delay)

            trajectory.append({
                "seq": stop["seq"],
                "station_code": stop["station_code"],
                "forecasted_delay_min": round(running_delay, 1),
                "departure_delay_min": round(dep_delay, 1),
                "halt_min": halt_m,
                "is_recovered": is_fully_recovered,
                "recovered_min": round(total_recovered_so_far, 1),
                "is_overnight_section": is_overnight
            })

        return trajectory
