import math
import random
import datetime
from typing import List, Dict, Any, Tuple, Optional
from server.config import get_train_priority, FOG_SEVERE_THRESHOLD_M, FOG_MODERATE_THRESHOLD_M
from server.ingestion.station_coords import haversine_distance_km

class TrainSimulator:
    """
    Kinematic simulator modeling train movement along a real scheduled route.
    Calculates trapezoidal acceleration, speed restrictions, and stochastic delay perturbations.
    """
    def __init__(self, train_no: str, schedule: List[Dict[str, Any]], start_delay_min: float = 0.0):
        self.train_no = str(train_no).strip()
        self.schedule = schedule
        self.train_name = schedule[0].get("train_name", f"Train {train_no}") if schedule else f"Train {train_no}"
        self.priority = get_train_priority(self.train_no, self.train_name)
        
        # Max operational speed based on priority
        if self.priority == 1:
            self.max_speed_kmh = 130.0
            self.accel = 0.5 # m/s^2
            self.decel = 0.6 # m/s^2
        elif self.priority == 2:
            self.max_speed_kmh = 110.0
            self.accel = 0.4
            self.decel = 0.5
        else:
            self.max_speed_kmh = 100.0
            self.accel = 0.35
            self.decel = 0.45

        # Initialize route stops with cumulative distances
        self._init_route_geometry()

        # State variables
        self.current_stop_idx = 0
        self.current_speed_kmh = 0.0
        self.current_delay_min = float(start_delay_min)
        self.delay_history: List[float] = [self.current_delay_min]
        
        self.current_lat = self.route_stops[0]["lat"]
        self.current_lon = self.route_stops[0]["lon"]
        self.section_dist_covered_km = 0.0
        self.status = "RUNNING" # "RUNNING", "DWELLING", "HALTED_SIGNAL", "COMPLETED"
        self.dwell_remaining_sec = 0.0

    def _init_route_geometry(self):
        """Filters valid coordinates and computes inter-station distances."""
        self.route_stops = []
        cum_dist = 0.0
        prev_lat, prev_lon = None, None

        for s in self.schedule:
            lat, lon = s.get("lat"), s.get("lon")
            if lat is None or lon is None:
                continue
            
            if prev_lat is not None and prev_lon is not None:
                sec_dist = haversine_distance_km(prev_lat, prev_lon, lat, lon)
                # Keep reasonable section length
                if sec_dist < 1.0:
                    sec_dist = 2.0
            else:
                sec_dist = 0.0
            
            cum_dist += sec_dist
            self.route_stops.append({
                "seq": s.get("seq", len(self.route_stops) + 1),
                "station_code": s.get("station_code"),
                "station_name": s.get("station_name"),
                "arrival": s.get("arrival"),
                "departure": s.get("departure"),
                "halt_min": s.get("halt_min", 2),
                "lat": float(lat),
                "lon": float(lon),
                "section_km": round(sec_dist, 2),
                "cum_dist_km": round(cum_dist, 2)
            })
            prev_lat, prev_lon = lat, lon

        if not self.route_stops:
            # Fallback single mock route if no coordinates found
            self.route_stops = [
                {"seq": 1, "station_code": "NDLS", "station_name": "NEW DELHI", "lat": 28.6423, "lon": 77.2200, "section_km": 0.0, "cum_dist_km": 0.0, "halt_min": 0},
                {"seq": 2, "station_code": "MTJ", "station_name": "MATHURA JN", "lat": 27.4924, "lon": 77.6737, "section_km": 141.0, "cum_dist_km": 141.0, "halt_min": 2},
                {"seq": 3, "station_code": "KOTA", "station_name": "KOTA JN", "lat": 25.2138, "lon": 75.8648, "section_km": 324.0, "cum_dist_km": 465.0, "halt_min": 10},
                {"seq": 4, "station_code": "RTM", "station_name": "RATLAM JN", "lat": 23.3315, "lon": 75.0367, "section_km": 267.0, "cum_dist_km": 732.0, "halt_min": 5},
                {"seq": 5, "station_code": "BCT", "station_name": "MUMBAI CENTRAL", "lat": 18.9707, "lon": 72.8194, "section_km": 654.0, "cum_dist_km": 1386.0, "halt_min": 0},
            ]

    def get_effective_max_speed(self, visibility_m: float = 10000.0, precipitation_mm: float = 0.0) -> float:
        """Determines physical speed ceiling considering weather safety caps."""
        v_cap = self.max_speed_kmh
        if visibility_m < FOG_SEVERE_THRESHOLD_M:
            v_cap = min(v_cap, 30.0) # IR Fog Rule: 30 km/h cap
        elif visibility_m < FOG_MODERATE_THRESHOLD_M:
            v_cap = min(v_cap, 60.0)

        if precipitation_mm > 15.0:
            v_cap = min(v_cap, 50.0) # Waterlogging caution order

        return v_cap

    def tick(self, dt_seconds: float = 30.0, visibility_m: float = 10000.0, precipitation_mm: float = 0.0) -> Dict[str, Any]:
        """
        Advances the simulation clock by dt_seconds (default 30-sec RTIS update interval).
        """
        if self.current_stop_idx >= len(self.route_stops) - 1:
            self.status = "COMPLETED"
            self.current_speed_kmh = 0.0
            return self.get_state()

        curr_stop = self.route_stops[self.current_stop_idx]
        next_stop = self.route_stops[self.current_stop_idx + 1]
        target_section_km = next_stop["section_km"]
        if target_section_km <= 0.1:
            target_section_km = 5.0 # Guard minimum section

        # Handle station dwelling
        if self.status == "DWELLING":
            self.dwell_remaining_sec -= dt_seconds
            if self.dwell_remaining_sec <= 0:
                self.status = "RUNNING"
                self.current_stop_idx += 1
                self.section_dist_covered_km = 0.0
            return self.get_state()

        # Compute speed target & braking curve
        v_target_kmh = self.get_effective_max_speed(visibility_m, precipitation_mm)
        v_curr_mps = self.current_speed_kmh / 3.6
        v_target_mps = v_target_kmh / 3.6

        dist_remaining_m = max(0.0, (target_section_km - self.section_dist_covered_km) * 1000.0)
        stopping_dist_m = (v_curr_mps ** 2) / (2.0 * self.decel)

        # Kinematic acceleration / deceleration
        if dist_remaining_m <= stopping_dist_m:
            # Decelerating to stop at next station
            v_curr_mps = max(0.0, v_curr_mps - self.decel * dt_seconds)
        elif v_curr_mps < v_target_mps:
            v_curr_mps = min(v_target_mps, v_curr_mps + self.accel * dt_seconds)
        elif v_curr_mps > v_target_mps:
            v_curr_mps = max(v_target_mps, v_curr_mps - self.decel * dt_seconds)

        self.current_speed_kmh = round(v_curr_mps * 3.6, 1)

        # Distance advanced in meters -> km
        step_km = (v_curr_mps * dt_seconds) / 1000.0
        self.section_dist_covered_km += step_km

        # Interpolate Lat/Lon along straight line between current and next station
        frac = min(1.0, max(0.0, self.section_dist_covered_km / target_section_km))
        self.current_lat = round(curr_stop["lat"] + (next_stop["lat"] - curr_stop["lat"]) * frac, 6)
        self.current_lon = round(curr_stop["lon"] + (next_stop["lon"] - curr_stop["lon"]) * frac, 6)

        # Check section completion
        if self.section_dist_covered_km >= target_section_km or dist_remaining_m <= 50.0:
            # Reached next station
            self.current_lat = next_stop["lat"]
            self.current_lon = next_stop["lon"]
            self.current_speed_kmh = 0.0
            self.status = "DWELLING"
            
            # Scheduled halt time with stochastic dwell anomaly
            dwell_anomaly_sec = random.expovariate(1.0 / 60.0) if random.random() < 0.3 else 0.0 # 30% chance extra halt
            self.dwell_remaining_sec = (next_stop.get("halt_min", 2) * 60.0) + dwell_anomaly_sec

            # Compute added delay over section compared to normal timetable
            nominal_sec = (target_section_km / self.max_speed_kmh) * 3600.0
            actual_sec = (target_section_km / max(20.0, self.get_effective_max_speed(visibility_m, precipitation_mm))) * 3600.0
            delay_added_min = max(0.0, (actual_sec - nominal_sec) / 60.0)
            
            # Stochastic signal halt
            if random.random() < 0.15: # 15% chance of signal check
                delay_added_min += random.uniform(3.0, 8.0)
            
            # Priority hold for lower rank trains
            if self.priority >= 4 and random.random() < 0.25:
                delay_added_min += random.uniform(5.0, 15.0)

            self.current_delay_min = round(self.current_delay_min + delay_added_min, 1)
            self.delay_history.append(self.current_delay_min)

        return self.get_state()

    def get_state(self) -> Dict[str, Any]:
        curr = self.route_stops[min(self.current_stop_idx, len(self.route_stops) - 1)]
        nxt_idx = min(self.current_stop_idx + 1, len(self.route_stops) - 1)
        nxt = self.route_stops[nxt_idx]

        return {
            "train_no": self.train_no,
            "train_name": self.train_name,
            "current_station_code": curr["station_code"],
            "current_station_name": curr["station_name"],
            "next_station_code": nxt["station_code"],
            "next_station_name": nxt["station_name"],
            "current_stop_idx": self.current_stop_idx,
            "total_stops": len(self.route_stops),
            "lat": self.current_lat,
            "lon": self.current_lon,
            "speed_kmh": self.current_speed_kmh,
            "current_delay_min": self.current_delay_min,
            "delay_history": self.delay_history,
            "status": self.status,
            "section_distance_km": nxt.get("section_km", 15.0),
            "priority_rank": self.priority
        }
