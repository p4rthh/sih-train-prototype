import os
import math
import random
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from typing import List, Dict, Any, Optional, Tuple

from server.config import STGCN_MODEL_PATH, get_train_priority

TARGET_SCALE: float = 6.0
DEFAULT_TIMESTEPS: int = 6
DEFAULT_FEATURES: int = 8

_LAPLACIAN_CACHE: Dict[str, torch.Tensor] = {}

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
        # x: (B, N, F_in, T)
        B, N, F_in, T = x.shape
        x_perm = x.permute(0, 3, 1, 2) # (B, T, N, F_in)
        h = torch.matmul(x_perm, self.weight) # (B, T, N, F_out)
        
        if laplacian.dim() == 2:
            # laplacian: (N, N) shared across batch
            h = torch.einsum("nm,btnf->btmf", laplacian, h)
        elif laplacian.dim() == 3:
            # laplacian: (B, N, N) per-sample in batch
            h = torch.einsum("bnm,btnf->btmf", laplacian, h)
        else:
            raise ValueError(f"Laplacian must be 2D or 3D tensor, got shape {laplacian.shape}")
            
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
    def __init__(self, in_channels: int, spatial_channels: int, out_channels: int):
        super(STGCNBlock, self).__init__()
        self.tconv1 = TemporalGatedConv(in_channels, spatial_channels, kernel_size=2)
        self.sconv = SpatialGraphConv(spatial_channels, spatial_channels)
        self.tconv2 = TemporalGatedConv(spatial_channels, out_channels, kernel_size=2)
        self.norm = nn.BatchNorm2d(out_channels)

    def forward(self, x: torch.Tensor, laplacian: torch.Tensor) -> torch.Tensor:
        # x: (B, N, F, T)
        h = x.permute(0, 2, 1, 3) # (B, F, N, T)
        h = self.tconv1(h)        # (B, F_sp, N, T-1)
        h = h.permute(0, 2, 1, 3) # (B, N, F_sp, T-1)
        h = self.sconv(h, laplacian) # (B, N, F_sp, T-1)
        h = h.permute(0, 2, 1, 3) # (B, F_sp, N, T-1)
        h = self.tconv2(h)        # (B, F_out, N, T-2)
        h = self.norm(h)
        return h.permute(0, 2, 1, 3) # (B, N, F_out, T-2)

class RailwaySTGCN(nn.Module):
    """
    Spatio-temporal graph convolutional network for railway corridor delay propagation.
    Accepts arbitrary corridor length N nodes across T timesteps with 8 station features.
    """
    def __init__(self, in_features: int = 8, hidden_dim: int = 32, num_timesteps: int = 6):
        super(RailwaySTGCN, self).__init__()
        self.in_features = in_features
        self.hidden_dim = hidden_dim
        self.num_timesteps = num_timesteps

        self.block1 = STGCNBlock(in_features, hidden_dim, hidden_dim)
        self.block2 = STGCNBlock(hidden_dim, hidden_dim, hidden_dim * 2)

        self.readout = nn.Sequential(
            nn.Linear(hidden_dim * 2, 32),
            nn.ReLU(),
            nn.Dropout(0.15),
            nn.Linear(32, 1)
        )

    def forward(self, x: torch.Tensor, laplacian: torch.Tensor) -> torch.Tensor:
        # x: (B, N, F=8, T=6)
        h = self.block1(x, laplacian) # (B, N, hidden_dim, T=4)
        h = self.block2(h, laplacian) # (B, N, hidden_dim*2, T=2)

        # Average pool over remaining temporal steps
        h = h.mean(dim=-1) # (B, N, hidden_dim*2)
        out = self.readout(h).squeeze(-1) # (B, N)
        return out

def build_route_adjacency(route_stops: List[Dict[str, Any]]) -> np.ndarray:
    n = max(2, len(route_stops))
    adj = np.zeros((n, n), dtype=np.float32)

    for i in range(len(route_stops)):
        if i + 1 < len(route_stops):
            d = float(route_stops[i + 1].get("section_km") or 15.0)
            w = math.exp(-max(1.0, d) / 100.0)
            adj[i, i + 1] = w
            adj[i + 1, i] = w

    return adj

