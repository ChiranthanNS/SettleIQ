import sys
from pathlib import Path
from fastapi.testclient import TestClient

PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from backend.app.main import app

client = TestClient(app)


def test_api_workflow():
    r = client.get("/api/health")
    assert r.status_code == 200

    r = client.post("/api/demo/load-sample")
    assert r.status_code == 200
    data = r.json()
    assert data["success"] is True

    r = client.get("/api/reconcile/summary")
    assert r.status_code == 200

    r = client.get("/api/reconcile/exceptions?priority=HIGH")
    assert r.status_code == 200

    r = client.get("/api/reconcile/exception/ORD0096")
    assert r.status_code == 200

    r = client.post("/api/query", json={"query": "Show all duplicate settlements"})
    assert r.status_code == 200

    r = client.get("/api/audit-trail")
    assert r.status_code == 200

    print("test_api_workflow passed")


if __name__ == "__main__":
    test_api_workflow()
