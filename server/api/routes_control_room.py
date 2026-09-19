"""
NavaRail Control Room Jurisdiction API
Mumbai Division, Western Railway & Northern Corridor Handshake

Hierarchy:
  Railway Board (Central Level)
    > Western Railway Zonal HQ (Churchgate, Mumbai)
        > Mumbai Division Divisional Control Office (MMCT-CTC)
            > Chief Controller (ChC)
            > Dy. Chief Controller (Dy.ChC)
            > Section Controllers:
                - WR-S1 (MMCT-BRC, 0-310 km)  : DESK-01 (S. Kumar)
                - WR-S2 (BRC-RTM, 310-440 km) : DESK-02 (P. Nair)
                - WR-S3 (RTM-KOTA, 440-620 km): DESK-03 (A. Desai)
                - NR-S4 (KOTA-NDLS, 620-1400km): DESK-04 (R. Verma - Liaison NR)
            > Traction Power Controller (TPC)
            > Traction Loco Controller (TLC)
            > Carriage & Wagon Controller (C&W)
"""

import datetime
from typing import Optional, List
import pytz
from fastapi import APIRouter, Query
from server.api.routes_eta import get_or_create_simulator

router = APIRouter(prefix="/api", tags=["Control Room"])

IST = pytz.timezone("Asia/Kolkata")

# ---- Section Definitions -----------------------------------------------------
SECTIONS = [
    {
        "section_id": "WR-S1",
        "section_name": "MMCT-BRC Suburban & Main Corridor",
        "zone": "Western Railway (WR)",
        "division": "Mumbai Division",
        "from_station": "MMCT",
        "to_station":   "BRC",
        "km_range":     "0-310 km",
        "description":  "Mumbai Central -> Borivali -> Surat -> Vadodara",
        "station_codes": [
            "MMCT", "BDTS", "BCT", "BVI", "BSR", "VR", "PLG", "DRD",
            "VAPI", "BL", "NVS", "ST", "AKV", "BH", "MYG", "BRC",
            "ANND", "ND", "MHD", "MAN", "ADI", "SBT", "GNC", "MABP", "VAS"
        ],
        "controller": {
            "desk":  "DESK-01",
            "role":  "Section Controller",
            "name":  "S. Kumar",
            "badge": "SCR/WR/MMCT-BRC"
        }
    },
    {
        "section_id": "WR-S2",
        "section_name": "BRC-RTM Ghat Section",
        "zone": "Western Railway (WR)",
        "division": "Mumbai Division / Vadodara-Ratlam",
        "from_station": "BRC",
        "to_station":   "RTM",
        "km_range":     "310-440 km",
        "description":  "Vadodara -> Godhra -> Dahod -> Ratlam (mountain ghat section)",
        "station_codes": [
            "CPN", "DRL", "GDA", "CCL", "PVI", "LMH", "DHD", "BIO",
            "MGN", "THDR", "PCN", "BMI", "RTM"
        ],
        "controller": {
            "desk":  "DESK-02",
            "role":  "Section Controller",
            "name":  "P. Nair",
            "badge": "SCR/WR/BRC-RTM"
        }
    },
    {
        "section_id": "WR-S3",
        "section_name": "RTM-KOTA Plateau Corridor",
        "zone": "Western Railway (WR)",
        "division": "Ratlam / Kota Division boundary",
        "from_station": "RTM",
        "to_station":   "KOTA",
        "km_range":     "440-620 km",
        "description":  "Ratlam -> Nagda -> Kota (Chambal Valley crossing)",
        "station_codes": [
            "KUH", "NAD", "MEP", "SGZ", "CMW", "BWM", "GOH", "RMA",
            "MKX", "DKNT", "KOTA"
        ],
        "controller": {
            "desk":  "DESK-03",
            "role":  "Section Controller",
            "name":  "A. Desai",
            "badge": "SCR/WR/RTM-KOTA"
        }
    },
    {
        "section_id": "NR-S4",
        "section_name": "KOTA-NDLS Northern Trunk (NR Handshake)",
        "zone": "Northern Railway (NR) / West Central Railway (WCR)",
        "division": "Kota / Delhi Division Handshake",
        "from_station": "KOTA",
        "to_station":   "NDLS",
        "km_range":     "620-1400 km",
        "description":  "Kota -> Sawai Madhopur -> Mathura -> New Delhi & North Trunk",
        "station_codes": [
            "KOTA", "LKE", "IDG", "SWM", "MLZ", "NNW", "GGC", "SMVJ",
            "HAN", "FSP", "BXN", "RBS", "BTE", "MTJ", "CHJ", "KSV",
            "HDL", "PWL", "AST", "BVH", "FDB", "TKD", "OKA", "NZM",
            "NDLS", "ANVT", "GZB", "MTC", "MUT", "SKF", "MOZ", "DBD",
            "SRE", "YJUD", "JUDW", "RAA", "UMB", "KKDE", "KUN", "PNP",
            "GNU", "SMK", "BDMJ", "SNP", "HUK", "NUR", "ANDI", "DAZ",
            "LDH", "PHR", "PGW", "JRC", "JUC", "BEAS", "ASR",
            "ALJN", "TDL", "ETW", "PHD", "CNB", "ON", "LJN",
            "PRYJ", "DDU", "GAYA", "PNME", "DHN", "ASN", "HWH",
            "AGC", "GWL", "VGLJ", "BPL", "BSL", "JL", "NK", "KYN", "CSMT",
            "GMR", "BXR", "DURE", "BEA", "ARA", "DNR", "PNBE", "BKP", "MKA",
            "BJU", "SPJ", "HYT", "LSI", "DBG", "SKI", "MBI", "JYG"
        ],
        "controller": {
            "desk":  "DESK-04",
            "role":  "Section Controller (Liaison - NR handshake)",
            "name":  "R. Verma",
            "badge": "SCR/NR-HANDSHAKE/KOTA-NDLS"
        }
    },
]

