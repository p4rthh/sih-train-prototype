import os
import sys
import time
from pathlib import Path
import pandas as pd
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.config import TRAINING_DATA_FILE
from server.database import get_db_connection
from server.features.pipeline import FEATURE_NAMES
from server.scripts.03_train_model import main as train_lightgbm
from server.scripts.04_train_stgcn import train_stgcn

def retrain_pipeline():
    t0 = time.time()
    print("Starting weekly automated retraining pipeline...")

    # Check for real delay observations in SQLite
    conn = get_db_connection()
    c = conn.cursor()
    try:
        c.execute("SELECT COUNT(*) FROM delay_observations")
        obs_count = c.fetchone()[0]
    except Exception:
        obs_count = 0
    conn.close()

    print(f"Found {obs_count} real-world delay observations in database.")

    # Retrain Model A (LightGBM) and calibrate CQR
    print("\n--- Step 1: Retraining LightGBM & Calibrating CQR ---")
    train_lightgbm()

    # Retrain Model B (RailwaySTGCNv2) and fit Stacking Ensemble on OOF predictions
    print("\n--- Step 2: Retraining ST-GCN & Fitting Stacking Ensemble ---")
    train_stgcn()

    elapsed = time.time() - t0
    print(f"\nWeekly retraining pipeline successfully executed in {elapsed:.2f}s.")

if __name__ == "__main__":
    retrain_pipeline()
