import datetime
from typing import List, Dict, Any, Optional, Tuple
from fastapi import APIRouter, HTTPException, Query

from server.config import get_train_priority
from server.database import (
    search_trains, get_train_schedule, get_db_connection, find_trains_between_stations,
    search_stations, resolve_station_code, TRAIN_ALIASES
)
from server.ingestion.weather_client import WeatherClient
from server.ingestion.ntes_anchor import get_live_ntes_anchor, parse_date_arg, get_active_ntes_instances
from server.ingestion.pnr_resolver import resolve_pnr_status
from server.simulator.kinematic_engine import TrainSimulator
from server.features.pipeline import FeaturePipeline
from server.models.lightgbm_model import DelayLightGBM
from server.models.stgcn_model import DelaySTGCN
from server.models.ensemble import StackingEnsemble
from server.models.conformal_uq import ConformalCalibrator
from server.models.explainer import DelayReasonEngine
from server.models.recovery_engine import HistoricalRecoveryEngine
from server.ingestion.historical_profiles import HistoricalProfileManager
from server.api.schemas import (
    TrainSearchResult, ETAResponse, DynamicETA, ConfidenceInterval,
    DelayReason, RouteStop, StationBoardItem, RouteSearchResultItem,
    StationSearchResult, PNRResponse, TrainInstanceSummary
)

router = APIRouter(prefix="/api", tags=["Train & ETA"])

weather_client = WeatherClient()
ml_model = DelayLightGBM()
stgcn_model = DelaySTGCN()
stacking_ensemble = StackingEnsemble()
cqr_calibrator = ConformalCalibrator()
shap_explainer: Optional[DelayReasonEngine] = None

ACTIVE_SIMULATORS: Dict[str, TrainSimulator] = {}
SIMULATOR_LAST_TICK: Dict[str, datetime.datetime] = {}
SIMULATOR_SOURCE: Dict[str, str] = {}
SIMULATOR_DESC: Dict[str, Optional[str]] = {}

MAX_ACTIVE_SIMULATORS = 150

def prune_simulators_if_needed():
    if len(ACTIVE_SIMULATORS) > MAX_ACTIVE_SIMULATORS:
        sorted_keys = sorted(
            SIMULATOR_LAST_TICK.keys(),
            key=lambda k: SIMULATOR_LAST_TICK.get(k, datetime.datetime.min.replace(tzinfo=datetime.timezone.utc))
        )
        for k in sorted_keys[:50]:
            ACTIVE_SIMULATORS.pop(k, None)
            SIMULATOR_LAST_TICK.pop(k, None)
            SIMULATOR_SOURCE.pop(k, None)
            SIMULATOR_DESC.pop(k, None)

class StableETATracker:
    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def _prune_cache_if_needed(self):
        if len(self._cache) > 250:
            sorted_keys = sorted(self._cache.keys(), key=lambda k: self._cache[k].get("last_update", datetime.datetime.min.replace(tzinfo=datetime.timezone.utc)))
            for k in sorted_keys[:75]:
                self._cache.pop(k, None)

    def get_stable_prediction(
        self,
        train_no: str,
        current_stop_idx: int,
        current_delay_min: float,
        candidate_forecast_delay: float,
        candidate_point_eta_dt: datetime.datetime,
        candidate_lower_eta_dt: datetime.datetime,
        candidate_upper_eta_dt: datetime.datetime,
        candidate_route_progress: List[RouteStop],
        now_ist: datetime.datetime,
        min_physical_eta_dt: Optional[datetime.datetime] = None,
    ) -> Tuple[float, datetime.datetime, datetime.datetime, datetime.datetime, List[RouteStop]]:
        cached = self._cache.get(train_no)
        if not cached:
            self._prune_cache_if_needed()
            entry = {
                "stop_idx": current_stop_idx,
                "ntes_delay": current_delay_min,
                "forecasted_delay": round(candidate_forecast_delay, 1),
                "point_eta_dt": candidate_point_eta_dt,
                "lower_eta_dt": candidate_lower_eta_dt,
                "upper_eta_dt": candidate_upper_eta_dt,
                "route_progress": candidate_route_progress,
                "last_update": now_ist
            }
            self._cache[train_no] = entry
            return (
                entry["forecasted_delay"],
                entry["point_eta_dt"],
                entry["lower_eta_dt"],
                entry["upper_eta_dt"],
                entry["route_progress"]
            )

        station_changed = (current_stop_idx != cached["stop_idx"])
        ntes_jump = (abs(current_delay_min - cached["ntes_delay"]) >= 1.5)
        forecast_jump = (abs(candidate_forecast_delay - cached["forecasted_delay"]) >= 2.0)
        
        physical_breach = False
        if min_physical_eta_dt and cached["point_eta_dt"] < min_physical_eta_dt:
            physical_breach = True
        elif cached["point_eta_dt"] < now_ist + datetime.timedelta(minutes=1.0):
            physical_breach = True

        if station_changed or ntes_jump or forecast_jump or physical_breach:
            if physical_breach and min_physical_eta_dt and not station_changed and not ntes_jump:
                push_dt = max(cached["point_eta_dt"], min_physical_eta_dt)
                diff = push_dt - cached["point_eta_dt"]
                cached["point_eta_dt"] = push_dt
                cached["lower_eta_dt"] += diff
                cached["upper_eta_dt"] += diff
                cached["last_update"] = now_ist
            else:
                cached["stop_idx"] = current_stop_idx
                cached["ntes_delay"] = current_delay_min
                cached["forecasted_delay"] = round(candidate_forecast_delay, 1)
                cached["point_eta_dt"] = candidate_point_eta_dt
                cached["lower_eta_dt"] = candidate_lower_eta_dt
                cached["upper_eta_dt"] = candidate_upper_eta_dt
                cached["route_progress"] = candidate_route_progress
                cached["last_update"] = now_ist

        return (
            cached["forecasted_delay"],
            cached["point_eta_dt"],
            cached["lower_eta_dt"],
            cached["upper_eta_dt"],
            cached["route_progress"]
        )