# ---- Divisional Command -------------------------------------------------------
DIVISIONAL_COMMAND = {
    "division":  "Mumbai Division (WR)",
    "zone":      "Western Railway",
    "hq":        "Mumbai Central CTC (MMCT-CTC), Churchgate",
    "chief_controller": {
        "desk":  "DS-04",
        "role":  "Chief Controller (ChC)",
        "name":  "T. Bhatt",
        "badge": "ChC/WR/MMCT"
    },
    "deputy_chief_controller": {
        "desk":  "DS-03",
        "role":  "Dy. Chief Controller (Dy.ChC)",
        "name":  "M. Joshi",
        "badge": "DyChC/WR/MMCT"
    },
    "traction_power_controller": {
        "desk":  "TPC-01",
        "role":  "Traction Power Controller (TPC)",
        "name":  "H. Pillai",
        "badge": "TPC/WR/OHE-25kV"
    },
    "traction_loco_controller": {
        "desk":  "TLC-01",
        "role":  "Traction Loco Controller (TLC)",
        "name":  "B. Singh",
        "badge": "TLC/WR/LOCO-CREW"
    },
    "cw_controller": {
        "desk":  "CW-01",
        "role":  "C&W Controller",
        "name":  "S. Gupta",
        "badge": "CW/WR/RAKE-HEALTH"
    }
}

ACTIVE_TRAIN_NOS = ["12952", "12951", "12302", "22222", "12436", "20901", "12904", "12004"]

# Build station -> section mapping
_STATION_TO_SECTION = {}
for _sec in SECTIONS:
    for _code in _sec["station_codes"]:
        if _code not in _STATION_TO_SECTION:
            _STATION_TO_SECTION[_code] = _sec["section_id"]


def _resolve_train_section(current_code: str, next_code: str) -> str:
    """Determine the operational section of a train given current and next station."""
    sec = _STATION_TO_SECTION.get(current_code)
    if not sec:
        sec = _STATION_TO_SECTION.get(next_code)
    # Default fallback
    if not sec:
        sec = "NR-S4"
    return sec


def _get_sim_snapshot(tno: str):
    """Returns a live snapshot dict for train tno from the simulator."""
    try:
        sim = get_or_create_simulator(tno)
        stop_idx = min(sim.current_stop_idx, len(sim.route_stops) - 1)
        current_stop = sim.route_stops[stop_idx]
        next_stop = sim.route_stops[stop_idx + 1] if stop_idx + 1 < len(sim.route_stops) else current_stop

        current_code = current_stop.get("station_code", "--")
        next_code    = next_stop.get("station_code", "--")

        section_id = _resolve_train_section(current_code, next_code)

        delay = round(float(sim.current_delay_min or 0), 1)
        speed = round(float(sim.current_speed_kmh or 0), 1)

        return {
            "train_no":        tno,
            "train_name":      sim.train_name,
            "run_status":      sim.status,
            "speed_kmh":       speed,
            "current_station": current_code,
            "next_station":    next_code,
            "delay_min":       delay,
            "section_id":      section_id,
        }
    except Exception:
        return None


