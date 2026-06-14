import pytest
from fastapi.testclient import TestClient


class TestExceptionHandlers:
    def test_401_response_format(self, client: TestClient):
        response = client.get("/auth/me")
        assert response.status_code == 401
        data = response.json()
        assert "detail" in data

    def test_403_response_format(self, client: TestClient, cliente_auth_headers: dict):
        response = client.get("/usuarios", headers=cliente_auth_headers)
        assert response.status_code == 403
        data = response.json()
        assert "detail" in data

    def test_404_response_format(self, client: TestClient):
        response = client.get("/nonexistent-route")
        assert response.status_code == 404
        data = response.json()
        assert "detail" in data

    def test_422_validation_error_format(self, client: TestClient):
        response = client.post(
            "/auth/register",
            json={"email": "invalid"},
        )
        assert response.status_code == 422
        data = response.json()
        assert "detail" in data
        assert isinstance(data["detail"], list)

    def test_422_multiple_errors(self, client: TestClient):
        response = client.post(
            "/auth/register",
            json={},
        )
        assert response.status_code == 422
        data = response.json()
        assert len(data["detail"]) > 0

    def test_health_endpoint_returns_200(self, client: TestClient):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"