STABLE_ETA_TRACKER = StableETATracker()

def init_ml_engine():
    global shap_explainer
    if ml_model.load():
        stgcn_model.load()
        stacking_ensemble.load()
        cqr_calibrator.load()
        shap_explainer = DelayReasonEngine(ml_model.point_model)

init_ml_engine()

IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

def parse_schedule_time(time_str: Optional[str], day_offset: int = 1, base_date: Optional[datetime.date] = None) -> Optional[datetime.datetime]:
    if not time_str or str(time_str).strip() in ["None", "START", "--", ""]:
        return None
    try:
        parts = str(time_str).strip().split(":")
        h, m = int(parts[0]), int(parts[1])
        if base_date is None:
            base_date = datetime.datetime.now(IST).date()
        st_date = base_date + datetime.timedelta(days=max(0, int(day_offset or 1) - 1))
        return datetime.datetime(st_date.year, st_date.month, st_date.day, h, m, tzinfo=IST)
    except Exception:
        return None

def get_journey_start_date(sim: TrainSimulator, now_ist: datetime.datetime) -> datetime.date:
    if getattr(sim, "start_date", None):
        return sim.start_date
    if sim.status in ["YET_TO_START", "NOT_RUNNING_TODAY", "CANCELLED"]:
        return now_ist.date()

    curr_idx = min(sim.current_stop_idx, len(sim.route_stops) - 1)
    curr_stop = sim.route_stops[curr_idx]
    curr_day = max(1, int(curr_stop.get("day", 1)))

    orig_stop = sim.route_stops[0]
    orig_dep = orig_stop.get("departure") or "12:00:00"
    try:
        oh, om = map(int, str(orig_dep).split(":")[:2])
    except Exception:
        oh, om = 12, 0

    if curr_day == 1:
        if curr_idx >= 1 and oh > now_ist.hour:
            return now_ist.date() - datetime.timedelta(days=1)
        return now_ist.date()
    else:
        base = now_ist.date() - datetime.timedelta(days=curr_day - 1)
        c_dep = curr_stop.get("departure") or curr_stop.get("arrival") or "12:00:00"
        try:
            ch, cm = map(int, str(c_dep).split(":")[:2])
            if ch >= 20 and now_ist.hour < 6:
                base -= datetime.timedelta(days=1)
        except Exception:
            pass
        return base

def parse_stop_datetime(stop: Dict[str, Any], journey_start_date: datetime.date, use_arrival: bool = True) -> Optional[datetime.datetime]:
    if use_arrival:
        raw = stop.get("arrival") if stop.get("arrival") != "START" else stop.get("departure")
        if not raw or str(raw).strip() in ["None", "START", "--", ""]:
            raw = stop.get("departure")
    else:
        raw = stop.get("departure") if stop.get("departure") != "None" else stop.get("arrival")
        if not raw or str(raw).strip() in ["None", "START", "--", ""]:
            raw = stop.get("arrival")
    if not raw or str(raw).strip() in ["None", "--", ""]:
        return None
    try:
        parts = str(raw).strip().split(":")
        h, m = int(parts[0]), int(parts[1])
        day = max(1, int(stop.get("day", 1)))
        st_date = journey_start_date + datetime.timedelta(days=day - 1)
        return datetime.datetime(st_date.year, st_date.month, st_date.day, h, m, tzinfo=IST)
    except Exception:
        return None