@router.get("/control-room/jurisdiction")
def get_jurisdiction_structure(
    section_id: Optional[str] = Query(None, description="Optional filter by section ID (e.g. WR-S1, WR-S2, WR-S3, NR-S4)"),
    division: Optional[str] = Query(None, description="Optional filter by division (e.g. MUMBAI, WR)")
):
    """
    Returns live train movement according to a given jurisdiction or operational section.
    
    If section_id or division is specified, returns only the sections and active trains
    operating within that territorial boundary.
    """
    now_ist = datetime.datetime.now(IST)
    hour = now_ist.hour
    shift_letter = "A" if 6 <= hour < 14 else ("B" if 14 <= hour < 22 else "C")
    shift_start  = {"A": "06:00 IST", "B": "14:00 IST", "C": "22:00 IST"}[shift_letter]

    train_assignments = {s["section_id"]: [] for s in SECTIONS}

    for tno in ACTIVE_TRAIN_NOS:
        snap = _get_sim_snapshot(tno)
        if snap is None:
            continue
        sec_id = snap.get("section_id", "NR-S4")
        if sec_id in train_assignments:
            train_assignments[sec_id].append(snap)
        else:
            train_assignments["NR-S4"].append(snap)

    # Filter sections if requested
    matched_sections = SECTIONS
    if section_id and section_id.upper() != "ALL":
        target_sid = section_id.upper()
        matched_sections = [s for s in SECTIONS if s["section_id"].upper() == target_sid]
    elif division and division.upper() in ["MUMBAI", "WR", "MUMBAI DIVISION"]:
        # Mumbai Division comprises Western Railway sections WR-S1, WR-S2, WR-S3
        matched_sections = [s for s in SECTIONS if s["section_id"].startswith("WR-")]

    sections_out = []
    total_assigned_trains = 0
    for sec in matched_sections:
        sid = sec["section_id"]
        trains_in = train_assignments.get(sid, [])
        total_assigned_trains += len(trains_in)
        sections_out.append({
            "section_id":          sec["section_id"],
            "section_name":        sec["section_name"],
            "zone":                sec["zone"],
            "division":            sec["division"],
            "from_station":        sec["from_station"],
            "to_station":          sec["to_station"],
            "km_range":            sec["km_range"],
            "description":         sec["description"],
            "controller":          sec["controller"],
            "active_train_count":  len(trains_in),
            "delayed_train_count": len([t for t in trains_in if t["delay_min"] > 5]),
            "active_trains":       trains_in,
        })

    # Active trains specifically for the requested scope
    filtered_trains = []
    for s in sections_out:
        filtered_trains.extend(s["active_trains"])

    return {
        "jurisdiction_filter": section_id or division or "ALL",
        "jurisdiction_level":  "Section Operational Desk" if section_id and section_id != "ALL" else "Divisional Control Office",
        "zone":                "Western Railway (WR)",
        "division":            "Mumbai Division",
        "hq_location":         "Mumbai Central CTC (MMCT-CTC), Churchgate, Mumbai - 400 020",
        "real_time_systems":   [
            "COA (Control Office Automation)",
            "RTIS (Real-Time Train Information System)",
            "FOIS (Freight Operations Information System)",
            "NaMOPS",
            "KAVACH SIL-4"
        ],
        "current_shift": {
            "shift":         shift_letter,
            "shift_start":   shift_start,
            "shift_officer": DIVISIONAL_COMMAND["chief_controller"]["name"],
            "timestamp_ist": now_ist.strftime("%Y-%m-%d %H:%M:%S IST")
        },
        "command":             DIVISIONAL_COMMAND,
        "sections":            sections_out,
        "active_trains":       filtered_trains,
        "total_active_trains": total_assigned_trains,
    }


@router.get("/control-room/jurisdiction/{section_id}/trains")
def get_section_live_trains(section_id: str):
    """
    Returns live trains currently occupying a specific territorial section.
    """
    result = get_jurisdiction_structure(section_id=section_id)
    if not result["sections"]:
        return {"section_id": section_id, "error": "Section not found", "trains": []}
    
    sec = result["sections"][0]
    return {
        "section_id":   sec["section_id"],
        "section_name": sec["section_name"],
        "controller":   sec["controller"],
        "train_count":  sec["active_train_count"],
        "trains":       sec["active_trains"],
    }