def compute_normalized_laplacian(adj: np.ndarray) -> torch.Tensor:
    n = adj.shape[0]
    adj_tilde = adj + np.eye(n, dtype=np.float32)
    d = np.sum(adj_tilde, axis=1)
    d_inv_sqrt = np.power(np.maximum(d, 1e-5), -0.5)
    d_inv_sqrt[np.isinf(d_inv_sqrt)] = 0.0
    d_mat = np.diag(d_inv_sqrt)
    lap = d_mat.dot(adj_tilde).dot(d_mat)
    return torch.tensor(lap, dtype=torch.float32)

def get_cached_laplacian(route_stops: List[Dict[str, Any]]) -> torch.Tensor:
    key_parts = []
    for s in route_stops:
        key_parts.append(f"{s.get('station_code', '')}:{s.get('section_km', 0)}")
    key = "|".join(key_parts)

    if key in _LAPLACIAN_CACHE:
        return _LAPLACIAN_CACHE[key]

    adj = build_route_adjacency(route_stops)
    lap = compute_normalized_laplacian(adj)

    if len(_LAPLACIAN_CACHE) > 500:
        _LAPLACIAN_CACHE.clear()

    _LAPLACIAN_CACHE[key] = lap
    return lap

class DelaySTGCN:
    def __init__(self):
        self.model = RailwaySTGCN(
            in_features=DEFAULT_FEATURES,
            hidden_dim=32,
            num_timesteps=DEFAULT_TIMESTEPS
        )
        self.is_fitted = False

    def build_node_features(
        self,
        route_stops: List[Dict[str, Any]],
        current_stop_idx: int,
        delay_history: List[float],
        weather: Dict[str, Any],
        priority_rank: int = 2,
        train_no: Optional[str] = None
    ) -> np.ndarray:
        n = len(route_stops)
        T = DEFAULT_TIMESTEPS
        x_data = np.zeros((1, n, DEFAULT_FEATURES, T), dtype=np.float32)

        curr_delay = float(delay_history[-1]) if delay_history else 0.0
        fog_idx = float(weather.get("fog_severity_index", 0.0))
        precip = float(weather.get("precipitation_mm", 0.0))

        from server.models.recovery_engine import HistoricalRecoveryEngine
        profile = HistoricalRecoveryEngine.get_historical_train_profile(train_no or "12952", priority_rank)
        rec_rate = float(profile.get("median_recovery_rate", 0.70))

        # Build baseline delay profile along corridor
        node_delays = np.zeros(n, dtype=np.float32)
        for i in range(n):
            if i <= current_stop_idx:
                if delay_history and i < len(delay_history):
                    node_delays[i] = float(delay_history[i])
                else:
                    node_delays[i] = curr_delay
            else:
                hops_ahead = i - current_stop_idx
                stop = route_stops[i]
                sec_slack = float(stop.get("section_slack") or 2.5)
                # Model expected delay progression: high priority absorbs slack, low priority accumulates
                if priority_rank <= 2 and curr_delay > 5.0:
                    absorbed = min(curr_delay, hops_ahead * sec_slack * rec_rate * 0.4)
                    node_delays[i] = max(0.0, curr_delay - absorbed)
                elif priority_rank >= 4:
                    node_delays[i] = curr_delay + (hops_ahead * 0.8)
                else:
                    node_delays[i] = curr_delay

        for i in range(n):
            stop = route_stops[i]
            sec_dist = float(stop.get("section_km") or 15.0)
            slack = float(stop.get("section_slack") or 2.5)
            halt = float(stop.get("halt_min") or 0.0)
            d_val = node_delays[i]
            prev_d_val = node_delays[max(0, i - 1)]

            for t in range(T):
                t_lag = (T - 1 - t)
                lag_delay = max(0.0, d_val - (t_lag * 1.0))
                
                # Feature 0: Normalized delay
                x_data[0, i, 0, t] = lag_delay / 60.0
                # Feature 1: Delay gradient / rate of change
                x_data[0, i, 1, t] = (d_val - prev_d_val) / 10.0
                # Feature 2: Fog severity index
                x_data[0, i, 2, t] = fog_idx
                # Feature 3: Precipitation
                x_data[0, i, 3, t] = min(1.0, precip / 25.0)
                # Feature 4: Section distance
                x_data[0, i, 4, t] = min(1.0, sec_dist / 200.0)
                # Feature 5: Section slack and dwell buffer
                x_data[0, i, 5, t] = min(1.0, (slack + halt) / 30.0)
                # Feature 6: Node status (current, departed, upcoming)
                x_data[0, i, 6, t] = 1.0 if i == current_stop_idx else (0.75 if i < current_stop_idx else 0.25)
                # Feature 7: Train priority tier
                x_data[0, i, 7, t] = min(1.0, priority_rank / 6.0)

        return x_data

    def predict(
        self,
        route_stops: List[Dict[str, Any]],
        current_stop_idx: int,
        delay_history: List[float],
        weather: Dict[str, Any],
        priority_rank: int = 2,
        train_no: Optional[str] = None
    ) -> float:
        if not self.is_fitted:
            loaded = self.load()
            if not loaded:
                return 0.0

        n = len(route_stops)
        if n < 2:
            return 0.0

        target_idx = min(current_stop_idx + 1, n - 1)
        if target_idx <= current_stop_idx and current_stop_idx >= n - 1:
            return 0.0

        lap = get_cached_laplacian(route_stops)
        x_data = self.build_node_features(
            route_stops=route_stops,
            current_stop_idx=current_stop_idx,
            delay_history=delay_history,
            weather=weather,
            priority_rank=priority_rank,
            train_no=train_no
        )

        self.model.eval()
        with torch.no_grad():
            inp = torch.tensor(x_data, dtype=torch.float32)
            out = self.model(inp, lap) # shape: (1, N)
            raw_delta = float(out[0, target_idx].item()) * TARGET_SCALE
            # Bound prediction to realistic operational limits per block section
            delta = max(-8.0, min(20.0, raw_delta))

        return round(float(delta), 2)

    def train(
        self,
        routes_sample_size: int = 120,
        trips_per_route: int = 30,
        epochs: int = 40,
        batch_size: int = 32,
        lr: float = 0.003,
        window_nodes: int = 10,
        verbose: bool = True
    ) -> Dict[str, Any]:
        from server.database import get_db_connection, get_train_schedule
        from server.models.recovery_engine import HistoricalRecoveryEngine
        from torch.utils.data import TensorDataset, DataLoader

        if verbose:
            print(f"Sampling {routes_sample_size} diverse railway corridors for ST-GCN training...")

        conn = get_db_connection()
        c = conn.cursor()
        c.execute("""
            SELECT train_number, train_name, COUNT(*) as stops 
            FROM schedules 
            GROUP BY train_number 
            HAVING stops >= 6 
            ORDER BY RANDOM()
            LIMIT ?
        """, (routes_sample_size,))
        routes = [dict(r) for r in c.fetchall()]

        corridor_graphs = []
        for r in routes:
            t_num = r["train_number"]
            c.execute("""
                SELECT s.seq, s.train_number, s.train_name, s.station_code, s.station_name,
                       s.arrival, s.departure, s.day, s.halt_min, st.lat, st.lon
                FROM schedules s
                LEFT JOIN stations st ON s.station_code = st.station_code
                WHERE s.train_number = ?
                ORDER BY s.seq ASC
            """, (t_num,))
            sched = [dict(row) for row in c.fetchall()]
            if len(sched) >= 6:
                p = get_train_priority(t_num, r.get("train_name", ""))
                corridor_graphs.append((t_num, p, sched))
        conn.close()

        if not corridor_graphs:
            raise RuntimeError("No route corridors found in database for ST-GCN training.")

        if verbose:
            print(f"Constructing spatio-temporal graphs from {len(corridor_graphs)} corridors...")

        N_NODES = window_nodes
        T_STEPS = DEFAULT_TIMESTEPS
        F_IN = DEFAULT_FEATURES

        X_list = []
        Y_list = []
        adj_list = []

        for t_no, priority, corridor in corridor_graphs:
            # Take window of stations
            route_nodes = corridor[:N_NODES]
            while len(route_nodes) < N_NODES:
                route_nodes.append(route_nodes[-1])

            adj = build_route_adjacency(route_nodes)
            lap = compute_normalized_laplacian(adj).numpy()
            profile = HistoricalRecoveryEngine.get_historical_train_profile(t_no, priority)
            rec_rate = float(profile.get("median_recovery_rate", 0.70))

            for _ in range(trips_per_route):
                base_delay = random.choice([0.0, 3.0, 8.0, 18.0, 35.0, 65.0])
                fog = random.uniform(0.3, 0.95) if random.random() < 0.25 else 0.0
                precip = random.uniform(5.0, 45.0) if random.random() < 0.20 else 0.0
                is_overnight = 1 if random.random() < 0.35 else 0

                x_sample = np.zeros((N_NODES, F_IN, T_STEPS), dtype=np.float32)
                y_sample = np.zeros(N_NODES, dtype=np.float32)

                curr_d = base_delay
                for i in range(N_NODES):
                    stop = route_nodes[i]
                    sec_dist = float(stop.get("section_km") or 15.0)
                    slack = float(stop.get("section_slack") or 2.5)
                    halt = float(stop.get("halt_min") or 0.0)

                    node_delay = max(0.0, curr_d * math.exp(-i * 0.06))

                    for t in range(T_STEPS):
                        t_lag = (T_STEPS - 1 - t)
                        lag_val = max(0.0, node_delay - (t_lag * 1.1))

                        x_sample[i, 0, t] = lag_val / 60.0
                        x_sample[i, 1, t] = (node_delay - lag_val) / 10.0
                        x_sample[i, 2, t] = fog
                        x_sample[i, 3, t] = min(1.0, precip / 25.0)
                        x_sample[i, 4, t] = min(1.0, sec_dist / 200.0)
                        x_sample[i, 5, t] = min(1.0, (slack + halt) / 30.0)
                        x_sample[i, 6, t] = 1.0 if i == 0 else (0.75 if i < 3 else 0.25)
                        x_sample[i, 7, t] = min(1.0, priority / 6.0)

                    # Dynamic delay delta based on operational railway kinematics
                    prop_delta = (node_delay * 0.05) + (fog * 3.8) + (min(1.0, precip / 20.0) * 2.2)
                    if priority <= 2 and is_overnight and node_delay > 5.0:
                        prop_delta -= 2.4 * rec_rate
                    elif priority >= 4:
                        prop_delta += 1.4

                    # Slack buffer absorption
                    if node_delay > 3.0 and slack > 2.0:
                        prop_delta -= min(slack * 0.35, 1.8)

                    # Terminal buffer absorption
                    if i >= N_NODES - 2 and node_delay > 4.0:
                        prop_delta -= 2.2

                    # Target normalized by TARGET_SCALE
                    target_clamped = max(-6.0, min(15.0, prop_delta))
                    y_sample[i] = round(target_clamped / TARGET_SCALE, 4)
                    curr_d = max(0.0, curr_d + prop_delta)

                X_list.append(x_sample)
                Y_list.append(y_sample)
                adj_list.append(lap)

        total_samples = len(X_list)
        split_idx = int(total_samples * 0.80)

        X_train_t = torch.tensor(np.array(X_list[:split_idx]), dtype=torch.float32)
        Y_train_t = torch.tensor(np.array(Y_list[:split_idx]), dtype=torch.float32)
        lap_train_batch = torch.tensor(np.array(adj_list[:split_idx]), dtype=torch.float32)

        X_val_t = torch.tensor(np.array(X_list[split_idx:]), dtype=torch.float32)
        Y_val_t = torch.tensor(np.array(Y_list[split_idx:]), dtype=torch.float32)
        lap_val_batch = torch.tensor(np.array(adj_list[split_idx:]), dtype=torch.float32)

        train_ds = TensorDataset(X_train_t, Y_train_t, lap_train_batch)
        val_ds = TensorDataset(X_val_t, Y_val_t, lap_val_batch)

        train_loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
        val_loader = DataLoader(val_ds, batch_size=batch_size, shuffle=False)

        if verbose:
            print(f"Dataset ready: {len(train_ds)} train graphs, {len(val_ds)} validation graphs.")

        self.model = RailwaySTGCN(
            in_features=F_IN,
            hidden_dim=32,
            num_timesteps=T_STEPS
        )
        optimizer = torch.optim.AdamW(self.model.parameters(), lr=lr, weight_decay=1e-3)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=epochs)
        criterion = nn.SmoothL1Loss()

        best_val_loss = float("inf")
        best_state = None

        if verbose:
            print(f"Training RailwaySTGCN across {epochs} epochs...")

        for epoch in range(epochs):
            self.model.train()
            train_loss = 0.0
            for bx, by, blap in train_loader:
                optimizer.zero_grad()
                out = self.model(bx, blap)
                loss = criterion(out, by)
                loss.backward()
                optimizer.step()
                train_loss += loss.item()
            scheduler.step()

            # Validation evaluation
            self.model.eval()
            val_loss = 0.0
            with torch.no_grad():
                for vx, vy, vlap in val_loader:
                    vout = self.model(vx, vlap)
                    val_loss += criterion(vout, vy).item()

            train_loss /= len(train_loader)
            val_loss /= len(val_loader)

            if val_loss < best_val_loss:
                best_val_loss = val_loss
                best_state = {k: v.cpu().clone() for k, v in self.model.state_dict().items()}

            if verbose and ((epoch + 1) % 10 == 0 or epoch == epochs - 1):
                print(f"Epoch [{epoch + 1}/{epochs}] - Train Loss: {train_loss:.4f} - Val Loss: {val_loss:.4f}")

        if best_state is not None:
            self.model.load_state_dict(best_state)

        self.is_fitted = True
        self.save()

        # Compute validation metrics
        self.model.eval()
        with torch.no_grad():
            all_preds = []
            all_targets = []
            for vx, vy, vlap in val_loader:
                vout = self.model(vx, vlap)
                all_preds.append((vout * TARGET_SCALE).numpy())
                all_targets.append((vy * TARGET_SCALE).numpy())

            y_pred_arr = np.concatenate(all_preds, axis=0).flatten()
            y_true_arr = np.concatenate(all_targets, axis=0).flatten()

            mae = float(np.mean(np.abs(y_pred_arr - y_true_arr)))
            rmse = float(np.sqrt(np.mean((y_pred_arr - y_true_arr) ** 2)))

        if verbose:
            print(f"ST-GCN Training Complete. Best Val Loss: {best_val_loss:.4f}, Val MAE: {mae:.2f} min, Val RMSE: {rmse:.2f} min")

        return {
            "best_val_loss": round(best_val_loss, 4),
            "val_mae": round(mae, 3),
            "val_rmse": round(rmse, 3),
            "total_train_samples": len(train_ds),
            "total_val_samples": len(val_ds)
        }

    def save(self, path: Optional[str] = None):
        save_path = Path(path) if path else STGCN_MODEL_PATH
        os.makedirs(save_path.parent, exist_ok=True)
        torch.save(self.model.state_dict(), str(save_path))

    def load(self, path: Optional[str] = None) -> bool:
        load_path = Path(path) if path else STGCN_MODEL_PATH
        if os.path.exists(load_path):
            try:
                self.model.load_state_dict(torch.load(str(load_path), weights_only=True))
                self.model.eval()
                self.is_fitted = True
                return True
            except Exception:
                pass
        self.is_fitted = False
        return False
