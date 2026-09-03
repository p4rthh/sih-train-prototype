import os
import joblib
import numpy as np
import pandas as pd
import lightgbm as lgb
from typing import Dict, Optional
from server.config import POINT_MODEL_PATH, Q10_MODEL_PATH, Q90_MODEL_PATH
from server.features.pipeline import FEATURE_NAMES

class DelayLightGBM:
    """
    Model A: Gradient Boosted Trees for section delay deviation forecasting.
    Includes Point Estimator (L1 loss) and Quantile Estimators (q=0.10 and q=0.90).
    """
    def __init__(self):
        self.point_model: Optional[lgb.LGBMRegressor] = None
        self.q10_model: Optional[lgb.LGBMRegressor] = None
        self.q90_model: Optional[lgb.LGBMRegressor] = None
        self.is_fitted: bool = False

    def train(self, X_train: pd.DataFrame, y_train: pd.Series, X_val: pd.DataFrame, y_val: pd.Series):
        """Trains Point, q10, and q90 models."""
        base_params = {
            "n_estimators": 400,
            "learning_rate": 0.05,
            "num_leaves": 31,
            "feature_fraction": 0.85,
            "bagging_fraction": 0.8,
            "bagging_freq": 1,
            "random_state": 42,
            "verbose": -1
        }

        print("[ML] Training Point Model (L1 / MAE objective)...")
        self.point_model = lgb.LGBMRegressor(**base_params, objective="regression_l1")
        self.point_model.fit(X_train[FEATURE_NAMES], y_train, eval_set=[(X_val[FEATURE_NAMES], y_val)])

        print("[ML] Training Lower Quantile Model (alpha=0.10)...")
        self.q10_model = lgb.LGBMRegressor(**base_params, objective="quantile", alpha=0.10)
        self.q10_model.fit(X_train[FEATURE_NAMES], y_train, eval_set=[(X_val[FEATURE_NAMES], y_val)])

        print("[ML] Training Upper Quantile Model (alpha=0.90)...")
        self.q90_model = lgb.LGBMRegressor(**base_params, objective="quantile", alpha=0.90)
        self.q90_model.fit(X_train[FEATURE_NAMES], y_train, eval_set=[(X_val[FEATURE_NAMES], y_val)])

        self.is_fitted = True
        print("[ML] LightGBM ensemble training complete.")

    def predict(self, X_input: pd.DataFrame) -> Dict[str, float]:
        """
        Inference on a single row or batch.
        Returns point_delta, q10_delta, q90_delta (guaranteeing no quantile crossing).
        """
        if not self.is_fitted:
            self.load()

        X_eval = X_input[FEATURE_NAMES]
        point = float(self.point_model.predict(X_eval)[0])
        q10 = float(self.q10_model.predict(X_eval)[0])
        q90 = float(self.q90_model.predict(X_eval)[0])

        # Guard rail against quantile crossing
        q10_clean = min(q10, point)
        q90_clean = max(q90, point)

        return {
            "point_delta": round(point, 2),
            "q10_delta": round(q10_clean, 2),
            "q90_delta": round(q90_clean, 2)
        }

    def save(self):
        """Serializes trained models to disk."""
        os.makedirs(POINT_MODEL_PATH.parent, exist_ok=True)
        joblib.dump(self.point_model, POINT_MODEL_PATH)
        joblib.dump(self.q10_model, Q10_MODEL_PATH)
        joblib.dump(self.q90_model, Q90_MODEL_PATH)
        print(f"[ML] Models saved to {POINT_MODEL_PATH.parent}")

    def load(self) -> bool:
        """Loads serialized models from disk."""
        if os.path.exists(POINT_MODEL_PATH) and os.path.exists(Q10_MODEL_PATH) and os.path.exists(Q90_MODEL_PATH):
            self.point_model = joblib.load(POINT_MODEL_PATH)
            self.q10_model = joblib.load(Q10_MODEL_PATH)
            self.q90_model = joblib.load(Q90_MODEL_PATH)
            self.is_fitted = True
            return True
        return False