# ==============================================================================
# DISRUPTION & INCIDENT HUB (ALERTS ENGINE & AUDIT DISPATCH API)
# ==============================================================================

from pydantic import BaseModel

class IncidentActionRequest(BaseModel):
    action_id: str
    operator: Optional[str] = "Section Controller (Desk-01)"
    notes: Optional[str] = None

ACTIVE_INCIDENTS: List[Dict[str, Any]] = [
    {
        "id": "INC-2024-0892B",
        "severity": "CRIT",
        "severity_label": "CRITICAL",
        "category": "SIGNAL INTERLOCKING FAILURE",
        "title": "Western Corridor: Bharuch (BH) – Vadodara (BRC) Block 14B",
        "full_title": "Signal Interlocking Block 14B Fail-Safe Reversion to Danger",
        "section_id": "WR-S1",
        "min_ago": 3,
        "est_delay_min": 18.4,
        "held_count": 3,
        "tags": ["AFTC Drop", "Signal S-42", "Track Circuit"],
        "status": "ACTIVE TRIAGE",
        "status_tag": "ACTIVE TRIAGE IN PROGRESS",
        "topology": {
            "type": "block_14b",
            "start_station": "BHARUCH (BH)",
            "start_km": "KM 312",
            "end_station": "VADODARA (BRC)",
            "end_km": "KM 392",
            "block_label": "BLOCK 14B: OCCUPIED / LOCKED RED",
            "bypass_label": "Loop Track 3 (Clear & Interlocked)",
            "held_train": "#12952",
            "signal_state": "S-42 (RED)"
        },
        "root_cause": {
            "description": "Audio Frequency Track Circuit (AFTC) dropped feedback pulse at MP 348.6. Signal S-42 fail-safe auto-reverted to RED aspect.",
            "model_name": "ST-GCN Anomaly Detector",
            "confidence": 99.4,
            "classification": "Hardware Telemetry Disconnect"
        },
        "affected_trains": [
            {"train_no": "12952", "name": "Train #12952 (Tejas Rajdhani)", "priority": "P1 EXPRESS", "state": "Held Outer S-42", "delay_min": "+14m", "tag_class": "tag-cyan"},
            {"train_no": "BOXN-1102", "name": "BOXN-1102 Heavy Freight", "priority": "P3 FREIGHT", "state": "Held Loop Siding", "delay_min": "+28m", "tag_class": "tag-dim"},
            {"train_no": "12951", "name": "Train #12951 (NDLS Rajdhani)", "priority": "P1 EXPRESS", "state": "Approaching BRC", "delay_min": "+3m", "tag_class": "tag-nominal"}
        ],
        "actions": [
            {"id": "issue_caution", "label": "Issue Emergency Caution Order (CO-15km/h)", "btn_class": "danger", "icon": "warning"},
            {"id": "divert_siding", "label": "Route Divert to Track 3", "btn_class": "cyan", "icon": "alt_route"},
            {"id": "dispatch_st", "label": "Dispatch S&T Maintenance Team", "btn_class": "slate", "icon": "engineering"}
        ]
    },
    {
        "id": "INC-2024-0888W",
        "severity": "WARN",
        "severity_label": "WARNING",
        "category": "EXTENDED DWELL & HEADWAY CONFLICT",
        "title": "Surat (ST) Platform 1 – Train #22953 Gujarat Superfast",
        "full_title": "Surat Junction Platform Berth Overstay & Headway Conflict",
        "section_id": "WR-S1",
        "min_ago": 9,
        "est_delay_min": 6.2,
        "held_count": 2,
        "tags": ["Luggage Clearance", "Section WR-S1", "Headway Conflict"],
        "status": "ACTIVE TRIAGE",
        "status_tag": "HEADWAY CASCADE ACTIVE",
        "topology": {
            "type": "dwell_conflict",
            "start_station": "UDHNA JN (UDN)",
            "start_km": "KM 259",
            "end_station": "SURAT (ST)",
            "end_km": "KM 263",
            "block_label": "PF-1 BERTH: DWELL OVERRUN (+7 MIN)",
            "bypass_label": "Platform 2 Through Line (Clear)",
            "held_train": "#22953",
            "signal_state": "S-18 (YELLOW)"
        },
        "root_cause": {
            "description": "High volume brake-van parcel loading on PF-1 exceeded scheduled 5-min turnaround. Approaching Train #20901 received yellow aspect at Surat Outer Home.",
            "model_name": "TreeSHAP Dwell Predictor",
            "confidence": 94.8,
            "classification": "Platform Headway Conflict"
        },
        "affected_trains": [
            {"train_no": "22953", "name": "Train #22953 (Gujarat Superfast)", "priority": "P2 SUPERFAST", "state": "PF-1 Berth Loading", "delay_min": "+7m", "tag_class": "tag-caution"},
            {"train_no": "20901", "name": "Train #20901 (Vande Bharat Express)", "priority": "P1 EXPRESS", "state": "Surat Outer Home Signal", "delay_min": "+4m", "tag_class": "tag-cyan"},
            {"train_no": "12952", "name": "Train #12952 (Tejas Rajdhani)", "priority": "P1 EXPRESS", "state": "Passing Navsari (NVS)", "delay_min": "Nominal", "tag_class": "tag-nominal"}
        ],
        "actions": [
            {"id": "authorize_starter", "label": "Authorize Starter Signal Cleared", "btn_class": "danger", "icon": "check_circle"},
            {"id": "reroute_pf2", "label": "Reroute Trailing Train to Platform 2", "btn_class": "cyan", "icon": "alt_route"},
            {"id": "notify_sm", "label": "Alert Surat Station Master Desk", "btn_class": "slate", "icon": "support_agent"}
        ]
    },
    {
        "id": "INC-2024-0879W",
        "severity": "WARN",
        "severity_label": "WARNING",
        "category": "DEAD-RECKONING FALLBACK",
        "title": "Godhra – Dahod Ghat Section – Train #12952 Tejas Rajdhani",
        "full_title": "Ratlam Ghat Section: Cellular Outage & EKF Dead-Reckoning Active",
        "section_id": "WR-S2",
        "min_ago": 15,
        "est_delay_min": 2.1,
        "held_count": 1,
        "tags": ["LTE-R Outage", "EKF Active", "Kavach Local Sync"],
        "status": "ACTIVE TRIAGE",
        "status_tag": "EKF EDGE TRACKING ENGAGED",
        "topology": {
            "type": "ekf_tunnel",
            "start_station": "GODHRA (GDA)",
            "start_km": "KM 468",
            "end_station": "DAHOD (DHD)",
            "end_km": "KM 541",
            "block_label": "GHAT CUTTING MP 492: BLIND ZONE",
            "bypass_label": "Kavach Trackside Balise Array Active",
            "held_train": "#12952",
            "signal_state": "S-34 (GREEN)"
        },
        "root_cause": {
            "description": "Terrain shielding in deep rock cutting caused 100% cellular carrier attenuation. Loco Edge Computer switched seamlessly to Extended Kalman Filter (EKF) with wheel odometry and RFID balises.",
            "model_name": "Edge-EKF Sensor Fusion",
            "confidence": 98.2,
            "classification": "RF Shadowing / Edge Ring-Buffer 84 Pkts"
        },
        "affected_trains": [
            {"train_no": "12952", "name": "Train #12952 (Tejas Rajdhani)", "priority": "P1 EXPRESS", "state": "MP 492 (EKF Tracking)", "delay_min": "+2m", "tag_class": "tag-cyan"},
            {"train_no": "12904", "name": "Train #12904 (Golden Temple Mail)", "priority": "P1 MAIL", "state": "Approaching Ghat Section", "delay_min": "+8m", "tag_class": "tag-caution"}
        ],
        "actions": [
            {"id": "ack_ekf", "label": "Acknowledge EKF Telemetry Fallback", "btn_class": "cyan", "icon": "sensors"},
            {"id": "ping_tower", "label": "Ping Trackside Kavach Mast T-14", "btn_class": "slate", "icon": "cell_tower"},
            {"id": "dump_ringbuf", "label": "Dump Edge Ring-Buffer to CTC", "btn_class": "slate", "icon": "file_download"}
        ]
    },
    {
        "id": "INC-2024-0899C",
        "severity": "CRIT",
        "severity_label": "CRITICAL",
        "category": "FOG VISIBILITY PRECAUTION",
        "title": "Mathura (MTJ) – Palwal (PWL) Automatic Block Signaling",
        "full_title": "Dense Fog Low-Visibility (<120m) – Dynamic Headway Safety Throttling",
        "section_id": "NR-S4",
        "min_ago": 2,
        "est_delay_min": 24.0,
        "held_count": 4,
        "tags": ["Dense Fog", "Headway +5m", "FSD Active"],
        "status": "ACTIVE TRIAGE",
        "status_tag": "AUTOMATIC SPEED RESTRICTION",
        "topology": {
            "type": "fog_abs",
            "start_station": "MATHURA (MTJ)",
            "start_km": "KM 1340",
            "end_station": "PALWAL (PWL)",
            "end_km": "KM 1380",
            "block_label": "ABS BLOCK 08-12: RESTRICTED 60 KM/H",
            "bypass_label": "Dynamic Headway Expanded to 9 Min",
            "held_train": "#12904",
            "signal_state": "S-08 (DOUBLE YELLOW)"
        },
        "root_cause": {
            "description": "Optical rail-head transmissometer recorded RVR < 120m. AI Conformal Delay Engine expanded spatial headway from 4 min to 9 min to prevent SPAD (Signal Passed at Danger).",
            "model_name": "Conformal CQR & Vision Sensor",
            "confidence": 98.7,
            "classification": "Radiation Fog Visibility Threshold"
        },
        "affected_trains": [
            {"train_no": "12904", "name": "Train #12904 (Golden Temple Mail)", "priority": "P1 MAIL", "state": "Mathura North ABS", "delay_min": "+8m", "tag_class": "tag-danger"},
            {"train_no": "12951", "name": "Train #12951 (NDLS Rajdhani)", "priority": "P1 EXPRESS", "state": "Departed Palwal", "delay_min": "+5m", "tag_class": "tag-caution"},
            {"train_no": "12302", "name": "Train #12302 (Kolkata Rajdhani)", "priority": "P1 EXPRESS", "state": "Outer Mathura Jn", "delay_min": "+18m", "tag_class": "tag-danger"}
        ],
        "actions": [
            {"id": "broadcast_fog", "label": "Broadcast Fog Safety Advisory (FSD Active)", "btn_class": "danger", "icon": "campaign"},
            {"id": "enforce_headway", "label": "Enforce 9-Minute Spatial Spacing", "btn_class": "cyan", "icon": "speed"},
            {"id": "dispatch_fogmen", "label": "Deploy Fog Signalmen with Detonators", "btn_class": "slate", "icon": "emergency"}
        ]
    },
    {
        "id": "INC-2024-0865I",
        "severity": "INFO",
        "severity_label": "INFO",
        "category": "OHE VOLTAGE SAG (NEUTRAL)",
        "title": "Anand – Vadodara Substation TSS-03 Neutral Zone",
        "full_title": "Traction Substation TSS-03 Neutral Section Voltage Transient",
        "section_id": "WR-S1",
        "min_ago": 26,
        "est_delay_min": 0.0,
        "held_count": 0,
        "tags": ["Traction Power", "SCADA 50Hz", "Substation 03"],
        "status": "RESOLVED",
        "status_tag": "VOLTAGE NORMALIZED (24.8 kV)",
        "topology": {
            "type": "ohe_sag",
            "start_station": "ANAND (ANND)",
            "start_km": "KM 428",
            "end_station": "VADODARA (BRC)",
            "end_km": "KM 392",
            "block_label": "TSS-03 FEED: NOMINAL 25.1 kV AC",
            "bypass_label": "Capacitor Bank Stepped in 40ms",
            "held_train": "NONE",
            "signal_state": "S-22 (GREEN)"
        },
        "root_cause": {
            "description": "Transient voltage dip to 21.2 kV during twin WAP-7 simultaneous acceleration through neutral section. Capacitor bank auto-stepped in 40ms. Traction cleared.",
            "model_name": "SCADA 50Hz Fast Fourier Telemetry",
            "confidence": 99.9,
            "classification": "Transient Sag Self-Cleared"
        },
        "affected_trains": [
            {"train_no": "12951", "name": "Train #12951 (NDLS Rajdhani)", "priority": "P1 EXPRESS", "state": "Passing Anand Jn", "delay_min": "Nominal", "tag_class": "tag-nominal"},
            {"train_no": "20901", "name": "Train #20901 (Vande Bharat Express)", "priority": "P1 EXPRESS", "state": "Vadodara Approach", "delay_min": "Nominal", "tag_class": "tag-nominal"}
        ],
        "actions": [
            {"id": "verify_scada", "label": "Verify SCADA Capacitor Step-4 Nominal", "btn_class": "cyan", "icon": "bolt"},
            {"id": "log_tpc", "label": "Log Clearance to TPC Controller Desk", "btn_class": "slate", "icon": "fact_check"}
        ]
    }
]

