import os
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from typing import Dict, Optional, Any, Tuple
from server.config import POINT_MODEL_PATH, Q10_MODEL_PATH, Q90_MODEL_PATH
from server.features.pipeline import FEATURE_NAMES

class DelayLightGBM:
    def __init__(self):
        self.point_model: Optional[lgb.LGBMRegressor] = None
        self.q10_model: Optional[lgb.LGBMRegressor] = None
        self.q90_model: Optional[lgb.LGBMRegressor] = None
        self.is_fitted: bool = False

    def train(
        self,
        X_train: pd.DataFrame,
        y_train: pd.Series,
        X_val: pd.DataFrame,
        y_val: pd.Series,
        sample_weight: Optional[np.ndarray] = None
    ):
        base_params = {
            "n_estimators": 800,
            "learning_rate": 0.03,
            "num_leaves": 63,
            "max_depth": 8,
            "min_child_samples": 25,
            "feature_fraction": 0.80,
            "bagging_fraction": 0.75,
            "bagging_freq": 3,
            "reg_alpha": 0.1,
            "reg_lambda": 1.0,
            "random_state": 42,
            "verbose": -1,
            "n_jobs": -1
        }

        # Weight samples with active delays more heavily to avoid bias towards zero
        if sample_weight is None:
            weights = np.ones(len(y_train), dtype=np.float32)
            y_arr = y_train.values
            weights[np.abs(y_arr) > 2.0] = 1.75
            weights[np.abs(y_arr) > 6.0] = 2.5
        else:
            weights = sample_weight

        # Point predictor with L1 loss
        self.point_model = lgb.LGBMRegressor(**base_params, objective="regression_l1")
        self.point_model.fit(
            X_train[FEATURE_NAMES],
            y_train,
            sample_weight=weights,
            eval_set=[(X_val[FEATURE_NAMES], y_val)],
            callbacks=[lgb.early_stopping(stopping_rounds=40, verbose=False)]
        )

        # 10th percentile quantile regressor
        self.q10_model = lgb.LGBMRegressor(**base_params, objective="quantile", alpha=0.10)
        self.q10_model.fit(
            X_train[FEATURE_NAMES],
            y_train,
            eval_set=[(X_val[FEATURE_NAMES], y_val)],
            callbacks=[lgb.early_stopping(stopping_rounds=40, verbose=False)]
        )

        # 90th percentile quantile regressor
        self.q90_model = lgb.LGBMRegressor(**base_params, objective="quantile", alpha=0.90)
        self.q90_model.fit(
            X_train[FEATURE_NAMES],
            y_train,
            eval_set=[(X_val[FEATURE_NAMES], y_val)],
            callbacks=[lgb.early_stopping(stopping_rounds=40, verbose=False)]
        )

        self.is_fitted = True

    def predict(self, X_input: pd.DataFrame) -> Dict[str, float]:
        if not self.is_fitted:
            loaded = self.load()
            if not loaded or self.point_model is None:
                return {
                    "point_delta": 0.0,
                    "q10_delta": -1.5,
                    "q90_delta": 2.5
                }

        X_eval = X_input[FEATURE_NAMES]
        point = float(self.point_model.predict(X_eval)[0])
        q10 = float(self.q10_model.predict(X_eval)[0]) if self.q10_model else point - 1.5
        q90 = float(self.q90_model.predict(X_eval)[0]) if self.q90_model else point + 2.5

        q10_clean = min(q10, point)
        q90_clean = max(q90, point)

        return {
            "point_delta": round(point, 2),
            "q10_delta": round(q10_clean, 2),
            "q90_delta": round(q90_clean, 2)
        }

    def predict_batch(self, X_input: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        if not self.is_fitted:
            loaded = self.load()
            if not loaded or self.point_model is None:
                n = len(X_input)
                return np.zeros(n), np.full(n, -1.5), np.full(n, 2.5)

        X_eval = X_input[FEATURE_NAMES]
        pts = self.point_model.predict(X_eval)
        q10s = self.q10_model.predict(X_eval) if self.q10_model else pts - 1.5
        q90s = self.q90_model.predict(X_eval) if self.q90_model else pts + 2.5

        q10s_clean = np.minimum(q10s, pts)
        q90s_clean = np.maximum(q90s, pts)

        return pts, q10s_clean, q90s_clean

    def save(self):
        os.makedirs(POINT_MODEL_PATH.parent, exist_ok=True)
        joblib.dump(self.point_model, POINT_MODEL_PATH)
        joblib.dump(self.q10_model, Q10_MODEL_PATH)
        joblib.dump(self.q90_model, Q90_MODEL_PATH)

    def load(self) -> bool:
        if os.path.exists(POINT_MODEL_PATH) and os.path.exists(Q10_MODEL_PATH) and os.path.exists(Q90_MODEL_PATH):
            try:
                self.point_model = joblib.load(POINT_MODEL_PATH)
                self.q10_model = joblib.load(Q10_MODEL_PATH)
                self.q90_model = joblib.load(Q90_MODEL_PATH)
                self.is_fitted = True
                return True
            except Exception:
                pass
        return False
