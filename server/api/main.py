from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.api.routes_eta import router as eta_router, init_ml_engine
from server.api.routes_ws import router as ws_router

app = FastAPI(
    title="RailPravah AI",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(eta_router)
app.include_router(ws_router)

@app.on_event("startup")
def on_startup():
    init_ml_engine()

@app.get("/")
def root():
    return {
        "status": "online",
        "service": "RailPravah AI Dynamic ETA Platform",
        "endpoints": {
            "health": "/api/health",
            "search": "/api/trains/search?q={query}",
            "route": "/api/trains/route?from_stn={from}&to_stn={to}",
            "stations": "/api/stations/search?q={query}",
            "pnr": "/api/pnr/{pnr_no}",
            "eta": "/api/train/{train_no}/eta",
            "station_board": "/api/station/{station_code}/board",
            "stream": "/api/train/{train_no}/stream",
            "docs": "/docs"
        }
    }

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "RailPravah AI Dynamic ETA Platform",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.api.main:app", host="0.0.0.0", port=8000, reload=True)