# Chronological Audit Trail Log
AUDIT_LOG_EVENTS: List[Dict[str, Any]] = []

def ensure_audit_log_init(now_ist: datetime.datetime):
    global AUDIT_LOG_EVENTS
    if not AUDIT_LOG_EVENTS:
        t1 = (now_ist - datetime.timedelta(minutes=1, seconds=20)).strftime("%H:%M:%S IST")
        t2 = (now_ist - datetime.timedelta(minutes=2, seconds=15)).strftime("%H:%M:%S IST")
        t3 = (now_ist - datetime.timedelta(minutes=3, seconds=10)).strftime("%H:%M:%S IST")
        t4 = (now_ist - datetime.timedelta(minutes=7, seconds=30)).strftime("%H:%M:%S IST")
        AUDIT_LOG_EVENTS = [
            {
                "time": t1,
                "dot_class": "bg-cyan",
                "time_class": "text-cyan",
                "desc": "S&T Vadodara Depot notified by Controller Desk (Auto-Ack logged via RailNet COA)"
            },
            {
                "time": t2,
                "dot_class": "bg-caution",
                "time_class": "text-caution",
                "desc": "Auto-caution packet transmitted to #12952 Cab (Kavach TCAS Wireless Handshake)"
            },
            {
                "time": t3,
                "dot_class": "bg-danger",
                "time_class": "text-danger",
                "desc": "Telemetry alert generated by ST-GCN: Audio Frequency Track Circuit pulse dropped at MP 348.6"
            },
            {
                "time": t4,
                "dot_class": "bg-dim",
                "time_class": "text-dim",
                "desc": "Routine interlocking poll nominal across Mumbai Division (50Hz heartbeat pulse nominal)"
            }
        ]

