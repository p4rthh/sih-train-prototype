import asyncio
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

async def test_full_integration():
    from server.api.main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)

    r = client.get("/api/health")
    assert r.status_code == 200, "Health check failed"

    r = client.get("/api/trains/search?q=12952")
    assert r.status_code == 200 and len(r.json()) > 0, "Train search failed"

    r = client.get("/api/train/12952/eta")
    assert r.status_code == 200, "ETA endpoint failed"
    eta_data = r.json()
    assert "dynamic_eta" in eta_data
    assert "model_b_stgcn_delta" in eta_data
    assert "ensemble_blend_ratio" in eta_data

    r = client.get("/api/station/NDLS/board")
    assert r.status_code == 200 and len(r.json()) > 0, "Station board failed"

    with client.websocket_connect("/api/train/12952/stream") as websocket:
        data = websocket.receive_text()
        ws_packet = json.loads(data)
        assert ws_packet["train_no"] == "12952", "WebSocket train number mismatch"

    print("All integration tests passed.")

if __name__ == "__main__":
    asyncio.run(test_full_integration())
