"""
Automated Tests for REST API Endpoints using FastAPI TestClient
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_endpoint():
    res = client.get("/")
    assert res.status_code == 200
    data = res.json()
    assert data["system"] == "O.M.E.G.A"
    assert data["status"] == "online"


def test_telemetry_endpoint():
    res = client.get("/api/system/telemetry")
    assert res.status_code == 200
    data = res.json()
    assert "gpuPct" in data
    assert "ramGb" in data
    assert "mood" in data


def test_settings_health():
    res = client.get("/api/settings/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["database"] == "connected"


def test_key_status_endpoint():
    res = client.get("/api/settings/keys")
    assert res.status_code == 200
    data = res.json()
    assert "total_keys" in data
    assert "keys" in data


def test_graph_endpoint():
    res = client.get("/api/graph")
    assert res.status_code == 200
    data = res.json()
    assert "nodes" in data
    assert "edges" in data


def test_actions_pending():
    res = client.get("/api/actions/pending")
    assert res.status_code == 200
    data = res.json()
    assert "pending" in data
