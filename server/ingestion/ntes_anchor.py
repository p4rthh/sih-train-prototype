import datetime
import time
from typing import Dict, Any, Optional
from ntes import NTESClient

NTES_CACHE: Dict[str, Dict[str, Any]] = {}
NTES_CACHE_TIMESTAMP: Dict[str, float] = {}
CACHE_TTL_SECONDS = 60.0

ntes_client = NTESClient()

def get_live_ntes_anchor(train_no: str) -> Optional[Dict[str, Any]]:
    t_no = str(train_no).strip()
    now_ts = time.time()

    if t_no in NTES_CACHE and (now_ts - NTES_CACHE_TIMESTAMP.get(t_no, 0)) < CACHE_TTL_SECONDS:
        return NTES_CACHE[t_no]

    try:
        today = datetime.date.today().strftime("%d-%b-%Y")
        res = ntes_client.live_status(t_no, today)
        
        if not res or not isinstance(res, dict):
            return None

        last_stn = res.get("LSTN")
        if not last_stn:
            yesterday = (datetime.date.today() - datetime.timedelta(days=1)).strftime("%d-%b-%Y")
            res_yest = ntes_client.live_status(t_no, yesterday)
            if res_yest and isinstance(res_yest, dict) and res_yest.get("LSTN"):
                res = res_yest
                last_stn = res.get("LSTN")

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
            "last_station_code": str(last_stn).strip().upper(),
            "last_station_name": res.get("LSTNN", ""),
            "next_station_code": str(res.get("NPSTN") or res.get("NSTN") or "").strip().upper(),
            "next_station_name": res.get("NPSTNN") or res.get("NSTNN") or "",
            "current_delay_min": delay_min,
            "position_desc": res.get("CPOS") or res.get("LUPDFULL") or "",
            "is_arrived_dest": res.get("isArrDSTN", False),
            "source_code": res.get("SRC"),
            "dest_code": res.get("DSTN"),
            "fetch_timestamp": now_ts
        }

        NTES_CACHE[t_no] = anchor_data
        NTES_CACHE_TIMESTAMP[t_no] = now_ts
        return anchor_data

    except Exception as e:
        return None
