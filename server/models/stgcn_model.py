import os
import math
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Dict, Any, Optional, Tuple
from server.config import STGCN_MODEL_PATH

class SpatialGraphConv(nn.Module):
    def __init__(self, in_features: int, out_features: int):
        super(SpatialGraphConv, self).__init__()
        self.weight = nn.Parameter(torch.FloatTensor(in_features, out_features))
        self.bias = nn.Parameter(torch.FloatTensor(out_features))
        self.reset_parameters()

    def reset_parameters(self):
        nn.init.xavier_uniform_(self.weight)
        nn.init.zeros_(self.bias)

    def forward(self, x: torch.Tensor, laplacian: torch.Tensor) -> torch.Tensor:
        # x: (B, N, F, T) -> transpose for matrix multiply
        B, N, F_in, T = x.shape
        x_perm = x.permute(0, 3, 1, 2) # (B, T, N, F_in)
        h = torch.matmul(x_perm, self.weight) # (B, T, N, F_out)
        h = torch.einsum("nm,btnf->btmf", laplacian, h) # (B, T, N, F_out)
        h = h + self.bias
        return F.relu(h).permute(0, 2, 3, 1) # (B, N, F_out, T)

class TemporalGatedConv(nn.Module):
    def __init__(self, in_channels: int, out_channels: int, kernel_size: int = 2):
        super(TemporalGatedConv, self).__init__()
        self.conv1 = nn.Conv2d(in_channels, out_channels, (1, kernel_size), padding=(0, 0))
        self.conv2 = nn.Conv2d(in_channels, out_channels, (1, kernel_size), padding=(0, 0))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x: (B, F, N, T)
        p = self.conv1(x)
        q = torch.sigmoid(self.conv2(x))
        return p * q

class STGCNBlock(nn.Module):
    def __init__(self, in_channels: int, spatial_channels: int, out_channels: int, num_nodes: int):
        super(STGCNBlock, self).__init__()
        self.tconv1 = TemporalGatedConv(in_channels, spatial_channels, kernel_size=2)
        self.sconv = SpatialGraphConv(spatial_channels, spatial_channels)
        self.tconv2 = TemporalGatedConv(spatial_channels, out_channels, kernel_size=2)
        self.norm = nn.BatchNorm2d(out_channels)

    def forward(self, x: torch.Tensor, laplacian: torch.Tensor) -> torch.Tensor:
        # x: (B, N, F, T)
        B, N, F_in, T = x.shape
        h = x.permute(0, 2, 1, 3) # (B, F, N, T)
        h = self.tconv1(h)        # (B, F_sp, N, T-1)
        h = h.permute(0, 2, 1, 3) # (B, N, F_sp, T-1)
        h = self.sconv(h, laplacian) # (B, N, F_sp, T-1)
        h = h.permute(0, 2, 1, 3) # (B, F_sp, N, T-1)
        h = self.tconv2(h)        # (B, F_out, N, T-2)
        h = self.norm(h)
        return h.permute(0, 2, 1, 3) # (B, N, F_out, T-2)

class RailwaySTGCN(nn.Module):
    def __init__(self, in_features: int = 4, hidden_dim: int = 32, num_timesteps: int = 4):
        super(RailwaySTGCN, self).__init__()
        self.in_features = in_features
        self.hidden_dim = hidden_dim
        self.num_timesteps = num_timesteps

        self.block1 = nn.Sequential()
        self.sconv = SpatialGraphConv(in_features, hidden_dim)
        self.tconv = nn.Conv1d(hidden_dim * num_timesteps, hidden_dim, kernel_size=1)
        self.readout = nn.Sequential(
            nn.Linear(hidden_dim, 16),
            nn.ReLU(),
            nn.Linear(16, 1)
        )

    def forward(self, x: torch.Tensor, laplacian: torch.Tensor) -> torch.Tensor:
        # x: (B, N, F, T)
        B, N, F_in, T = x.shape
        h = self.sconv(x, laplacian) # (B, N, hidden_dim, T)
        h = h.reshape(B * N, self.hidden_dim * T, 1) # (B*N, hidden_dim*T, 1)
        h = F.relu(self.tconv(h)).squeeze(-1) # (B*N, hidden_dim)
        out = self.readout(h) # (B*N, 1)
        return out.reshape(B, N)