def get_or_create_simulator(train_no: str, start_date: Optional[datetime.date] = None) -> Tuple[TrainSimulator, str, datetime.date]:
    raw_no = str(train_no).strip()
    t_no = TRAIN_ALIASES.get(raw_no, raw_no)
    now_ist = datetime.datetime.now(IST)

    if start_date is None:
        start_date = now_ist.date()

    date_str = start_date.strftime("%Y-%m-%d")
    instance_key = f"{t_no}_{date_str}"

    if instance_key not in ACTIVE_SIMULATORS:
        prune_simulators_if_needed()
        schedule = get_train_schedule(t_no)
        if not schedule:
            raise HTTPException(status_code=404, detail=f"Train #{raw_no} schedule not found in database")

        sim = TrainSimulator(t_no, schedule, start_date=start_date)

        anchor = get_live_ntes_anchor(t_no, start_date_str=date_str)
        if anchor:
            run_st = anchor.get("run_status", "RUNNING")
            stn = anchor.get("last_station_code") or sim.route_stops[0]["station_code"]
            nxt_stn = anchor.get("next_station_code")
            del_m = float(anchor.get("current_delay_min") or 0.0)
            sim.anchor_to_ntes(stn, del_m, run_status=run_st, next_station_code=nxt_stn)
            SIMULATOR_SOURCE[instance_key] = "NTES_REALTIME"
            SIMULATOR_DESC[instance_key] = anchor.get("position_desc") or f"Live at {stn} (+{int(del_m)}m delay)"
        else:
            sim.sync_to_current_time()
            SIMULATOR_SOURCE[instance_key] = "SCHEDULE_REALTIME"
            if sim.status == "YET_TO_START":
                dep_t = sim.route_stops[0].get("departure") or "--:--"
                stn_n = sim.route_stops[0]["station_name"]
                SIMULATOR_DESC[instance_key] = f"Yet to start from {stn_n} (Scheduled departure: {dep_t})"
            elif sim.status == "COMPLETED":
                arr_t = sim.route_stops[-1].get("arrival") or "--:--"
                stn_n = sim.route_stops[-1]["station_name"]
                SIMULATOR_DESC[instance_key] = f"Journey completed at {stn_n} (Scheduled arrival: {arr_t})"
            else:
                SIMULATOR_DESC[instance_key] = "Synchronized to timetable operational schedule"

        ACTIVE_SIMULATORS[instance_key] = sim
        SIMULATOR_LAST_TICK[instance_key] = now_ist
        return sim, instance_key, start_date

    sim = ACTIVE_SIMULATORS[instance_key]
    last_tick = SIMULATOR_LAST_TICK.get(instance_key, now_ist)
    elapsed_sec = max(1.0, min(120.0, (now_ist - last_tick).total_seconds()))
    SIMULATOR_LAST_TICK[instance_key] = now_ist

    anchor = get_live_ntes_anchor(t_no, start_date_str=date_str)
    if anchor:
        run_st = anchor.get("run_status", "RUNNING")
        stn = (anchor.get("last_station_code") or sim.route_stops[0]["station_code"]).strip().upper()
        nxt_stn = anchor.get("next_station_code")
        del_m = float(anchor.get("current_delay_min") or 0.0)
        last_stn = getattr(sim, "last_anchored_ntes_station", None)
        if last_stn != stn or sim.status != run_st or abs(sim.current_delay_min - del_m) >= 2.0:
            sim.anchor_to_ntes(stn, del_m, run_status=run_st, next_station_code=nxt_stn)
            SIMULATOR_SOURCE[instance_key] = "NTES_REALTIME"
            SIMULATOR_DESC[instance_key] = anchor.get("position_desc") or f"Live at {stn} (+{int(del_m)}m delay)"
        else:
            sim.current_delay_min = del_m
            if sim.delay_history:
                sim.delay_history[-1] = del_m

    if sim.status == "RUNNING":
        curr_stn = sim.route_stops[min(sim.current_stop_idx, len(sim.route_stops) - 1)]["station_code"]
        weather = weather_client.get_weather(curr_stn, sim.current_lat, sim.current_lon)
        sim.tick(elapsed_sec, weather.get("visibility_m", 10000.0), weather.get("precipitation_mm", 0.0))
        if anchor:
            sim.current_delay_min = del_m
    else:
        sim.current_speed_kmh = 0.0

    return sim, instance_key, start_date


@router.get("/trains/search", response_model=List[TrainSearchResult])
def search_trains_endpoint(q: str = Query(..., min_length=1)):
    results = search_trains(q, limit=20)
    return [TrainSearchResult(train_number=r["train_number"], train_name=r["train_name"]) for r in results]

@router.get("/stations/search", response_model=List[StationSearchResult])
def search_stations_endpoint(q: str = Query(..., min_length=1)):
    results = search_stations(q, limit=20)
    return [StationSearchResult(
        station_code=r["station_code"],
        station_name=r["station_name"],
        state=r.get("state"),
        zone=r.get("zone")
    ) for r in results]

@router.get("/pnr/{pnr_no}", response_model=PNRResponse)
def get_pnr_status_endpoint(pnr_no: str):
    res = resolve_pnr_status(pnr_no)
    if not res:
        raise HTTPException(status_code=400, detail="Invalid 10-digit PNR number.")
    return PNRResponse(**res)

@router.get("/trains/route", response_model=List[RouteSearchResultItem])
def search_trains_route_endpoint(
    from_stn: str = Query(...),
    to_stn: str = Query(...),
    express_only: bool = Query(True)
):
    results = find_trains_between_stations(from_stn, to_stn, express_only=express_only, limit=100)
    return [RouteSearchResultItem(**r) for r in results]

@router.get("/train/{train_no}/schedule")
def get_schedule_endpoint(train_no: str):
    schedule = get_train_schedule(train_no)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Train #{train_no} not found")
    return {
        "train_no": train_no,
        "total_stops": len(schedule),
        "stops": schedule
    }

@router.get("/train/{train_no}/instances", response_model=List[TrainInstanceSummary])
def get_train_instances_endpoint(train_no: str):
    raw_no = str(train_no).strip()
    t_no = TRAIN_ALIASES.get(raw_no, raw_no)
    schedule = get_train_schedule(t_no)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Train #{raw_no} schedule not found in database")
    instances = get_active_ntes_instances(raw_no, schedule)
    return [TrainInstanceSummary(**i) for i in instances]

