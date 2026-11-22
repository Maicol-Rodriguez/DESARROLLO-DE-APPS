"""Pruebas del límite de solicitudes por cliente."""

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from rate_limiting import FixedWindowRateLimiter


def test_rate_limiter_rejects_requests_over_the_window_limit() -> None:
    app = FastAPI()
    limiter = FixedWindowRateLimiter(max_requests=1, window_seconds=60)

    @app.get("/", dependencies=[Depends(limiter)])
    async def endpoint() -> dict[str, str]:
        return {"estado": "ok"}

    client = TestClient(app)

    assert client.get("/").status_code == 200
    response = client.get("/")

    assert response.status_code == 429
    assert response.headers["Retry-After"]
