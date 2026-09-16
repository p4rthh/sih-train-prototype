import sys
import time
from pathlib import Path
import pandas as pd
import numpy as np
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from sklearn.model_selection import GroupKFold

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from server.config import TRAINING_DATA_FILE
from server.features.pipeline import FEATURE_NAMES
from server.models.lightgbm_model import DelayLightGBM
from server.models.conformal_uq import ConformalCalibrator

def main():
    t0 = time.time()

    if not TRAINING_DATA_FILE.exists():
        print(f"Training file {TRAINING_DATA_FILE} not found.")
        return

    df = pd.read_parquet(TRAINING_DATA_FILE)
    print(f"Loaded training data: shape={df.shape}")

    # Generate grouped folds by train_number_hash to eliminate train-trip data leakage
    groups = df["train_number_hash"].values if "train_number_hash" in df.columns else np.arange(len(df)) % 5
    gkf = GroupKFold(n_splits=5)

    oof_preds = np.zeros(len(df), dtype=np.float32)
    X_all = df[FEATURE_NAMES]
    y_all = df["delay_delta_next"]

    fold_maes = []
    print("Running 5-Fold Grouped Cross-Validation...")
    for fold, (train_idx, val_idx) in enumerate(gkf.split(X_all, y_all, groups=groups)):
        X_tr, y_tr = X_all.iloc[train_idx], y_all.iloc[train_idx]
        X_v, y_v = X_all.iloc[val_idx], y_all.iloc[val_idx]

        fold_model = DelayLightGBM()
        fold_model.train(X_tr, y_tr, X_v, y_v)
        val_p = fold_model.point_model.predict(X_v[FEATURE_NAMES])
        oof_preds[val_idx] = val_p
        f_mae = mean_absolute_error(y_v, val_p)
        fold_maes.append(f_mae)
        print(f"Fold {fold + 1} MAE: {f_mae:.2f} min")

    mean_oof_mae = np.mean(fold_maes)
    print(f"5-Fold OOF MAE: {mean_oof_mae:.2f} min (RMSE: {root_mean_squared_error(y_all, oof_preds):.2f} min)")

    # Save OOF predictions for clean stacking ensemble meta-learning
    oof_df = pd.DataFrame({
        "oof_pred_lgb": oof_preds,
        "y_true": y_all.values,
        "train_priority": df["train_priority"].values,
        "is_overnight": df["is_overnight_recovery_window"].values,
        "current_delay_min": df["current_delay_min"].values,
        "trip_progress_ratio": df["trip_progress_ratio"].values
    })
    oof_path = TRAINING_DATA_FILE.parent / "oof_predictions.parquet"
    oof_df.to_parquet(oof_path, index=False)

    # Train final production model on 80/20 train/val split
    n = len(df)
    n_train = int(n * 0.75)
    n_val = int(n * 0.88)

    train_df = df.iloc[:n_train]
    val_df = df.iloc[n_train:n_val]
    cal_df = df.iloc[n_val:]

    X_train, y_train = train_df[FEATURE_NAMES], train_df["delay_delta_next"]
    X_val, y_val = val_df[FEATURE_NAMES], val_df["delay_delta_next"]
    X_cal, y_cal = cal_df[FEATURE_NAMES], cal_df["delay_delta_next"]

    final_model = DelayLightGBM()
    final_model.train(X_train, y_train, X_val, y_val)
    final_model.save()
    print("Final DelayLightGBM model fitted and saved.")

    # Conformal Calibration with stratified conditional CQR
    cal_point, cal_q10, cal_q90 = final_model.predict_batch(X_cal)

    calibrator = ConformalCalibrator(coverage=0.90)
    q_hat = calibrator.calibrate(
        y_cal.values,
        cal_q10,
        cal_q90,
        priorities=cal_df["train_priority"].values,
        progress_ratios=cal_df["trip_progress_ratio"].values
    )
    calibrator.save()

    # Calculate empirical coverage
    lowers, uppers = [], []
    for i in range(len(y_cal)):
        p = int(cal_df["train_priority"].iloc[i])
        pr = float(cal_df["trip_progress_ratio"].iloc[i])
        l, u = calibrator.predict_interval(cal_q10[i], cal_q90[i], priority=p, progress=pr)
        lowers.append(l)
        uppers.append(u)

    lowers_arr = np.array(lowers)
    uppers_arr = np.array(uppers)
    emp_cov = np.mean((y_cal.values >= lowers_arr) & (y_cal.values <= uppers_arr))
    avg_w = np.mean(uppers_arr - lowers_arr)

    print(f"CQR Calibrated: q_hat={q_hat:.2f}, Empirical 90% Coverage={emp_cov * 100:.1f}%, Avg Interval Width={avg_w:.1f} min")
    elapsed = time.time() - t0
    print(f"Phase 3 LightGBM & CQR training complete in {elapsed:.2f}s.")

if __name__ == "__main__":
    main()