@router.get("/control-room/alerts")
def get_control_room_alerts(section_id: Optional[str] = None):
    """
    Returns live corridor disruption stream, active incidents, telemetry diagnostics,
    affected trains queue, and audit trail log.
    """
    now_ist = datetime.datetime.now(IST)
    ensure_audit_log_init(now_ist)

    # Format incident times dynamically relative to current clock
    formatted_incidents = []
    crit_count = 0
    warn_count = 0
    info_count = 0

    for inc in ACTIVE_INCIDENTS:
        inc_copy = dict(inc)
        inc_time = now_ist - datetime.timedelta(minutes=inc["min_ago"])
        inc_copy["timestamp_ist"] = inc_time.strftime("%H:%M:%S IST")
        inc_copy["time_ago_str"] = f"{inc['min_ago']}m ago"
        
        sev = inc.get("severity", "").upper()
        if sev == "CRIT":
            crit_count += 1
        elif sev == "WARN":
            warn_count += 1
        elif sev == "INFO":
            info_count += 1

        if section_id and section_id != "ALL" and inc.get("section_id") != section_id:
            continue
        formatted_incidents.append(inc_copy)

    # Shift calculation
    hour = now_ist.hour
    if 6 <= hour < 14:
        shift = "Shift A"
        shift_start = "06:00:00 IST"
    elif 14 <= hour < 22:
        shift = "Shift B"
        shift_start = "14:00:00 IST"
    else:
        shift = "Shift C"
        shift_start = "22:00:00 IST"

    return {
        "timestamp": now_ist.strftime("%Y-%m-%d %H:%M:%S IST"),
        "counts": {
            "total": len(ACTIVE_INCIDENTS),
            "crit": crit_count,
            "warn": warn_count,
            "info": info_count
        },
        "incidents": formatted_incidents,
        "audit_log": AUDIT_LOG_EVENTS,
        "escalation": {
            "level": "LEVEL 1: ACTIVE",
            "handler": "Section Controller (Desk-01)",
            "escalate_to": "Sr. DOM (Senior Divisional Operations Manager)",
            "remaining_seconds": 348
        },
        "custody": {
            "chief_controller": "T. Bhatt (ChC/WR/MMCT)",
            "desk": "Chief Controller DS-04 (Mumbai Central CTC)",
            "shift": shift,
            "shift_start": shift_start
        }
    }