@router.get("/train/{train_no}/eta", response_model=ETAResponse)
def get_train_eta_endpoint(train_no: str, start_date: Optional[str] = None):
    raw_no = str(train_no).strip()
    t_no = TRAIN_ALIASES.get(raw_no, raw_no)
    schedule = get_train_schedule(t_no)
    if not schedule:
        raise HTTPException(status_code=404, detail=f"Train #{raw_no} schedule not found in database")

    active_instances_raw = get_active_ntes_instances(raw_no, schedule)
    active_instances = [TrainInstanceSummary(**i) for i in active_instances_raw]

    valid_start_date: Optional[str] = None
    if isinstance(start_date, str) and start_date.strip():
        valid_start_date = start_date.strip()

    resolved_date: datetime.date
    if valid_start_date:
        parsed = parse_date_arg(valid_start_date)
        resolved_date = parsed if parsed else datetime.datetime.now(IST).date()
    else:
        running_inst = next((i for i in active_instances if i.run_status in ["RUNNING", "DWELLING"]), None)
        if running_inst:
            parsed_running = parse_date_arg(running_inst.start_date)
            resolved_date = parsed_running if parsed_running else datetime.datetime.now(IST).date()
        else:
            today_inst = next((i for i in active_instances if i.is_today), None)
            if today_inst:
                parsed_today = parse_date_arg(today_inst.start_date)
                resolved_date = parsed_today if parsed_today else datetime.datetime.now(IST).date()
            elif active_instances:
                parsed_first = parse_date_arg(active_instances[0].start_date)
                resolved_date = parsed_first if parsed_first else datetime.datetime.now(IST).date()
            else:
                resolved_date = datetime.datetime.now(IST).date()

    sim, instance_key, resolved_date = get_or_create_simulator(t_no, start_date=resolved_date)
    state = sim.get_state()
    anchor = get_live_ntes_anchor(t_no, start_date_str=resolved_date.strftime("%Y-%m-%d"))

    today_date = datetime.datetime.now(IST).date()
    if resolved_date == today_date:
        start_date_label = f"Started Today ({resolved_date.strftime('%d %b')})"
    elif resolved_date == today_date - datetime.timedelta(days=1):
        start_date_label = f"Started Yesterday ({resolved_date.strftime('%d %b')})"
    else:
        start_date_label = f"Started {resolved_date.strftime('%d %b')}"

    stn_code = state["current_station_code"]
    weather = weather_client.get_weather(stn_code, state["lat"], state["lon"])

    feat_df = FeaturePipeline.extract_features(state, weather)

    curr_delay = state["current_delay_min"]
    pred_delta_stgcn = 0.0
    now_ist = datetime.datetime.now(IST)

    is_not_running = (sim.status == "NOT_RUNNING_TODAY")
    is_cancelled = (sim.status == "CANCELLED")
    is_yet_to_start = (sim.status == "YET_TO_START")
    is_completed = (sim.status == "COMPLETED")

    if is_not_running:
        curr_delay = 0.0
        forecasted_delay = 0.0
        window_lower_min = 0.0
        window_upper_min = 0.0
        desc_text = SIMULATOR_DESC.get(instance_key) or "Train is not scheduled to run today on Indian Railways network"
        reasons_list = [{
            "reason": desc_text,
            "severity": "LOW",
            "impact_min": 0.0
        }]
    elif is_cancelled:
        curr_delay = 0.0
        forecasted_delay = 0.0
        window_lower_min = 0.0
        window_upper_min = 0.0
        desc_text = SIMULATOR_DESC.get(instance_key) or "Train service cancelled by Indian Railways"
        reasons_list = [{
            "reason": desc_text,
            "severity": "HIGH",
            "impact_min": 0.0
        }]
    elif is_yet_to_start:
        curr_delay = 0.0
        forecasted_delay = 0.0
        window_lower_min = 0.0
        window_upper_min = 2.0
        orig_dep = sim.route_stops[0].get("departure") or "--:--"
        reasons_list = [{
            "reason": f"Train yet to start from source platform — Waiting for scheduled departure ({orig_dep})",
            "severity": "LOW",
            "impact_min": 0.0
        }]
    elif is_completed:
        forecasted_delay = 0.0
        window_lower_min = 0.0
        window_upper_min = 0.0
        reasons_list = [{
            "reason": "Train has reached destination terminal — Journey completed",
            "severity": "LOW",
            "impact_min": 0.0
        }]
    elif ml_model.is_fitted:
        preds = ml_model.predict(feat_df)
        pred_delta_lgb = preds["point_delta"]

        if stgcn_model.is_fitted:
            pred_delta_stgcn = stgcn_model.predict(
                sim.route_stops,
                state["current_stop_idx"],
                state["delay_history"],
                weather,
                priority_rank=state.get("priority_rank", 2),
                train_no=sim.train_no
            )
        else:
            pred_delta_stgcn = pred_delta_lgb

        pred_delta = stacking_ensemble.predict_delta(
            pred_delta_lgb,
            pred_delta_stgcn,
            hop_dist=1,
            context={"priority": state.get("priority_rank", 2), "current_delay": curr_delay}
        )
        forecasted_delay = max(0.0, curr_delay + pred_delta)
        low_delta, high_delta = cqr_calibrator.predict_interval(
            preds["q10_delta"],
            preds["q90_delta"],
            priority=state.get("priority_rank", 2),
            progress=state.get("trip_progress_ratio", 0.5)
        )
        window_lower_min = max(0.0, curr_delay + low_delta)
        window_upper_min = max(window_lower_min + 1.5, curr_delay + high_delta)

        if shap_explainer:
            reasons_list = shap_explainer.explain(feat_df)
        else:
            reasons_list = [{
                "reason": "Operational cruising speed — normal signal clearance",
                "severity": "LOW",
                "impact_min": 0.0
            }]
    else:
        forecasted_delay = curr_delay + 4.0
        window_lower_min = curr_delay + 1.0
        window_upper_min = curr_delay + 9.0
        reasons_list = [{
            "reason": "Operational cruising speed — normal signal clearance",
            "severity": "LOW",
            "impact_min": 0.0
        }]

    priority_rank = state.get("priority_rank", 2)
    hist_profile = HistoricalProfileManager.get_profile(sim.train_no, priority_rank)
    has_live = bool(SIMULATOR_SOURCE.get(instance_key) == "NTES_REALTIME" or anchor is not None)
    recovery_traj = HistoricalRecoveryEngine.compute_corridor_recovery_trajectory(
        train_no=sim.train_no,
        priority_rank=priority_rank,
        route_stops=sim.route_stops,
        current_stop_idx=state["current_stop_idx"],
        current_delay_min=curr_delay,
        start_time_ist=now_ist,
        has_live_anchor=has_live
    )

    nxt_idx = 0 if (is_yet_to_start or is_not_running or is_cancelled) else min(state["current_stop_idx"] + 1, len(sim.route_stops) - 1)
    nxt_stop = sim.route_stops[nxt_idx]

    if is_not_running or is_cancelled or is_yet_to_start:
        raw_sched = sim.route_stops[0].get("departure") or "--:--"
    elif is_completed:
        raw_sched = sim.route_stops[-1].get("arrival") or "--:--"
    else:
        raw_sched = nxt_stop.get("arrival") or nxt_stop.get("departure") or "--:--"
    sched_str = str(raw_sched)[:5] if len(str(raw_sched)) >= 5 and str(raw_sched) != "START" else str(raw_sched)
    journey_start = get_journey_start_date(sim, now_ist)

    # Ground forecasted delay in historical arrival & departure records
    if not (is_not_running or is_cancelled or is_yet_to_start or is_completed):
        nxt_rec = recovery_traj[nxt_idx] if nxt_idx < len(recovery_traj) else {}
        base_hist_delay = float(nxt_rec.get("forecasted_delay_min") if nxt_rec.get("forecasted_delay_min") is not None else curr_delay)
        forecasted_delay = max(curr_delay, round(base_hist_delay + (pred_delta if ml_model.is_fitted else 0.0), 1))
        
        if forecasted_delay >= 4.0 and (not reasons_list or "Normal operational" in reasons_list[0]["reason"]):
            stn_name = nxt_stop.get("station_name", "intermediate section")
            reasons_list = [{
                "reason": f"Expected junction & sectional regulation at {stn_name} based on historical operational records",
                "severity": "MEDIUM" if forecasted_delay >= 15.0 else "LOW",
                "impact_min": round(forecasted_delay, 1)
            }]

    if is_not_running or is_cancelled or is_yet_to_start:
        point_eta_dt = parse_stop_datetime(sim.route_stops[0], journey_start) or now_ist
        lower_eta_dt = point_eta_dt
        upper_eta_dt = point_eta_dt
    elif is_completed:
        point_eta_dt = now_ist
        lower_eta_dt = now_ist
        upper_eta_dt = now_ist
    else:
        sched_dt = parse_stop_datetime(nxt_stop, journey_start)
        if sched_dt is not None:
            point_eta_dt = sched_dt + datetime.timedelta(minutes=round(forecasted_delay))
            if point_eta_dt < now_ist:
                point_eta_dt = now_ist + datetime.timedelta(minutes=1.0)
        else:
            point_eta_dt = now_ist + datetime.timedelta(minutes=max(2.0, round(forecasted_delay)))

        cqr_margin = max(2.0, cqr_calibrator.q_hat if cqr_calibrator.q_hat > 0 else 3.0)
        lower_eta_dt = max(now_ist + datetime.timedelta(minutes=1.0), point_eta_dt - datetime.timedelta(minutes=cqr_margin))
        upper_eta_dt = point_eta_dt + datetime.timedelta(minutes=cqr_margin)

    route_progress = []
    prev_milestone_dt = point_eta_dt

    for idx, stop in enumerate(sim.route_stops):
        is_rec = False
        rec_amt = 0.0

        raw_arr = stop.get("arrival")
        raw_dep = stop.get("departure")
        halt_m = int(stop.get("halt_min") or 0)
        if halt_m <= 0 and raw_arr and raw_dep and raw_arr not in ["START", "None", "--"] and raw_dep not in ["START", "None", "--"]:
            try:
                ah, am = map(int, str(raw_arr).split(":")[:2])
                dh, dm = map(int, str(raw_dep).split(":")[:2])
                diff_m = (dh * 60 + dm) - (ah * 60 + am)
                if diff_m < 0:
                    diff_m += 1440
                halt_m = max(0, diff_m)
            except Exception:
                pass
        if halt_m <= 0 and raw_arr != "START" and raw_dep != "None" and idx < len(sim.route_stops) - 1:
            halt_m = 2

        if is_not_running or is_cancelled:
            status = "current" if idx == 0 else "upcoming"
            d_min = 0.0
            eta_arr = "CANCELLED"
            eta_dep = "CANCELLED"
            raw_t = stop.get("departure") if idx == 0 else (stop.get("arrival") or stop.get("departure") or "--:--")
            eta_time = "CANCELLED" if is_cancelled else (str(raw_t)[:5] if raw_t and raw_t != "START" else "--:--")
        elif is_yet_to_start:
            d_min = 0.0
            if idx == 0:
                status = "current"
                eta_arr = "START"
                eta_dep = str(raw_dep)[:5] if raw_dep and raw_dep != "None" else "NOW"
                eta_time = eta_dep
            else:
                status = "upcoming"
                eta_arr = str(raw_arr)[:5] if raw_arr and raw_arr != "START" else "--:--"
                eta_dep = str(raw_dep)[:5] if raw_dep and raw_dep != "None" else "--:--"
                eta_time = eta_arr
        elif is_completed:
            if idx == len(sim.route_stops) - 1:
                status = "current"
                d_min = curr_delay
                eta_arr = "ARRIVED"
                eta_dep = "DESTINATION"
                eta_time = "ARRIVED"
            else:
                status = "departed"
                d_min = 0.0
                eta_arr = "PASSED"
                eta_dep = "DEPARTED"
                eta_time = None
        elif idx < state["current_stop_idx"]:
            status = "departed"
            d_min = state["delay_history"][min(idx, len(state["delay_history"])-1)]
            eta_arr = "PASSED"
            eta_dep = "DEPARTED"
            eta_time = None
        elif idx == state["current_stop_idx"]:
            if sim.status == "DWELLING" or (sim.status == "YET_TO_START" and idx == 0):
                status = "current"
                d_min = curr_delay
                eta_arr = "AT PLATFORM" if idx > 0 else "SOURCE"
                eta_dep = "NOW"
                eta_time = "NOW"
            else:
                status = "departed"
                d_min = state["delay_history"][min(idx, len(state["delay_history"])-1)] if state.get("delay_history") else curr_delay
                eta_arr = "PASSED"
                eta_dep = "DEPARTED"
                eta_time = None
        elif idx == state["current_stop_idx"] + 1:
            status = "upcoming"
            d_min = forecasted_delay
            rec_node = recovery_traj[idx] if idx < len(recovery_traj) else {}
            dep_d_min = float(rec_node.get("departure_delay_min", d_min))
            eta_arr = point_eta_dt.strftime("%H:%M")
            if raw_dep and raw_dep != "None" and idx < len(sim.route_stops) - 1:
                s_dep_dt = parse_stop_datetime(stop, journey_start, use_arrival=False)
                if s_dep_dt:
                    cand_dep = s_dep_dt + datetime.timedelta(minutes=round(dep_d_min))
                    eta_dep = cand_dep.strftime("%H:%M")
                else:
                    eta_dep = eta_arr
            else:
                eta_dep = "TERMINAL"
            eta_time = eta_arr
            prev_milestone_dt = point_eta_dt
        else:
            status = "upcoming"
            hop_hops = idx - state["current_stop_idx"]
            multihop_delta = stacking_ensemble.predict_delta(
                preds["point_delta"] if ml_model.is_fitted else 1.5,
                pred_delta_stgcn,
                hop_dist=hop_hops,
                context={"priority": priority_rank, "current_delay": curr_delay}
            )
            rec_node = recovery_traj[idx] if idx < len(recovery_traj) else {}
            base_rec_delay = float(rec_node.get("forecasted_delay_min", curr_delay))
            dep_d_min = float(rec_node.get("departure_delay_min", base_rec_delay))
            # Autoregressive forward delay propagation
            d_min = max(0.0, round(base_rec_delay + (multihop_delta * max(0.05, 0.25 - 0.02 * min(10, hop_hops))), 1))
            is_rec = bool(rec_node.get("is_recovered", False))
            rec_amt = float(rec_node.get("recovered_min", 0.0))

            s_dt = parse_stop_datetime(stop, journey_start, use_arrival=True)
            if s_dt is not None:
                cand_dt = s_dt + datetime.timedelta(minutes=round(d_min))
                stop_eta_dt = max(prev_milestone_dt + datetime.timedelta(minutes=2.0), cand_dt)
            else:
                inter_km = float(stop.get("section_km") or 15.0)
                inter_mins = (inter_km / 80.0) * 60.0
                stop_eta_dt = prev_milestone_dt + datetime.timedelta(minutes=max(3.0, inter_mins))
            prev_milestone_dt = stop_eta_dt
            eta_arr = stop_eta_dt.strftime("%H:%M")

            if raw_dep and raw_dep != "None" and idx < len(sim.route_stops) - 1:
                s_dep_dt = parse_stop_datetime(stop, journey_start, use_arrival=False)
                if s_dep_dt:
                    cand_dep = s_dep_dt + datetime.timedelta(minutes=round(dep_d_min))
                    eta_dep = cand_dep.strftime("%H:%M")
                else:
                    eta_dep = eta_arr
            else:
                eta_dep = "TERMINAL"

            eta_time = eta_arr

        route_progress.append(RouteStop(
            seq=stop["seq"],
            station_code=stop["station_code"],
            station_name=stop["station_name"],
            status=status,
            scheduled_arrival=stop["arrival"],
            scheduled_departure=stop["departure"],
            delay_min=round(d_min, 1) if d_min is not None else None,
            eta=eta_time,
            eta_arrival=eta_arr,
            eta_departure=eta_dep,
            halt_min=halt_m,
            lat=stop.get("lat"),
            lon=stop.get("lon"),
            is_recovered=is_rec,
            recovered_min=round(rec_amt, 1)
        ))

    min_physical_dt = None
    if sim.status == "RUNNING" and nxt_stop:
        rem_sec_km = max(0.0, float(nxt_stop.get("section_km", 20.0)) - float(sim.section_dist_covered_km))
        phys_min = (rem_sec_km / max(40.0, sim.max_speed_kmh)) * 60.0
        min_physical_dt = now_ist + datetime.timedelta(minutes=phys_min)

    if not (is_not_running or is_cancelled or is_yet_to_start or is_completed):
        forecasted_delay, point_eta_dt, lower_eta_dt, upper_eta_dt, route_progress = STABLE_ETA_TRACKER.get_stable_prediction(
            train_no=instance_key,
            current_stop_idx=state["current_stop_idx"],
            current_delay_min=curr_delay,
            candidate_forecast_delay=forecasted_delay,
            candidate_point_eta_dt=point_eta_dt,
            candidate_lower_eta_dt=lower_eta_dt,
            candidate_upper_eta_dt=upper_eta_dt,
            candidate_route_progress=route_progress,
            now_ist=now_ist,
            min_physical_eta_dt=min_physical_dt
        )

    dest_stop_info = recovery_traj[-1] if recovery_traj else {}
    dest_forecast_delay = float(dest_stop_info.get("forecasted_delay_min", 0.0))
    dest_recovered_min = float(dest_stop_info.get("recovered_min", 0.0))
    is_overnight = HistoricalRecoveryEngine.is_overnight_window(now_ist)

    if dest_recovered_min >= 6.0:
        reasons_list.append({
            "reason": f"Overnight speedup and buffer slack: historical patterns show train recovers {int(dest_recovered_min)}m delay before terminal",
            "severity": "LOW",
            "impact_min": -round(dest_recovered_min, 1)
        })

    curr_stn_code = sim.route_stops[0]["station_code"] if (is_yet_to_start or is_not_running or is_cancelled) else (sim.route_stops[-1]["station_code"] if is_completed else state["current_station_code"])
    curr_stn_name = sim.route_stops[0]["station_name"] if (is_yet_to_start or is_not_running or is_cancelled) else (sim.route_stops[-1]["station_name"] if is_completed else state["current_station_name"])
    nxt_stn_code = (sim.route_stops[-1]["station_code"] if (is_not_running or is_cancelled) else ((sim.route_stops[1]["station_code"] if len(sim.route_stops) > 1 else sim.route_stops[0]["station_code"]) if is_yet_to_start else (sim.route_stops[-1]["station_code"] if is_completed else state["next_station_code"])))
    nxt_stn_name = (sim.route_stops[-1]["station_name"] if (is_not_running or is_cancelled) else ((sim.route_stops[1]["station_name"] if len(sim.route_stops) > 1 else sim.route_stops[0]["station_name"]) if is_yet_to_start else (sim.route_stops[-1]["station_name"] if is_completed else state["next_station_name"])))
    curr_lat = sim.route_stops[0]["lat"] if (is_yet_to_start or is_not_running or is_cancelled) else (sim.route_stops[-1]["lat"] if is_completed else state["lat"])
    curr_lon = sim.route_stops[0]["lon"] if (is_yet_to_start or is_not_running or is_cancelled) else (sim.route_stops[-1]["lon"] if is_completed else state["lon"])
    curr_speed = 0.0 if (is_yet_to_start or is_completed or is_not_running or is_cancelled) else state["speed_kmh"]

    return ETAResponse(
        train_no=raw_no,
        train_name=sim.train_name,
        instance_id=instance_key,
        start_date=resolved_date.strftime("%Y-%m-%d"),
        start_date_label=start_date_label,
        active_instances=active_instances,
        run_status=sim.status,
        current_station_code=curr_stn_code,
        current_station_name=curr_stn_name,
        next_station_code=nxt_stn_code,
        next_station_name=nxt_stn_name,
        lat=curr_lat,
        lon=curr_lon,
        speed_kmh=curr_speed,
        current_delay_min=curr_delay,
        forecasted_delay_min=round(forecasted_delay, 1),
        scheduled_arrival=sched_str,
        dynamic_eta=DynamicETA(
            point_estimate=point_eta_dt.strftime("%H:%M"),
            confidence_90=ConfidenceInterval(
                lower=lower_eta_dt.strftime("%H:%M"),
                upper=upper_eta_dt.strftime("%H:%M")
            )
        ),
        delay_reasons=[DelayReason(**r) for r in reasons_list],
        route_progress=route_progress,
        telemetry_source=SIMULATOR_SOURCE.get(instance_key, "NTES_REALTIME"),
        live_position_desc=(
            f"Yet to start from {curr_stn_name} ({curr_stn_code})" if is_yet_to_start else
            f"Journey completed at {curr_stn_name} ({curr_stn_code})" if is_completed else
            (f"Departed {curr_stn_name} ({curr_stn_code}) - En route to {nxt_stn_name} ({nxt_stn_code})" if sim.status == "RUNNING" and curr_stn_code != nxt_stn_code else
             (f"At {curr_stn_name} ({curr_stn_code}) platform" if sim.status == "DWELLING" else
              SIMULATOR_DESC.get(instance_key, "Operational run")))
        ),
        model_b_stgcn_delta=round(pred_delta_stgcn, 2),
        ensemble_blend_ratio=f"{int(stacking_ensemble.w_lgb * 100)}% LightGBM + {int(stacking_ensemble.w_stgcn * 100)}% ST-GCN",
        dest_delay_recovery_min=round(dest_recovered_min, 1),
        dest_forecasted_delay_min=round(dest_forecast_delay, 1),
        historical_on_time_pct=float(hist_profile.get("historical_on_time_pct", 90.0)),
        is_overnight_recovery_active=is_overnight
    )

