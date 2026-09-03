import sys
import time
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, root_mean_squared_error

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.config import TRAINING_DATA_FILE
from server.features.pipeline import FEATURE_NAMES
from server.models.lightgbm_model import DelayLightGBM
from server.models.conformal_uq import ConformalCalibrator
from server.models.explainer import DelayReasonEngine

def main():
    t0 = time.time()

    if not TRAINING_DATA_FILE.exists():
        print(f"Training file {TRAINING_DATA_FILE} not found.")
        return

    df = pd.read_parquet(TRAINING_DATA_FILE)

    n = len(df)
    n_train = int(n * 0.70)
    n_val = int(n * 0.85)

    train_df = df.iloc[:n_train]
    val_df = df.iloc[n_train:n_val]
    cal_df = df.iloc[n_val:]

    X_train, y_train = train_df[FEATURE_NAMES], train_df["delay_delta_next"]
    X_val, y_val = val_df[FEATURE_NAMES], val_df["delay_delta_next"]
    X_cal, y_cal = cal_df[FEATURE_NAMES], cal_df["delay_delta_next"]

    model = DelayLightGBM()
    model.train(X_train, y_train, X_val, y_val)
    model.save()

    val_preds = model.point_model.predict(X_val)
    mae = mean_absolute_error(y_val, val_preds)
    rmse = root_mean_squared_error(y_val, val_preds)

    print(f"Validation MAE: {mae:.2f} min, RMSE: {rmse:.2f} min")

    cal_point = model.point_model.predict(X_cal)
    cal_q10 = np.minimum(model.q10_model.predict(X_cal), cal_point)
    cal_q90 = np.maximum(model.q90_model.predict(X_cal), cal_point)

    calibrator = ConformalCalibrator(coverage=0.90)
    q_hat = calibrator.calibrate(y_cal.values, cal_q10, cal_q90)
    calibrator.save()

    cal_lower = cal_q10 - q_hat
    cal_upper = cal_q90 + q_hat
    emp_coverage = np.mean((y_cal.values >= cal_lower) & (y_cal.values <= cal_upper))
    avg_width = np.mean(cal_upper - cal_lower)

    print(f"Coverage: {emp_coverage*100:.1f}%, Interval width: {avg_width:.1f} min")

    elapsed = time.time() - t0
    print(f"Training and calibration completed in {elapsed:.2f}s.")

if __name__ == "__main__":
    main()
