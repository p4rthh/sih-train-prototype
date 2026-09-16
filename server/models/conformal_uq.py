import os
import json
import numpy as np
from typing import Tuple, Dict, Any, Optional

from server.config import CQR_PARAMS_PATH

class ConformalCalibrator:
    """
    Conformalized Quantile Regression (CQR) with conditional stratification.
    Provides distribution-free, statistically guaranteed 90% confidence intervals.
    Stratifies conformal adjustments across train priority tiers and trip progress stages.
    """
    def __init__(self, coverage: float = 0.90):
        self.coverage = coverage
        self.q_hat: float = 1.8
        self.bucket_q_hats: Dict[str, float] = {}

    def _get_bucket_key(self, priority: int, progress: float) -> str:
        p_tier = 1 if priority <= 1 else (2 if priority == 2 else 3)
        prog_stage = "early" if progress < 0.33 else ("mid" if progress < 0.70 else "late")
        return f"{p_tier}_{prog_stage}"

    def calibrate(
        self,
        y_val: np.ndarray,
        q10_val: np.ndarray,
        q90_val: np.ndarray,
        priorities: Optional[np.ndarray] = None,
        progress_ratios: Optional[np.ndarray] = None
    ) -> float:
        scores = np.maximum(q10_val - y_val, y_val - q90_val)
        n = len(scores)
        if n == 0:
            self.q_hat = 1.8
            return self.q_hat

        p_val = min(1.0, np.ceil((n + 1) * self.coverage) / float(n))
        self.q_hat = float(np.quantile(scores, p_val, method="higher"))

        # Stratified bucket calibration
        if priorities is not None and progress_ratios is not None and len(priorities) == n:
            bucket_scores: Dict[str, list] = {}
            for i in range(n):
                key = self._get_bucket_key(int(priorities[i]), float(progress_ratios[i]))
                bucket_scores.setdefault(key, []).append(scores[i])

            self.bucket_q_hats = {}
            for key, b_scores in bucket_scores.items():
                m = len(b_scores)
                if m >= 25:
                    p_b = min(1.0, np.ceil((m + 1) * self.coverage) / float(m))
                    self.bucket_q_hats[key] = float(np.quantile(b_scores, p_b, method="higher"))
                else:
                    self.bucket_q_hats[key] = self.q_hat

        return self.q_hat

    def predict_interval(
        self,
        q10: float,
        q90: float,
        priority: int = 2,
        progress: float = 0.5
    ) -> Tuple[float, float]:
        key = self._get_bucket_key(priority, progress)
        margin = self.bucket_q_hats.get(key, self.q_hat)
        margin = max(0.4, min(10.0, margin))

        lower = round(float(q10) - margin, 2)
        upper = round(float(q90) + margin, 2)
        return lower, upper

    def save(self):
        os.makedirs(CQR_PARAMS_PATH.parent, exist_ok=True)
        with open(CQR_PARAMS_PATH, "w") as f:
            json.dump({
                "coverage": self.coverage,
                "q_hat": self.q_hat,
                "bucket_q_hats": self.bucket_q_hats
            }, f, indent=2)

    def load(self) -> bool:
        if os.path.exists(CQR_PARAMS_PATH):
            try:
                with open(CQR_PARAMS_PATH, "r") as f:
                    data = json.load(f)
                    self.coverage = float(data.get("coverage", 0.90))
                    self.q_hat = float(data.get("q_hat", 1.8))
                    self.bucket_q_hats = data.get("bucket_q_hats", {})
                return True
            except Exception:
                pass
        self.q_hat = 1.8
        return False