def compute_normalized_laplacian(adj: np.ndarray) -> torch.Tensor:
    n = adj.shape[0]
    adj_tilde = adj + np.eye(n)
    d = np.sum(adj_tilde, axis=1)
    d_inv_sqrt = np.power(np.maximum(d, 1e-5), -0.5)
    d_inv_sqrt[np.isinf(d_inv_sqrt)] = 0.0
    d_mat = np.diag(d_inv_sqrt)
    lap = d_mat.dot(adj_tilde).dot(d_mat)
    return torch.tensor(lap, dtype=torch.float32)

def build_route_adjacency(route_stops: List[Dict[str, Any]]) -> np.ndarray:
    n = max(2, len(route_stops))
    adj = np.zeros((n, n), dtype=np.float32)

    for i in range(len(route_stops)):
        adj[i, i] = 1.0
        if i + 1 < len(route_stops):
            d = float(route_stops[i+1].get("section_km") or 15.0)
            w = math.exp(-d / 100.0)
            adj[i, i+1] = w
            adj[i+1, i] = w

    return adj

class DelaySTGCN:
    def __init__(self):
        self.model = RailwaySTGCN(in_features=4, hidden_dim=32, num_timesteps=4)
        self.is_fitted = False

    def predict(self, route_stops: List[Dict[str, Any]], current_stop_idx: int, delay_history: List[float], weather: Dict[str, Any]) -> float:
        if not self.is_fitted:
            self.load()

        n = len(route_stops)
        if n < 2:
            return 0.0

        adj = build_route_adjacency(route_stops)
        lap = compute_normalized_laplacian(adj)

        T = 4
        curr_delay = float(delay_history[-1]) if delay_history else 0.0
        vis = float(weather.get("visibility_m", 10000.0))
        fog_idx = float(weather.get("fog_severity_index", 0.0))
        precip = float(weather.get("precipitation_mm", 0.0))

        # Node features across T timesteps: (N, 4, T)
        x_data = np.zeros((1, n, 4, T), dtype=np.float32)
        for i in range(n):
            node_rel = max(0, i - current_stop_idx)
            decay = math.exp(-node_rel * 0.25)
            node_delay = curr_delay * decay

            for t in range(T):
                t_lag = (T - 1 - t)
                lag_val = max(0.0, node_delay - (t_lag * 1.5))
                x_data[0, i, 0, t] = lag_val / 60.0
                x_data[0, i, 1, t] = fog_idx
                x_data[0, i, 2, t] = min(1.0, precip / 20.0)
                x_data[0, i, 3, t] = 1.0 if i == current_stop_idx else 0.5

        self.model.eval()
        with torch.no_grad():
            inp = torch.tensor(x_data, dtype=torch.float32)
            out = self.model(inp, lap) # (1, N)
            target_idx = min(current_stop_idx + 1, n - 1)
            delta = float(out[0, target_idx].item()) * 10.0

        return round(float(delta), 2)

    def save(self):
        os.makedirs(STGCN_MODEL_PATH.parent, exist_ok=True)
        torch.save(self.model.state_dict(), str(STGCN_MODEL_PATH))

    def load(self) -> bool:
        if os.path.exists(STGCN_MODEL_PATH):
            try:
                self.model.load_state_dict(torch.load(str(STGCN_MODEL_PATH), weights_only=True))
                self.model.eval()
                self.is_fitted = True
                return True
            except Exception:
                pass
        self.is_fitted = False
        return False
