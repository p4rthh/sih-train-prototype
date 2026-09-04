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
                res = res_yest
                last_stn = str(res.get("LSTN") or "").strip().upper()
                cpos = str(res.get("CPOS") or "").strip()

        if not last_stn:
            return None

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

    except Exception:
        return None
