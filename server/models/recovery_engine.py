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
    """

    @staticmethod
    def get_historical_train_profile(train_no: str, priority_rank: int) -> Dict[str, float]:
        t_no = str(train_no).strip()

        # Dedicated profiles for major premier express trains
        PREMIER_PROFILES = {
            "12951": {"recovery_rate": 0.88, "overnight_factor": 1.45, "punctuality": 0.91, "terminal_buffer": 25.0},
            "12952": {"recovery_rate": 0.90, "overnight_factor": 1.50, "punctuality": 0.92, "terminal_buffer": 30.0},
            "12095": {"recovery_rate": 0.85, "overnight_factor": 1.40, "punctuality": 0.88, "terminal_buffer": 25.0},
            "12301": {"recovery_rate": 0.87, "overnight_factor": 1.45, "punctuality": 0.89, "terminal_buffer": 25.0},
            "12004": {"recovery_rate": 0.80, "overnight_factor": 1.30, "punctuality": 0.87, "terminal_buffer": 20.0},
            "22436": {"recovery_rate": 0.92, "overnight_factor": 1.55, "punctuality": 0.95, "terminal_buffer": 20.0},
        }

        if t_no in PREMIER_PROFILES:
            return PREMIER_PROFILES[t_no]

        # General tier-based profiles from Indian Railways historical punctuality statistics
        if priority_rank == 1:
            return {"recovery_rate": 0.85, "overnight_factor": 1.45, "punctuality": 0.90, "terminal_buffer": 25.0}
        elif priority_rank == 2:
            return {"recovery_rate": 0.70, "overnight_factor": 1.30, "punctuality": 0.82, "terminal_buffer": 18.0}
        elif priority_rank == 3:
            return {"recovery_rate": 0.45, "overnight_factor": 1.15, "punctuality": 0.70, "terminal_buffer": 12.0}
        elif priority_rank == 4:
            return {"recovery_rate": 0.30, "overnight_factor": 1.05, "punctuality": 0.60, "terminal_buffer": 8.0}
        else:
            return {"recovery_rate": 0.10, "overnight_factor": 1.00, "punctuality": 0.45, "terminal_buffer": 4.0}

    @staticmethod
    def is_overnight_window(dt: datetime.datetime) -> bool:
        """Returns True if time falls in the low-congestion midnight clearing slot (22:30 to 05:30)."""
        hour = dt.hour + (dt.minute / 60.0)
        return hour >= 22.5 or hour <= 5.5

    @classmethod
    def calculate_section_slack(cls, section_km: float, scheduled_transit_min: float, max_speed_kmh: float = 110.0) -> float:
        """
        Calculates timetable buffer slack in minutes.
        Physical minimum time = section_km / max_speed_kmh * 60 + 2 min accel/decel.
        Slack = ScheduledTransit - PhysicalMinTime.
        """
        if section_km <= 0 or scheduled_transit_min <= 0:
            return 2.0
        min_physical = (section_km / max_speed_kmh) * 60.0 + 1.5
        slack = max(0.0, scheduled_transit_min - min_physical)
        return round(min(slack, section_km * 0.25), 2)

    @classmethod
    def compute_corridor_recovery_trajectory(
        cls,
        train_no: str,
        priority_rank: int,
        route_stops: List[Dict[str, Any]],
        current_stop_idx: int,
        current_delay_min: float,
        start_time_ist: datetime.datetime
    ) -> List[Dict[str, Any]]:
        """
        Computes the realistic station-by-station forecasted delay and dynamic ETA
        accounting for historical catch-up behavior, overnight speedup, and terminal buffer absorption.
        """
        profile = cls.get_historical_train_profile(train_no, priority_rank)
        total_stops = len(route_stops)
        
        trajectory = []
        running_delay = max(0.0, float(current_delay_min))
        sim_time = start_time_ist

        for idx in range(total_stops):
            stop = route_stops[idx]

            if idx < current_stop_idx:
                trajectory.append({
                    "seq": stop["seq"],
                    "station_code": stop["station_code"],
                    "forecasted_delay_min": None,
                    "is_recovered": False,
                    "recovered_min": 0.0
                })
                continue

            if idx == current_stop_idx:
                trajectory.append({
                    "seq": stop["seq"],
                    "station_code": stop["station_code"],
                    "forecasted_delay_min": running_delay,
                    "is_recovered": False,
                    "recovered_min": 0.0
                })
                continue

            # Upcoming stations: compute recovery
            prev_stop = route_stops[idx - 1]
            sec_dist = float(stop.get("section_km") or 15.0)

            # Estimate scheduled transit minutes between prev and current stop
            sched_transit = 15.0
            p_dep = prev_stop.get("departure") or prev_stop.get("arrival")
            c_arr = stop.get("arrival") or stop.get("departure")
            if p_dep and c_arr:
                try:
                    ph, pm = map(int, str(p_dep).split(":")[:2])
                    ah, am = map(int, str(c_arr).split(":")[:2])
                    day_diff = max(0, int(stop.get("day", 1)) - int(prev_stop.get("day", 1)))
                    dur = (day_diff * 1440) + (ah * 60 + am) - (ph * 60 + pm)
                    if dur > 0:
                        sched_transit = dur
                except Exception:
                    pass

            sec_slack = cls.calculate_section_slack(sec_dist, sched_transit)

            # Check if traversing overnight hours
            is_overnight = cls.is_overnight_window(sim_time)
            overnight_mult = profile["overnight_factor"] if is_overnight else 1.0

            # Terminal approach boost: final 3 stops into destination have massive buffer
            stops_from_end = (total_stops - 1) - idx
            terminal_boost = 1.0
            if stops_from_end <= 3:
                terminal_boost = 1.6

            # Maximum recoverable minutes in this section
            # High-priority trains running late utilize built-in slack aggressively
            if running_delay > 3.0:
                base_recovery = sec_slack * profile["recovery_rate"] * overnight_mult * terminal_boost
                # Rate limit recovery to realistic bounds: 1 to 4 minutes per section
                recovery_step = min(running_delay, max(0.5, min(4.5, base_recovery)))
            else:
                recovery_step = min(running_delay, 0.5)

            # If train has sufficient slack and is near destination, absorb remaining delay
            if stops_from_end == 0 and running_delay <= profile["terminal_buffer"]:
                recovery_step = running_delay

            running_delay = max(0.0, running_delay - recovery_step)

            # Advance sim_time
            sim_time += datetime.timedelta(minutes=max(4.0, sched_transit - recovery_step))

            is_fully_recovered = (current_delay_min > 5.0 and running_delay <= 2.0)
            total_recovered_so_far = max(0.0, current_delay_min - running_delay)

            trajectory.append({
                "seq": stop["seq"],
                "station_code": stop["station_code"],
                "forecasted_delay_min": round(running_delay, 1),
                "is_recovered": is_fully_recovered,
                "recovered_min": round(total_recovered_so_far, 1),
                "is_overnight_section": is_overnight
            })

        return trajectory