@router.post("/control-room/alerts/{incident_id}/action")
def execute_incident_action(incident_id: str, req: IncidentActionRequest):
    """
    Executes a tactical operator action for an incident, logs to the audit trail,
    and updates incident triage status.
    """
    now_ist = datetime.datetime.now(IST)
    ensure_audit_log_init(now_ist)
    now_str = now_ist.strftime("%H:%M:%S IST")

    target_inc = None
    for inc in ACTIVE_INCIDENTS:
        if inc["id"] == incident_id:
            target_inc = inc
            break

    if not target_inc:
        return {"success": False, "error": f"Incident {incident_id} not found"}

    action_label = req.action_id
    new_event_desc = ""
    dot_color = "bg-cyan"
    time_color = "text-cyan"

    if req.action_id == "issue_caution":
        target_inc["status"] = "MITIGATED"
        target_inc["status_tag"] = "CAUTION ORDER (CO-15) ACTIVE"
        new_event_desc = f"Emergency Caution Order CO-15 km/h transmitted by {req.operator} to #12952 cab via Kavach TCAS."
        dot_color = "bg-danger"
        time_color = "text-danger"
    elif req.action_id == "divert_siding":
        target_inc["status"] = "MITIGATED"
        target_inc["status_tag"] = "REROUTED VIA LOOP TRACK 3"
        new_event_desc = f"Tactical diversion executed by {req.operator}: Point Machine PM-42 reversed. Train #12952 cleared to Loop Track 3."
        dot_color = "bg-cyan"
        time_color = "text-cyan"
    elif req.action_id == "dispatch_st":
        target_inc["status"] = "RESOLVED"
        target_inc["status_tag"] = "S&T TEAM DISPATCHED (ETA 18m)"
        new_event_desc = f"Emergency S&T Vadodara Van #02 dispatched to MP 348.6 by {req.operator}. Est. On-Site Triage: 18m."
        dot_color = "bg-caution"
        time_color = "text-caution"
    elif req.action_id == "authorize_starter":
        target_inc["status"] = "RESOLVED"
        target_inc["status_tag"] = "STARTER SIGNAL CLEARED"
        new_event_desc = f"Surat Starter Signal S-18 authorized by {req.operator}. #22953 departure cleared."
        dot_color = "bg-nominal"
        time_color = "text-nominal"
    elif req.action_id == "reroute_pf2":
        target_inc["status"] = "MITIGATED"
        target_inc["status_tag"] = "PF-2 THROUGH DIVERSION"
        new_event_desc = f"Trailing Train #20901 rerouted to Platform 2 Through Line around berth bottleneck."
        dot_color = "bg-cyan"
        time_color = "text-cyan"
    elif req.action_id == "ack_ekf":
        target_inc["status"] = "MITIGATED"
        target_inc["status_tag"] = "EKF TELEMETRY ACKNOWLEDGED"
        new_event_desc = f"Ghat Blind Zone EKF telemetry acknowledged by {req.operator}. Edge covariance P < 0.08m verified."
        dot_color = "bg-cyan"
        time_color = "text-cyan"
    elif req.action_id == "broadcast_fog":
        target_inc["status"] = "MITIGATED"
        target_inc["status_tag"] = "FOG SAFETY BULLETIN BROADCAST"
        new_event_desc = f"Fog Safety Advisory broadcast to all locos in MTJ-PWL section. FSD units engaged."
        dot_color = "bg-danger"
        time_color = "text-danger"
    else:
        target_inc["status"] = "RESOLVED"
        target_inc["status_tag"] = "OPERATOR ACKNOWLEDGED"
        new_event_desc = f"Action '{req.action_id}' executed by {req.operator} on {incident_id}."
        dot_color = "bg-cyan"
        time_color = "text-cyan"

    # Prepend to chronological audit trail
    new_event = {
        "time": now_str,
        "dot_class": dot_color,
        "time_class": time_color,
        "desc": new_event_desc
    }
    AUDIT_LOG_EVENTS.insert(0, new_event)

    return {
        "success": True,
        "action_id": req.action_id,
        "incident": target_inc,
        "new_event": new_event,
        "all_events": AUDIT_LOG_EVENTS
    }
