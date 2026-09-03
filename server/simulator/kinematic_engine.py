import math
import random
import datetime
from typing import List, Dict, Any, Tuple, Optional
from server.config import get_train_priority, FOG_SEVERE_THRESHOLD_M, FOG_MODERATE_THRESHOLD_M
from server.ingestion.station_coords import haversine_distance_km

class TrainSimulator:
    def __init__(self, train_no: str, schedule: List[Dict[str, Any]], start_delay_min: float = 0.0):
        self.train_no = str(train_no).strip()
        self.schedule = schedule
        self.train_name = schedule[0].get("train_name", f"Train {train_no}") if schedule else f"Train {train_no}"
        self.priority = get_train_priority(self.train_no, self.train_name)
        
        if self.priority == 1:
            self.max_speed_kmh = 130.0
            self.accel = 0.5
            self.decel = 0.6
        elif self.priority == 2:
            self.max_speed_kmh = 110.0
            self.accel = 0.4
            self.decel = 0.5
        else:
            self.max_speed_kmh = 100.0
            self.accel = 0.35
            self.decel = 0.45

        self._init_route_geometry()

        self.current_stop_idx = 0
        self.current_speed_kmh = 0.0
        self.current_delay_min = float(start_delay_min)
        self.delay_history: List[float] = [self.current_delay_min]
        
        self.current_lat = self.route_stops[0]["lat"]
        self.current_lon = self.route_stops[0]["lon"]
        self.section_dist_covered_km = 0.0
        self.status = "RUNNING"
        self.dwell_remaining_sec = 0.0

    def _init_route_geometry(self):
        self.route_stops = []
        cum_dist = 0.0
        prev_lat, prev_lon = None, None

        for s in self.schedule:
            lat, lon = s.get("lat"), s.get("lon")
            if lat is None or lon is None:
                continue
            
            if prev_lat is not None and prev_lon is not None:
                sec_dist = haversine_distance_km(prev_lat, prev_lon, lat, lon)
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
            self.route_stops = [
                {"seq": 1, "station_code": "NDLS", "station_name": "NEW DELHI", "lat": 28.6423, "lon": 77.2200, "section_km": 0.0, "cum_dist_km": 0.0, "halt_min": 0},
                {"seq": 2, "station_code": "MTJ", "station_name": "MATHURA JN", "lat": 27.4924, "lon": 77.6737, "section_km": 141.0, "cum_dist_km": 141.0, "halt_min": 2},
                {"seq": 3, "station_code": "KOTA", "station_name": "KOTA JN", "lat": 25.2138, "lon": 75.8648, "section_km": 324.0, "cum_dist_km": 465.0, "halt_min": 10},
                {"seq": 4, "station_code": "RTM", "station_name": "RATLAM JN", "lat": 23.3315, "lon": 75.0367, "section_km": 267.0, "cum_dist_km": 732.0, "halt_min": 5},
                {"seq": 5, "station_code": "BCT", "station_name": "MUMBAI CENTRAL", "lat": 18.9707, "lon": 72.8194, "section_km": 654.0, "cum_dist_km": 1386.0, "halt_min": 0},
            ]

    def anchor_to_ntes(self, last_station_code: str, delay_min: float, speed_kmh: float = 85.0) -> bool:
        target_code = str(last_station_code).strip().upper()
        found_idx = None

        for idx, stop in enumerate(self.route_stops):
            if stop["station_code"].upper() == target_code:
                found_idx = idx
                break

        if found_idx is not None:
            self.current_stop_idx = min(found_idx, len(self.route_stops) - 2)
            self.current_lat = self.route_stops[found_idx]["lat"]
            self.current_lon = self.route_stops[found_idx]["lon"]
            self.current_delay_min = float(delay_min)
            self.delay_history = [max(0.0, delay_min - 3.0), float(delay_min)]
            self.current_speed_kmh = speed_kmh
            self.section_dist_covered_km = 0.0
            self.status = "RUNNING"
            return True

        return False

    def sync_to_current_time(self) -> bool:
        now_ist = datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=5, minutes=30)))
        current_minute = now_ist.hour * 60 + now_ist.minute

        for idx, stop in enumerate(self.route_stops[:-1]):
            dep_str = stop.get("departure") or stop.get("arrival")
            nxt_str = self.route_stops[idx+1].get("arrival") or self.route_stops[idx+1].get("departure")
            if not dep_str or not nxt_str:
                continue
            try:
                dh, dm = map(int, str(dep_str).split(":")[:2])
                ah, am = map(int, str(nxt_str).split(":")[:2])
                dep_m = dh * 60 + dm
                arr_m = ah * 60 + am
                if arr_m < dep_m:
                    arr_m += 1440
                
                check_m = current_minute
                if check_m < dep_m and current_minute + 1440 <= arr_m:
                    check_m += 1440

                if dep_m <= check_m <= arr_m:
                    frac = (check_m - dep_m) / max(1.0, float(arr_m - dep_m))
                    self.current_stop_idx = idx
                    self.current_lat = round(stop["lat"] + (self.route_stops[idx+1]["lat"] - stop["lat"]) * frac, 6)
                    self.current_lon = round(stop["lon"] + (self.route_stops[idx+1]["lon"] - stop["lon"]) * frac, 6)
                    self.current_speed_kmh = self.max_speed_kmh * 0.85
                    self.section_dist_covered_km = self.route_stops[idx+1]["section_km"] * frac
                    self.status = "RUNNING"
                    return True
            except Exception:
                continue

        return False

    def get_effective_max_speed(self, visibility_m: float = 10000.0, precipitation_mm: float = 0.0) -> float:
        v_cap = self.max_speed_kmh
        if visibility_m < FOG_SEVERE_THRESHOLD_M:
            v_cap = min(v_cap, 30.0)
        elif visibility_m < FOG_MODERATE_THRESHOLD_M:
            v_cap = min(v_cap, 60.0)

        if precipitation_mm > 15.0:
            v_cap = min(v_cap, 50.0)

        return v_cap

    def tick(self, dt_seconds: float = 30.0, visibility_m: float = 10000.0, precipitation_mm: float = 0.0) -> Dict[str, Any]:
        if self.current_stop_idx >= len(self.route_stops) - 1:
            self.status = "COMPLETED"
            self.current_speed_kmh = 0.0
            return self.get_state()

        curr_stop = self.route_stops[self.current_stop_idx]
        next_stop = self.route_stops[self.current_stop_idx + 1]
        target_section_km = next_stop["section_km"]
        if target_section_km <= 0.1:
            target_section_km = 5.0

        if self.status == "DWELLING":
            self.dwell_remaining_sec -= dt_seconds
            if self.dwell_remaining_sec <= 0:
                self.status = "RUNNING"
                self.current_stop_idx += 1
                self.section_dist_covered_km = 0.0
            return self.get_state()

        v_target_kmh = self.get_effective_max_speed(visibility_m, precipitation_mm)
        v_curr_mps = self.current_speed_kmh / 3.6
        v_target_mps = v_target_kmh / 3.6

        dist_remaining_m = max(0.0, (target_section_km - self.section_dist_covered_km) * 1000.0)
        stopping_dist_m = (v_curr_mps ** 2) / (2.0 * self.decel)

        if dist_remaining_m <= stopping_dist_m:
            v_curr_mps = max(0.0, v_curr_mps - self.decel * dt_seconds)
        elif v_curr_mps < v_target_mps:
            v_curr_mps = min(v_target_mps, v_curr_mps + self.accel * dt_seconds)
        elif v_curr_mps > v_target_mps:
            v_curr_mps = max(v_target_mps, v_curr_mps - self.decel * dt_seconds)

        self.current_speed_kmh = round(v_curr_mps * 3.6, 1)

        step_km = (v_curr_mps * dt_seconds) / 1000.0
        self.section_dist_covered_km += step_km

        frac = min(1.0, max(0.0, self.section_dist_covered_km / target_section_km))
        self.current_lat = round(curr_stop["lat"] + (next_stop["lat"] - curr_stop["lat"]) * frac, 6)
        self.current_lon = round(curr_stop["lon"] + (next_stop["lon"] - curr_stop["lon"]) * frac, 6)

        if self.section_dist_covered_km >= target_section_km or dist_remaining_m <= 50.0:
            self.current_lat = next_stop["lat"]
            self.current_lon = next_stop["lon"]
            self.current_speed_kmh = 0.0
            self.status = "DWELLING"
            
            dwell_anomaly_sec = random.expovariate(1.0 / 60.0) if random.random() < 0.3 else 0.0
            self.dwell_remaining_sec = (next_stop.get("halt_min", 2) * 60.0) + dwell_anomaly_sec

            nominal_sec = (target_section_km / self.max_speed_kmh) * 3600.0
            actual_sec = (target_section_km / max(20.0, self.get_effective_max_speed(visibility_m, precipitation_mm))) * 3600.0
            delay_added_min = max(0.0, (actual_sec - nominal_sec) / 60.0)
            
            if random.random() < 0.15:
                delay_added_min += random.uniform(3.0, 8.0)
            
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
