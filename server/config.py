import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
RAW_DATA_DIR = DATA_DIR / "raw"
PROCESSED_DATA_DIR = DATA_DIR / "processed"
MODELS_DIR = BASE_DIR / "server" / "models" / "trained"
DB_PATH = DATA_DIR / "sih_train.db"

RAW_SCHEDULES_FILE = RAW_DATA_DIR / "schedules.json"
RAW_STATIONS_FILE = RAW_DATA_DIR / "stations.json"
RAW_TRAINS_FILE = RAW_DATA_DIR / "trains.json"

TRAINING_DATA_FILE = PROCESSED_DATA_DIR / "training_data.parquet"

POINT_MODEL_PATH = MODELS_DIR / "lgb_point.pkl"
Q10_MODEL_PATH = MODELS_DIR / "lgb_q10.pkl"
Q90_MODEL_PATH = MODELS_DIR / "lgb_q90.pkl"
CQR_PARAMS_PATH = MODELS_DIR / "cqr_params.json"

DATAMEET_SCHEDULES_URL = "https://raw.githubusercontent.com/datameet/railways/master/schedules.json"
DATAMEET_STATIONS_URL = "https://raw.githubusercontent.com/datameet/railways/master/stations.json"
DATAMEET_TRAINS_URL = "https://raw.githubusercontent.com/datameet/railways/master/trains.json"

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"

def get_train_priority(train_no: str, train_name: str = "") -> int:
    name_upper = train_name.upper()
    if any(k in name_upper for k in ["VANDE BHARAT", "RAJDHANI", "SHATABDI", "TEJAS", "DURONTO"]):
        return 1
    if any(k in name_upper for k in ["SAMPARK KRANTI", "HUMSAFAR", "SUPERFAST", "SF"]):
        return 2
    if any(k in name_upper for k in ["GARIB RATH", "JAN SHATABDI"]):
        return 4
    if any(k in name_upper for k in ["PASSENGER", "MEMU", "DEMU", "LOCAL"]):
        return 5
    if any(k in name_upper for k in ["GOODS", "FREIGHT"]):
        return 6
    t_num = str(train_no).strip()
    if t_num.startswith("22") or t_num.startswith("12"):
        return 2
    return 3

DEFAULT_MPS_KMH = 110.0
FOG_SEVERE_THRESHOLD_M = 200.0
FOG_MODERATE_THRESHOLD_M = 500.0
RAIN_HEAVY_THRESHOLD_MM = 15.0
