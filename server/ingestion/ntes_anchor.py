import datetime
import time
from typing import Dict, Any, Optional, List
from ntes import NTESClient

NTES_CACHE: Dict[str, Dict[str, Any]] = {}
NTES_CACHE_TIMESTAMP: Dict[str, float] = {}
CACHE_TTL_SECONDS = 60.0
MAX_NTES_CACHE_SIZE = 300

def prune_ntes_cache():
    now_ts = time.time()
    expired_keys = [k for k, ts in NTES_CACHE_TIMESTAMP.items() if (now_ts - ts) > (CACHE_TTL_SECONDS * 3)]
    for k in expired_keys:
        NTES_CACHE.pop(k, None)
        NTES_CACHE_TIMESTAMP.pop(k, None)
    if len(NTES_CACHE) > MAX_NTES_CACHE_SIZE:
        sorted_keys = sorted(NTES_CACHE_TIMESTAMP.keys(), key=lambda k: NTES_CACHE_TIMESTAMP.get(k, 0))
        for k in sorted_keys[:50]:
            NTES_CACHE.pop(k, None)
            NTES_CACHE_TIMESTAMP.pop(k, None)

ntes_client = NTESClient(timeout=1.5, retries=0)

def parse_date_arg(date_str: Optional[str]) -> datetime.date:
    tz_ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    today = datetime.datetime.now(tz_ist).date()
    if not date_str or str(date_str).strip() in ["today", "current", "", "None"]:
        return today
    clean = str(date_str).strip()
    if clean.lower() == "yesterday":
        return today - datetime.timedelta(days=1)
    if clean.lower() == "day_before":
        return today - datetime.timedelta(days=2)
    for fmt in ("%Y-%m-%d", "%d-%b-%Y", "%d-%m-%Y", "%d/%m/%Y"):
        try:
            return datetime.datetime.strptime(clean, fmt).date()
        except Exception:
            continue
    return today

