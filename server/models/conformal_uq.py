import os
import json
import numpy as np
from typing import Tuple, Dict, Any
from server.config import CQR_PARAMS_PATH

class ConformalCalibrator:
    def __init__(self, coverage: float = 0.90):
        self.coverage = coverage
        self.q_hat = 0.0

    def calibrate(self, y_val: np.ndarray, q10_val: np.ndarray, q90_val: np.ndarray) -> float:
        scores = np.maximum(q10_val - y_val, y_val - q90_val)
        n = len(scores)
        p_val = min(1.0, np.ceil((n + 1) * self.coverage) / n)
        self.q_hat = float(np.quantile(scores, p_val, method="higher"))
        return self.q_hat

    def predict_interval(self, q10: float, q90: float) -> Tuple[float, float]:
        margin = max(0.5, self.q_hat)
        return round(q10 - margin, 2), round(q90 + margin, 2)

    def save(self):
        os.makedirs(CQR_PARAMS_PATH.parent, exist_ok=True)
        with open(CQR_PARAMS_PATH, "w") as f:
            json.dump({"coverage": self.coverage, "q_hat": self.q_hat}, f, indent=2)

    def load(self) -> bool:
        if os.path.exists(CQR_PARAMS_PATH):
            with open(CQR_PARAMS_PATH, "r") as f:
                data = json.load(f)
                self.coverage = data.get("coverage", 0.90)
                self.q_hat = data.get("q_hat", 2.0)
            return True
        self.q_hat = 2.0
        return False
