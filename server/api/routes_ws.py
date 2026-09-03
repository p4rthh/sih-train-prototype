import json
import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from server.api.routes_eta import get_train_eta_endpoint

router = APIRouter(tags=["WebSocket Stream"])

@router.websocket("/api/train/{train_no}/stream")
async def websocket_train_stream(websocket: WebSocket, train_no: str):
    await websocket.accept()
    try:
        while True:
            eta_packet = get_train_eta_endpoint(train_no)
            await websocket.send_text(eta_packet.model_dump_json())
            await asyncio.sleep(3.0)
    except WebSocketDisconnect:
        pass
    except Exception:
        try:
            await websocket.close()
        except Exception:
            pass