def get_live_ntes_anchor(train_no: str, start_date_str: Optional[str] = None) -> Optional[Dict[str, Any]]:
    raw_no = str(train_no).strip()
    from server.database import TRAIN_ALIASES
    t_no = TRAIN_ALIASES.get(raw_no, raw_no)
    now_ts = time.time()

    target_date = parse_date_arg(start_date_str)
    date_iso = target_date.strftime("%Y-%m-%d")
    date_ntes = target_date.strftime("%d-%b-%Y")
    cache_key = f"{t_no}_{date_iso}"

    if cache_key in NTES_CACHE and (now_ts - NTES_CACHE_TIMESTAMP.get(cache_key, 0)) < CACHE_TTL_SECONDS:
        cached = NTES_CACHE[cache_key]
        if cached is None:
            return None
        res_dict = dict(cached)
        res_dict["train_no"] = raw_no
        return res_dict

    prune_ntes_cache()

    try:
        res = ntes_client.live_status(t_no, date_ntes)
        
        if not res or not isinstance(res, dict):
            # If not explicitly specified date, try yesterday as fallback
            if not start_date_str:
                yesterday = target_date - datetime.timedelta(days=1)
                res_yest = ntes_client.live_status(t_no, yesterday.strftime("%d-%b-%Y"))
                if res_yest and isinstance(res_yest, dict):
                    res = res_yest
                    target_date = yesterday
                    date_iso = target_date.strftime("%Y-%m-%d")
                    cache_key = f"{t_no}_{date_iso}"
                else:
                    NTES_CACHE[cache_key] = None
                    NTES_CACHE_TIMESTAMP[cache_key] = now_ts
                    return None
            else:
                NTES_CACHE[cache_key] = None
                NTES_CACHE_TIMESTAMP[cache_key] = now_ts
                return None

        cpos = str(res.get("CPOS") or "").strip()
        cpos_lower = cpos.lower()
        trunst = res.get("TRUNST")
        is_arr_dstn = bool(res.get("isArrDSTN", False))

        src_code = str(res.get("SRC") or "").strip().upper()
        dstn_code = str(res.get("DSTN") or "").strip().upper()
        last_stn = str(res.get("LSTN") or "").strip().upper()

        # Case 1: If today's train hasn't started yet, check if yesterday's overnight service is actively running on tracks
        if trunst == 0 or "yet to start" in cpos_lower:
            yesterday = (datetime.date.today() - datetime.timedelta(days=1)).strftime("%d-%b-%Y")
            res_yest = ntes_client.live_status(t_no, yesterday)
            if res_yest and isinstance(res_yest, dict):
                y_trunst = res_yest.get("TRUNST")
                y_cpos = str(res_yest.get("CPOS") or "").strip()
                y_last_stn = str(res_yest.get("LSTN") or "").strip().upper()
                y_is_arr = bool(res_yest.get("isArrDSTN", False))
                if (y_trunst == 1 or "departed from" in y_cpos.lower() or "arrived at" in y_cpos.lower()) and not y_is_arr:
                    res = res_yest
                    cpos = y_cpos
                    cpos_lower = cpos.lower()
                    trunst = y_trunst
                    is_arr_dstn = False
                    src_code = str(res.get("SRC") or "").strip().upper()
                    dstn_code = str(res.get("DSTN") or "").strip().upper()
                    last_stn = y_last_stn

        # If still not started after checking yesterday
        if trunst == 0 or "yet to start" in cpos_lower:
            anchor_data = {
                "train_no": t_no,
                "train_name": res.get("TNM", ""),
                "start_date": date_iso,
                "start_date_display": target_date.strftime("%d %b %Y"),
                "run_status": "YET_TO_START",
                "last_station_code": src_code,
                "last_station_name": res.get("SRCN", ""),
                "next_station_code": None,
                "next_station_name": None,
                "current_delay_min": 0.0,
                "position_desc": cpos if cpos else f"Yet to start from source station ({src_code})",
                "is_arrived_dest": False,
                "source_code": src_code,
                "dest_code": dstn_code,
                "fetch_timestamp": now_ts
            }
            NTES_CACHE[cache_key] = dict(anchor_data)
            NTES_CACHE_TIMESTAMP[cache_key] = now_ts
            anchor_data["train_no"] = raw_no
            return anchor_data

        # Case 2: Train has completed journey / reached final destination
        if is_arr_dstn or trunst == 2 or ("arrived at" in cpos_lower and dstn_code and dstn_code in cpos.upper()):
            delay_val = res.get("LDEL")
            try:
                delay_min = float(delay_val) if delay_val is not None else 0.0
            except (ValueError, TypeError):
                delay_min = 0.0

            anchor_data = {
                "train_no": t_no,
                "train_name": res.get("TNM", ""),
                "start_date": date_iso,
                "start_date_display": target_date.strftime("%d %b %Y"),
                "run_status": "COMPLETED",
                "last_station_code": dstn_code or last_stn,
                "last_station_name": res.get("LSTNN", ""),
                "next_station_code": None,
                "next_station_name": None,
                "current_delay_min": delay_min,
                "position_desc": cpos if cpos else f"Journey completed. Arrived at destination ({dstn_code})",
                "is_arrived_dest": True,
                "source_code": src_code,
                "dest_code": dstn_code,
                "fetch_timestamp": now_ts
            }
            NTES_CACHE[cache_key] = dict(anchor_data)
            NTES_CACHE_TIMESTAMP[cache_key] = now_ts
            anchor_data["train_no"] = raw_no
            return anchor_data

        # Case 3: Train is actively running on tracks
        if last_stn and (trunst == 1 or "departed from" in cpos_lower or (res and res.get("TRUNST") == 1)):
            delay_val = res.get("LDEL")
            try:
                delay_min = float(delay_val) if delay_val is not None else 0.0
            except (ValueError, TypeError):
                delay_min = 0.0

            anchor_data = {
                "train_no": t_no,
                "train_name": res.get("TNM", ""),
                "start_date": date_iso,
                "start_date_display": target_date.strftime("%d %b %Y"),
                "run_status": "RUNNING",
                "last_station_code": last_stn,
                "last_station_name": res.get("LSTNN", ""),
                "next_station_code": str(res.get("NPSTN") or res.get("NSTN") or "").strip().upper(),
                "next_station_name": res.get("NPSTNN") or res.get("NSTNN") or "",
                "current_delay_min": delay_min,
                "position_desc": cpos or res.get("LUPDFULL") or f"Live at {last_stn}",
                "is_arrived_dest": False,
                "source_code": src_code,
                "dest_code": dstn_code,
                "fetch_timestamp": now_ts
            }
            NTES_CACHE[cache_key] = dict(anchor_data)
            NTES_CACHE_TIMESTAMP[cache_key] = now_ts
            anchor_data["train_no"] = raw_no
            return anchor_data

        # Case 4: Train has no active run on tracks. Verify days of run and official status.
        sched = ntes_client.schedule(t_no)
        if sched and isinstance(sched, dict):
            t_name = sched.get("TrainName") or (res or {}).get("TNM") or f"Train {t_no}"
            src_c = str(sched.get("Source") or src_code or "").strip().upper()
            src_n = sched.get("SourceName") or src_c
            dst_c = str(sched.get("Destination") or dstn_code or "").strip().upper()
            dst_n = sched.get("DestinationName") or dst_c
            alert = str(sched.get("AlertMsg") or (res or {}).get("AlertMsg") or "").strip()

            if "cancelled" in alert.lower() or "canceled" in alert.lower():
                anchor_data = {
                    "train_no": t_no,
                    "train_name": t_name,
                    "start_date": date_iso,
                    "start_date_display": target_date.strftime("%d %b %Y"),
                    "run_status": "CANCELLED",
                    "last_station_code": src_c,
                    "last_station_name": src_n,
                    "next_station_code": dst_c,
                    "next_station_name": dst_n,
                    "current_delay_min": 0.0,
                    "position_desc": f"Cancelled by Indian Railways: {alert}",
                    "is_arrived_dest": False,
                    "source_code": src_c,
                    "dest_code": dst_c,
                    "fetch_timestamp": now_ts
                }
                NTES_CACHE[cache_key] = dict(anchor_data)
                NTES_CACHE_TIMESTAMP[cache_key] = now_ts
                anchor_data["train_no"] = raw_no
                return anchor_data

            days_of_run = str(sched.get("DaysOfRun") or "Daily").strip()
            v_dates = sched.get("vStartDateList") or []
            today_str = target_date.strftime("%d-%b-%Y")
            today_weekday = target_date.strftime("%a").lower()
            runs_on_weekday = ("daily" in days_of_run.lower()) or (today_weekday in days_of_run.lower())
            runs_today = (today_str in v_dates) if v_dates else runs_on_weekday

            if not runs_today:
                next_date = sched.get("startDate") or (v_dates[0] if v_dates else "Next scheduled date")
                anchor_data = {
                    "train_no": t_no,
                    "train_name": t_name,
                    "start_date": date_iso,
                    "start_date_display": target_date.strftime("%d %b %Y"),
                    "run_status": "NOT_RUNNING_TODAY",
                    "last_station_code": src_c,
                    "last_station_name": src_n,
                    "next_station_code": dst_c,
                    "next_station_name": dst_n,
                    "current_delay_min": 0.0,
                    "position_desc": f"Not scheduled to run on this day (Operates: {days_of_run}, Next service: {next_date})",
                    "is_arrived_dest": False,
                    "source_code": src_c,
                    "dest_code": dst_c,
                    "fetch_timestamp": now_ts
                }
                NTES_CACHE[cache_key] = dict(anchor_data)
                NTES_CACHE_TIMESTAMP[cache_key] = now_ts
                anchor_data["train_no"] = raw_no
                return anchor_data

            anchor_data = {
                "train_no": t_no,
                "train_name": t_name,
                "start_date": date_iso,
                "start_date_display": target_date.strftime("%d %b %Y"),
                "run_status": "YET_TO_START",
                "last_station_code": src_c,
                "last_station_name": src_n,
                "next_station_code": dst_c,
                "next_station_name": dst_n,
                "current_delay_min": 0.0,
                "position_desc": f"Yet to start from source station ({src_n})",
                "is_arrived_dest": False,
                "source_code": src_c,
                "dest_code": dst_c,
                "fetch_timestamp": now_ts
            }
            NTES_CACHE[cache_key] = dict(anchor_data)
            NTES_CACHE_TIMESTAMP[cache_key] = now_ts
            anchor_data["train_no"] = raw_no
            return anchor_data

        NTES_CACHE[cache_key] = None
        NTES_CACHE_TIMESTAMP[cache_key] = now_ts
        return None

    except Exception:
        NTES_CACHE[cache_key] = None
        NTES_CACHE_TIMESTAMP[cache_key] = now_ts
        return None

