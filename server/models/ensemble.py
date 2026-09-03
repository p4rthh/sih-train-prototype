import os
import json
import numpy as np
from typing import Dict, Any, Optional
from server.config import ENSEMBLE_PARAMS_PATH

class StackingEnsemble:
    def __init__(self, weight_lgb: float = 0.60, weight_stgcn: float = 0.40, bias: float = 0.0):
        self.w_lgb = weight_lgb
        self.w_stgcn = weight_stgcn
        self.bias = bias
        self.is_fitted = False

    def predict_delta(self, pred_lgb: float, pred_stgcn: float, hop_dist: int = 1) -> float:
        # Dynamic hop-adaptive weighting
        # Short hop (1-2 stops): LightGBM feature precision has higher fidelity
        # Longer corridor propagation: ST-GCN graph message passing has higher fidelity
        if hop_dist <= 1:
            w_a = max(0.55, self.w_lgb)
            w_b = 1.0 - w_a
        else:
            w_b = max(0.45, self.w_stgcn)
            w_a = 1.0 - w_b

        blended = (w_a * pred_lgb) + (w_b * pred_stgcn) + self.bias
        return round(float(blended), 2)

    def fit(self, y_true: np.ndarray, preds_lgb: np.ndarray, preds_stgcn: np.ndarray):
        from sklearn.linear_model import Ridge
        X_stack = np.column_stack([preds_lgb, preds_stgcn])
        reg = Ridge(alpha=1.0, positive=True, fit_intercept=True)
        reg.fit(X_stack, y_true)
        
        weights = reg.coef_
        total_w = max(1e-5, np.sum(weights))
        self.w_lgb = float(weights[0] / total_w)
        self.w_stgcn = float(weights[1] / total_w)
        self.bias = float(reg.intercept_)
        self.is_fitted = True

    def save(self):
        os.makedirs(ENSEMBLE_PARAMS_PATH.parent, exist_ok=True)
        with open(ENSEMBLE_PARAMS_PATH, "w") as f:
            json.dump({
                "weight_lgb": self.w_lgb,
                "weight_stgcn": self.w_stgcn,
                "bias": self.bias
            }, f, indent=2)

    def load(self) -> bool:
        if os.path.exists(ENSEMBLE_PARAMS_PATH):
            try:
                with open(ENSEMBLE_PARAMS_PATH, "r") as f:
                    data = json.load(f)
                    self.w_lgb = float(data.get("weight_lgb", 0.60))
                    self.w_stgcn = float(data.get("weight_stgcn", 0.40))
                    self.bias = float(data.get("bias", 0.0))
                    self.is_fitted = True
                    return True
            except Exception:
                pass
        return False
