from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from server.api.routes_eta import router as eta_router, init_ml_engine
from server.api.routes_ws import router as ws_router

app = FastAPI(
    title="RailPravah AI — Dynamic ETA Engine",
    description="Intelligent Indian Railways Dynamic ETA Forecasting & Explainable Delay Platform",
    version="1.0.0"
)

# Enable CORS for React Native mobile client & local testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(eta_router)
app.include_router(ws_router)

@app.on_event("startup")
def on_startup():
    print("=" * 60)
    print("🚀 Starting RailPravah AI Engine...")
    init_ml_engine()
    print("=" * 60)

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