def get_active_ntes_instances(train_no: str, schedule: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    raw_no = str(train_no).strip()
    from server.database import TRAIN_ALIASES
    t_no = TRAIN_ALIASES.get(raw_no, raw_no)
    tz_ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    today = datetime.datetime.now(tz_ist).date()

    max_days = 1
    if schedule:
        max_days = max(int(s.get("day", 1) or 1) for s in schedule)

    candidate_dates = [today, today - datetime.timedelta(days=1)]
    if max_days >= 3:
        candidate_dates.append(today - datetime.timedelta(days=2))

    instances = []
    for d in candidate_dates:
        d_iso = d.strftime("%Y-%m-%d")
        d_display = d.strftime("%d %b %Y")
        is_today = (d == today)
        is_yesterday = (d == today - datetime.timedelta(days=1))

        if is_today:
            label = f"Started Today ({d.strftime('%d %b')})"
        elif is_yesterday:
            label = f"Started Yesterday ({d.strftime('%d %b')})"
        else:
            label = f"Started {d.strftime('%d %b')} (Day 3)"

        instance_id = f"{raw_no}_{d_iso}"
        anchor = get_live_ntes_anchor(t_no, start_date_str=d_iso)

        if anchor:
            stn_c = anchor.get("last_station_code") or (schedule[0]["station_code"] if schedule else "")
            stn_n = anchor.get("last_station_name") or (schedule[0]["station_name"] if schedule else stn_c)
            instances.append({
                "instance_id": instance_id,
                "train_no": raw_no,
                "start_date": d_iso,
                "start_date_display": d_display,
                "label": label,
                "is_today": is_today,
                "run_status": anchor.get("run_status", "RUNNING"),
                "current_station_code": stn_c,
                "current_station_name": stn_n,
                "next_station_code": anchor.get("next_station_code"),
                "next_station_name": anchor.get("next_station_name"),
                "current_delay_min": float(anchor.get("current_delay_min") or 0.0),
                "speed_kmh": 0.0 if anchor.get("run_status") in ["YET_TO_START", "COMPLETED", "CANCELLED", "NOT_RUNNING_TODAY"] else 85.0,
                "position_desc": anchor.get("position_desc"),
            })
        elif schedule:
            from server.simulator.kinematic_engine import TrainSimulator
            sim_temp = TrainSimulator(t_no, schedule, start_date=d)
            sim_temp.sync_to_current_time()
            st_state = sim_temp.get_state()
            instances.append({
                "instance_id": instance_id,
                "train_no": raw_no,
                "start_date": d_iso,
                "start_date_display": d_display,
                "label": label,
                "is_today": is_today,
                "run_status": st_state["status"],
                "current_station_code": st_state["current_station_code"],
                "current_station_name": st_state["current_station_name"],
                "next_station_code": st_state.get("next_station_code"),
                "next_station_name": st_state.get("next_station_name"),
                "current_delay_min": float(st_state.get("current_delay_min", 0.0)),
                "speed_kmh": float(st_state.get("speed_kmh", 0.0)),
                "position_desc": f"Timetable service scheduled for {d_display}",
            })

    return instances
