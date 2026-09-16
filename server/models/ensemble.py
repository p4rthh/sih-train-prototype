import os
import json
import numpy as np
from typing import Dict, Any, Optional
from server.config import ENSEMBLE_PARAMS_PATH

class StackingEnsemble:
    """
    Learned meta-learner combining tabular LightGBM and spatial ST-GCN predictions.
    Adapts weights dynamically based on hop distance, model disagreement, and operating context.
    """
    def __init__(self, weight_lgb: float = 0.65, weight_stgcn: float = 0.35, bias: float = 0.0):
        self.w_lgb = weight_lgb
        self.w_stgcn = weight_stgcn
        self.bias = bias
        self.hop_decay = 0.04
        self.meta_weights: Dict[str, float] = {}
        self.is_fitted = False

    def predict_delta(
        self,
        pred_lgb: float,
        pred_stgcn: float,
        hop_dist: int = 1,
        context: Optional[Dict[str, Any]] = None
    ) -> float:
        ctx = context or {}
        
        # Adaptive hop adjustment:
        # 1-2 hops: Tabular LightGBM features (speed, local weather, slack) dominate
        # 3+ hops: ST-GCN network-wide spatial message passing carries more signal
        decay_factor = min(0.20, (max(1, hop_dist) - 1) * self.hop_decay)
        w_lgb_eff = max(0.40, self.w_lgb - decay_factor)
        w_stgcn_eff = 1.0 - w_lgb_eff

        # Disagreement dampening
        diff = abs(pred_lgb - pred_stgcn)
        damping = 0.0
        if diff > 4.0:
            damping = -0.15 * min(3.0, diff - 4.0)

        blended = (w_lgb_eff * pred_lgb) + (w_stgcn_eff * pred_stgcn) + self.bias + damping
        return round(float(blended), 2)

    def fit(
        self,
        y_true: np.ndarray,
        preds_lgb: np.ndarray,
        preds_stgcn: np.ndarray,
        contexts: Optional[Dict[str, np.ndarray]] = None
    ):
        from sklearn.linear_model import Ridge
        X_stack = np.column_stack([preds_lgb, preds_stgcn])
        reg = Ridge(alpha=2.0, positive=True, fit_intercept=True)
        reg.fit(X_stack, y_true)

        weights = reg.coef_
        total_w = max(1e-5, float(np.sum(weights)))
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
                "bias": self.bias,
                "hop_decay": self.hop_decay,
                "meta_weights": self.meta_weights
            }, f, indent=2)

    def load(self) -> bool:
        if os.path.exists(ENSEMBLE_PARAMS_PATH):
            try:
                with open(ENSEMBLE_PARAMS_PATH, "r") as f:
                    data = json.load(f)
                    self.w_lgb = float(data.get("weight_lgb", 0.65))
                    self.w_stgcn = float(data.get("weight_stgcn", 0.35))
                    self.bias = float(data.get("bias", 0.0))
                    self.hop_decay = float(data.get("hop_decay", 0.04))
                    self.meta_weights = data.get("meta_weights", {})
                    self.is_fitted = True
                    return True
            except Exception:
                pass
        return False