@router.get("/station/{station_code}/board", response_model=List[StationBoardItem])
def get_station_board_endpoint(station_code: str, express_only: bool = Query(True)):
    stn = resolve_station_code(station_code.strip())
    now_ist = datetime.datetime.now(IST)
    conn = get_db_connection()
    cursor = conn.cursor()

    sql = """
        SELECT train_number, train_name, arrival, departure, halt_min
        FROM schedules
        WHERE station_code = ?
    """
    if express_only:
        sql += """
          AND train_name NOT LIKE '%Passenger%'
          AND train_name NOT LIKE '%MEMU%'
          AND train_name NOT LIKE '%DEMU%'
          AND train_name NOT LIKE '%EMU%'
          AND train_name NOT LIKE '%Local%'
          AND train_name NOT LIKE '%Shuttle%'
        """
    sql += " ORDER BY CASE WHEN departure IS NOT NULL AND departure != 'None' THEN departure ELSE arrival END ASC LIMIT 40"

    cursor.execute(sql, (stn,))
    rows = cursor.fetchall()
    conn.close()

    items = []
    for idx, r in enumerate(rows):
        t_no = str(r["train_number"]).strip()
        sched_time = r["departure"] if r["departure"] and r["departure"] != "None" else (r["arrival"] or "12:00:00")
        sched_dt = parse_schedule_time(sched_time, 1, now_ist.date())

        instance_key = f"{t_no}_{now_ist.strftime('%Y-%m-%d')}"
        sim_delay: float = 0.0

        if instance_key in ACTIVE_SIMULATORS:
            sim_delay = float(ACTIVE_SIMULATORS[instance_key].current_delay_min)
        else:
            anchor = get_live_ntes_anchor(t_no)
            if anchor and anchor.get("run_status") in ["RUNNING", "DWELLING"]:
                sim_delay = float(anchor.get("current_delay_min") or 0.0)
            elif anchor and anchor.get("run_status") in ["YET_TO_START", "COMPLETED"]:
                sim_delay = float(anchor.get("current_delay_min") or 0.0) if anchor.get("run_status") == "COMPLETED" else 0.0
            else:
                p_rank = get_train_priority(t_no, r["train_name"] or "")
                profile = HistoricalProfileManager.get_profile(t_no, p_rank)
                avg_del = float(profile.get("avg_arrival_delay_min", 10.0))
                punct = float(profile.get("historical_on_time_pct", 85.0))
                bottlenecks = profile.get("station_bottleneck_probability", {})
                b_prob = float(bottlenecks.get(stn, 0.0))
                sim_delay = (avg_del * 0.4 if punct >= 90.0 else avg_del) + (b_prob * 8.0)

        sim_delay = round(max(0.0, sim_delay), 1)

        if sched_dt:
            eta_dt = sched_dt + datetime.timedelta(minutes=sim_delay)
            if eta_dt < now_ist - datetime.timedelta(minutes=10):
                eta_dt += datetime.timedelta(days=1)
        else:
            eta_dt = now_ist + datetime.timedelta(minutes=15 + idx * 10 + sim_delay)

        tag = "On Time" if sim_delay <= 2.0 else f"Delayed by {int(sim_delay)}m"

        items.append(StationBoardItem(
            train_number=r["train_number"],
            train_name=r["train_name"],
            scheduled_time=str(sched_time)[:5],
            predicted_eta=eta_dt.strftime("%H:%M"),
            delay_min=sim_delay,
            status="ON_TIME" if sim_delay <= 2.0 else "DELAYED",
            delay_tag=tag
        ))

    return items
