import datetime
import time
from typing import Dict, Any, Optional
from ntes import NTESClient

NTES_CACHE: Dict[str, Dict[str, Any]] = {}
NTES_CACHE_TIMESTAMP: Dict[str, float] = {}
CACHE_TTL_SECONDS = 60.0

ntes_client = NTESClient()

def get_live_ntes_anchor(train_no: str) -> Optional[Dict[str, Any]]:
    raw_no = str(train_no).strip()
    from server.database import TRAIN_ALIASES
    t_no = TRAIN_ALIASES.get(raw_no, raw_no)
    now_ts = time.time()

    if t_no in NTES_CACHE and (now_ts - NTES_CACHE_TIMESTAMP.get(t_no, 0)) < CACHE_TTL_SECONDS:
        cached = dict(NTES_CACHE[t_no])
        cached["train_no"] = raw_no
        return cached

    try:
        today = datetime.date.today().strftime("%d-%b-%Y")
        res = ntes_client.live_status(t_no, today)
        
        if not res or not isinstance(res, dict):
            # Check yesterday for multi-day long distance runs
            yesterday = (datetime.date.today() - datetime.timedelta(days=1)).strftime("%d-%b-%Y")
            res_yest = ntes_client.live_status(t_no, yesterday)
            if res_yest and isinstance(res_yest, dict):
                res = res_yest
            else:
                return None

        cpos = str(res.get("CPOS") or "").strip()
        cpos_lower = cpos.lower()
        trunst = res.get("TRUNST")
        is_arr_dstn = bool(res.get("isArrDSTN", False))

        src_code = str(res.get("SRC") or "").strip().upper()
        dstn_code = str(res.get("DSTN") or "").strip().upper()
        last_stn = str(res.get("LSTN") or "").strip().upper()

        # Case 1: Train has NOT started yet in the real world
        if trunst == 0 or "yet to start" in cpos_lower:
            anchor_data = {
                "train_no": t_no,
                "train_name": res.get("TNM", ""),
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
            NTES_CACHE[t_no] = dict(anchor_data)
            NTES_CACHE_TIMESTAMP[t_no] = now_ts
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
            NTES_CACHE[t_no] = dict(anchor_data)
            NTES_CACHE_TIMESTAMP[t_no] = now_ts
            anchor_data["train_no"] = raw_no
            return anchor_data

        # Case 3: Train is actively running on tracks
        if not last_stn and not is_arr_dstn:
            # Check yesterday for multi-day runs
            yesterday = (datetime.date.today() - datetime.timedelta(days=1)).strftime("%d-%b-%Y")
            res_yest = ntes_client.live_status(t_no, yesterday)
            if res_yest and isinstance(res_yest, dict) and res_yest.get("LSTN"):
                y_trunst = res_yest.get("TRUNST")
                y_cpos = str(res_yest.get("CPOS") or "").lower()
                if y_trunst == 1 or "departed from" in y_cpos:
                    res = res_yest
                    last_stn = str(res.get("LSTN") or "").strip().upper()
                    cpos = str(res.get("CPOS") or "").strip()
                    src_code = str(res.get("SRC") or "").strip().upper()
                    dstn_code = str(res.get("DSTN") or "").strip().upper()

        if last_stn and (trunst == 1 or "departed from" in cpos_lower or (res and res.get("TRUNST") == 1)):
            delay_val = res.get("LDEL")
            try:
                delay_min = float(delay_val) if delay_val is not None else 0.0
            except (ValueError, TypeError):
                delay_min = 0.0

            anchor_data = {
                "train_no": t_no,
                "train_name": res.get("TNM", ""),
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

            NTES_CACHE[t_no] = dict(anchor_data)
            NTES_CACHE_TIMESTAMP[t_no] = now_ts
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
                NTES_CACHE[t_no] = dict(anchor_data)
                NTES_CACHE_TIMESTAMP[t_no] = now_ts
                anchor_data["train_no"] = raw_no
                return anchor_data

            days_of_run = str(sched.get("DaysOfRun") or "Daily").strip()
            v_dates = sched.get("vStartDateList") or []
            tz_ist = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
            today_dt = datetime.datetime.now(tz_ist).date()
            today_str = today_dt.strftime("%d-%b-%Y")
            today_weekday = today_dt.strftime("%a").lower()
            runs_on_weekday = ("daily" in days_of_run.lower()) or (today_weekday in days_of_run.lower())
            runs_today = (today_str in v_dates) if v_dates else runs_on_weekday

            if not runs_today:
                next_date = sched.get("startDate") or (v_dates[0] if v_dates else "Next scheduled date")
                anchor_data = {
                    "train_no": t_no,
                    "train_name": t_name,
                    "run_status": "NOT_RUNNING_TODAY",
                    "last_station_code": src_c,
                    "last_station_name": src_n,
                    "next_station_code": dst_c,
                    "next_station_name": dst_n,
                    "current_delay_min": 0.0,
                    "position_desc": f"Not scheduled to run today (Operates: {days_of_run}, Next service: {next_date})",
                    "is_arrived_dest": False,
                    "source_code": src_c,
                    "dest_code": dst_c,
                    "fetch_timestamp": now_ts
                }
                NTES_CACHE[t_no] = dict(anchor_data)
                NTES_CACHE_TIMESTAMP[t_no] = now_ts
                anchor_data["train_no"] = raw_no
                return anchor_data

            anchor_data = {
                "train_no": t_no,
                "train_name": t_name,
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
            NTES_CACHE[t_no] = dict(anchor_data)
            NTES_CACHE_TIMESTAMP[t_no] = now_ts
            anchor_data["train_no"] = raw_no
            return anchor_data

        return None

    except Exception:
        return None
