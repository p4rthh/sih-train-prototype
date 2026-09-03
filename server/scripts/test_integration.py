import asyncio
import json
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

async def test_full_integration():
    print("=" * 60)
    print("🧪 Running Full System End-to-End Integration Test")
    print("=" * 60)

    # 1. Test HTTP Endpoints via ASGI / TestClient
    from server.api.main import app
    from fastapi.testclient import TestClient

    client = TestClient(app)

    # Health
    r = client.get("/api/health")
    assert r.status_code == 200, "Health check failed"
    print("✅ 1. Health check passed:", r.json())

    # Search
    r = client.get("/api/trains/search?q=12952")
    assert r.status_code == 200 and len(r.json()) > 0, "Train search failed"
    print(f"✅ 2. Train search passed: Found {len(r.json())} trains for '12952'")

    # ETA with CQR and SHAP
    r = client.get("/api/train/12952/eta")
    assert r.status_code == 200, "ETA endpoint failed"
    eta_data = r.json()
    print(f"✅ 3. Dynamic ETA passed:")
    print(f"   Train: {eta_data['train_name']} (#{eta_data['train_no']})")
    print(f"   Live Speed: {eta_data['speed_kmh']} km/h")
    print(f"   Current Delay: {eta_data['current_delay_min']} min")
    print(f"   AI 90% Confidence Window: {eta_data['dynamic_eta']['confidence_90']['lower']} – {eta_data['dynamic_eta']['confidence_90']['upper']}")
    print(f"   Point ETA: {eta_data['dynamic_eta']['point_estimate']}")
    print(f"   Top Delay Reason: {eta_data['delay_reasons'][0]['reason']}")

    # Station Board
    r = client.get("/api/station/NDLS/board")
    assert r.status_code == 200 and len(r.json()) > 0, "Station board failed"
    print(f"✅ 4. Station board passed: Found {len(r.json())} departures at NDLS")

    # 2. Test WebSocket Stream
    with client.websocket_connect("/api/train/12952/stream") as websocket:
        data = websocket.receive_text()
        ws_packet = json.loads(data)
        assert ws_packet["train_no"] == "12952", "WebSocket train number mismatch"
        print(f"✅ 5. WebSocket live stream passed: Received live packet with speed {ws_packet['speed_kmh']} km/h and ETA {ws_packet['dynamic_eta']['point_estimate']}")

    print("=" * 60)
    print("🎉 ALL 5 SYSTEM INTEGRATION TESTS PASSED PERFECTLY!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_full_integration())
