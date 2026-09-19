from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from server.api.routes_eta import router as eta_router, init_ml_engine
from server.api.routes_ws import router as ws_router
from server.database import init_db
from server.api.routes_control_room import router as control_room_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    init_ml_engine()
    yield

app = FastAPI(
    title="NavaRail",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(eta_router)
app.include_router(ws_router)
app.include_router(control_room_router)

prototype_dir = Path(__file__).resolve().parent.parent.parent / "prototype"
if prototype_dir.exists():
    app.mount("/dashboard", StaticFiles(directory=str(prototype_dir), html=True), name="dashboard")
    app.mount("/prototype", StaticFiles(directory=str(prototype_dir), html=True), name="prototype")

control_room_dir = Path(__file__).resolve().parent.parent.parent / "control-room-web"
if control_room_dir.exists():
    app.mount("/control-room", StaticFiles(directory=str(control_room_dir), html=True), name="control-room")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "NavaRail Dynamic ETA Platform",
        "control_room_dashboard": "/control-room/index.html",
        "passenger_dashboard_ui": {
            "home": "/dashboard/index.html",
            "overview": "/dashboard/overview.html",
            "itinerary": "/dashboard/itinerary.html",
            "live_map": "/dashboard/map.html",
            "behavior_analysis": "/dashboard/behavior.html",
            "alerts_disruption": "/dashboard/alerts.html"
        },
        "endpoints": {
            "health": "/api/health",
            "search": "/api/trains/search?q={query}",
            "route": "/api/trains/route?from_stn={from}&to_stn={to}",
            "stations": "/api/stations/search?q={query}",
            "pnr": "/api/pnr/{pnr_no}",
            "eta":            "/api/train/{train_no}/eta",
            "station_board": "/api/station/{station_code}/board",
            "stream":        "/api/train/{train_no}/stream",
            "jurisdiction":  "/api/control-room/jurisdiction",
            "alerts":        "/api/control-room/alerts",
            "docs":          "/docs"
        }
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "NavaRail Dynamic ETA Platform",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.api.main:app", host="0.0.0.0", port=8000, reload=True)
