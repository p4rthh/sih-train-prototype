# NavaRail SCADA Control Room Dashboard

Autonomous Train Operation & Section Dispatch Platform for Western Railway (Mumbai Division & Northern Corridor).

## Overview

The **NavaRail SCADA Control Room Dashboard** is a high-density, real-time railway operations center designed for Railway Board, Zonal HQ, Divisional Control Office (MMCT-CTC), and Section Controllers.

### Key Capabilities
- **Hierarchical Jurisdiction**: Western Railway (WR) Mumbai Division corridors (MMCT-BRC, BRC-RTM, RTM-KOTA, KOTA-NDLS liaison).
- **Section Controller Desks**: Real-time section monitoring, conflict detection, and live signal/block state tracking.
- **Dynamic SCADA Schematics**: Real-time corridor overview with live track topology, block occupation, and interlocking status.
- **AI Decision Support**: Real-time delay prediction (LightGBM/SHAP), conflict resolution suggestions, speed restriction management, and caution order logging.
- **Corridor Alerts**: Instant safety broadcast, incident resolution workflow, and cross-section handshakes.

---

## Running Locally

### Option 1: Standalone Node Static Server
```bash
cd control-room-web
node server.js
```
Open [http://localhost:3005](http://localhost:3005) in your browser.

### Option 2: Integrated with NavaRail FastAPI Backend
```bash
# From workspace root
python -m uvicorn server.api.main:app --reload --port 8000
```
Open [http://localhost:8000/control-room/index.html](http://localhost:8000/control-room/index.html).

---

## Architecture & File Structure

```
control-room-web/
├── index.html       # High-density SCADA operations dashboard layout
├── style.css        # SCADA dark-mode console styling, glassmorphic HUD, track schematics
├── tokens.css       # Design tokens (IR color palette, typography, spacing, status indicators)
├── app.js           # Real-time WebSocket & REST controller, track rendering, state manager
├── server.js        # Lightweight Node HTTP server for standalone deployment
├── Samarkan.ttf     # IR / Devanagari aesthetic typeface
└── README.md        # Dashboard documentation
```

### Backend Integrations
- `server/api/routes_control_room.py`: REST APIs for jurisdiction data (`/api/control-room/jurisdiction`) and incident alerts (`/api/control-room/alerts`).
- `server/api/main.py`: Mounts static dashboard files under `/control-room` and registers the control room router.
