import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from server.api.routes_eta import get_train_eta_endpoint

router = APIRouter(tags=["WebSocket Stream"])

@router.websocket("/api/train/{train_no}/stream")
async def websocket_train_stream(websocket: WebSocket, train_no: str):
    """
    Pushes live coordinates, speed, and real-time CQR/SHAP ETA packets
    every 3 seconds to connected mobile clients.
    """
    await websocket.accept()
    print(f"[WS] Client connected to live stream for Train #{train_no}")
    try:
        while True:
            # Generate latest live state + dynamic ETA
            eta_packet = get_train_eta_endpoint(train_no)
            await websocket.send_text(eta_packet.model_dump_json())
            await asyncio.sleep(3.0) # 3-second live tick rate for demonstration
    except WebSocketDisconnect:
        print(f"[WS] Client disconnected from Train #{train_no}")
    except Exception as e:
        print(f"[WS Error] Connection error on #{train_no}: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
