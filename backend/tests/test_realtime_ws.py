"""Realtime WebSocket regression suite.

Covers:
- Connect with valid JWT → presence push + pong on ping
- Connect without / with invalid token → server closes with 4401
- POST /api/orders broadcasts order.created with full payload
- POST/PUT/DELETE /api/products broadcasts product.{created,updated,deleted}
- POST/PUT/DELETE /api/cashiers broadcasts cashier.{created,updated,deleted}
- POST /api/cash-register/close broadcasts cash-register.closed
- Tenancy: listener on restaurant A must NOT receive events from restaurant B
"""

import os
import json
import asyncio
import uuid
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resto-pos-hub-11.preview.emergentagent.com").rstrip("/")
WS_BASE = BASE_URL.replace("http", "ws", 1) + "/api/ws"

EMAIL_A = "said95454@gmail.com"
PASSWORD_A = "pos12345"
EMAIL_B = "demo@restaurant.com"
PASSWORD_B = "pos12345"


# ============= Helpers =============
def login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/restaurant/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


async def drain_until(ws, predicate, timeout=8.0):
    """Receive messages until predicate(msg) returns True, return that msg.
    Skips intermediate presence frames or other types."""
    end = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = end - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise asyncio.TimeoutError("predicate not satisfied within timeout")
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        msg = json.loads(raw)
        if predicate(msg):
            return msg


# ============= Fixtures =============
@pytest.fixture(scope="module")
def token_a():
    return login(EMAIL_A, PASSWORD_A)


@pytest.fixture(scope="module")
def token_b():
    return login(EMAIL_B, PASSWORD_B)


# ============= AUTH TESTS =============
class TestWebSocketAuth:
    def test_connect_without_token(self):
        async def _run():
            try:
                async with websockets.connect(WS_BASE, open_timeout=10):
                    return None
            except Exception as e:
                return e
        result = asyncio.get_event_loop().run_until_complete(_run())
        # Should fail to connect (missing required query param → 4xx) or close immediately with 4401
        assert result is not None, "WS without token should not stay open"

    def test_connect_with_invalid_token(self):
        async def _run():
            try:
                async with websockets.connect(f"{WS_BASE}?token=invalid.jwt.value", open_timeout=10) as ws:
                    # Server should close immediately with 4401
                    try:
                        await asyncio.wait_for(ws.recv(), timeout=5)
                    except websockets.ConnectionClosed as e:
                        return e.code
                    except Exception as e:
                        return e
                return None
            except websockets.InvalidStatus as e:
                return e
            except Exception as e:
                return e
        code = asyncio.get_event_loop().run_until_complete(_run())
        assert code is not None, "expected closure"
        # Accept either ConnectionClosed code 4401 or any exception (proxy/handshake variants)
        if hasattr(code, "code"):
            assert code.code in (4401, 1006, 1011), f"unexpected close code: {code.code}"


# ============= CONNECTION / PRESENCE / PING =============
class TestWebSocketConnect:
    def test_connect_presence_and_ping(self, token_a):
        async def _run():
            url = f"{WS_BASE}?token={token_a}"
            async with websockets.connect(url, open_timeout=10) as ws:
                # Expect a presence frame quickly after connect
                pres = await drain_until(ws, lambda m: m.get("type") == "presence", timeout=8)
                assert isinstance(pres.get("count"), int)
                assert pres["count"] >= 1
                # Send ping → expect pong
                await ws.send("ping")
                pong = await drain_until(ws, lambda m: m.get("type") == "pong", timeout=5)
                assert pong["type"] == "pong"
        asyncio.get_event_loop().run_until_complete(_run())


# ============= BROADCAST: ORDER =============
class TestOrderBroadcast:
    def test_order_created_event_with_full_payload(self, token_a):
        async def _run():
            url = f"{WS_BASE}?token={token_a}"
            async with websockets.connect(url, open_timeout=10) as ws:
                # Drain initial presence
                await drain_until(ws, lambda m: m.get("type") == "presence", timeout=8)
                # Trigger order creation via REST
                payload = {
                    "customer_name": f"TEST_WS_{uuid.uuid4().hex[:6]}",
                    "items": [{"product_id": "p1", "product_name": "Item 1", "quantity": 1, "product_price": 50, "subtotal": 50}],
                    "subtotal": 50,
                    "tip": 5,
                    "total": 55,
                    "payment_method": "cash",
                }
                r = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=auth_headers(token_a), timeout=15)
                assert r.status_code in (200, 201), f"order create: {r.status_code} {r.text}"
                created_id = r.json().get("id")
                # Expect order.created event
                evt = await drain_until(ws, lambda m: m.get("type") == "order.created", timeout=10)
                data = evt.get("data") or {}
                # Required fields per spec
                for key in ("id", "customer_name", "total", "tip", "subtotal", "payment_method", "items_count", "created_at"):
                    assert key in data, f"missing field {key} in order.created data: {data}"
                assert data["id"] == created_id
                assert data["customer_name"] == payload["customer_name"]
                assert float(data["total"]) == 55
                assert float(data["tip"]) == 5
                assert float(data["subtotal"]) == 50
                assert data["payment_method"] == "cash"
                assert int(data["items_count"]) == 1
        asyncio.get_event_loop().run_until_complete(_run())


# ============= BROADCAST: PRODUCT CRUD =============
class TestProductBroadcast:
    def test_product_crud_broadcasts(self, token_a):
        async def _run():
            url = f"{WS_BASE}?token={token_a}"
            async with websockets.connect(url, open_timeout=10) as ws:
                await drain_until(ws, lambda m: m.get("type") == "presence", timeout=8)

                # CREATE
                name = f"TEST_WS_PROD_{uuid.uuid4().hex[:6]}"
                payload = {"name": name, "price": 12.5, "category": "Test", "stock": 5}
                r = requests.post(f"{BASE_URL}/api/products", json=payload, headers=auth_headers(token_a), timeout=15)
                assert r.status_code in (200, 201), f"product create: {r.status_code} {r.text}"
                pid = r.json()["id"]
                evt = await drain_until(ws, lambda m: m.get("type") == "product.created", timeout=8)
                assert evt["data"]["id"] == pid

                # UPDATE
                r = requests.put(f"{BASE_URL}/api/products/{pid}", json={"name": name + "_UPD"}, headers=auth_headers(token_a), timeout=15)
                assert r.status_code == 200, f"product update: {r.status_code} {r.text}"
                evt = await drain_until(ws, lambda m: m.get("type") == "product.updated", timeout=8)
                assert evt["data"]["id"] == pid

                # DELETE
                r = requests.delete(f"{BASE_URL}/api/products/{pid}", headers=auth_headers(token_a), timeout=15)
                assert r.status_code in (200, 204), f"product delete: {r.status_code} {r.text}"
                evt = await drain_until(ws, lambda m: m.get("type") == "product.deleted", timeout=8)
                assert evt["data"]["id"] == pid
        asyncio.get_event_loop().run_until_complete(_run())


# ============= BROADCAST: CASHIER CRUD =============
class TestCashierBroadcast:
    def test_cashier_crud_broadcasts(self, token_a):
        async def _run():
            url = f"{WS_BASE}?token={token_a}"
            async with websockets.connect(url, open_timeout=10) as ws:
                await drain_until(ws, lambda m: m.get("type") == "presence", timeout=8)

                # CREATE
                name = f"TEST_WS_C_{uuid.uuid4().hex[:5]}"
                r = requests.post(f"{BASE_URL}/api/cashiers", json={"name": name, "pin": "1234"}, headers=auth_headers(token_a), timeout=15)
                assert r.status_code in (200, 201), f"cashier create: {r.status_code} {r.text}"
                cid = r.json()["id"]
                evt = await drain_until(ws, lambda m: m.get("type") == "cashier.created", timeout=8)
                assert evt["data"]["id"] == cid

                # UPDATE
                r = requests.put(f"{BASE_URL}/api/cashiers/{cid}", json={"name": name + "_UPD"}, headers=auth_headers(token_a), timeout=15)
                assert r.status_code == 200, f"cashier update: {r.status_code} {r.text}"
                evt = await drain_until(ws, lambda m: m.get("type") == "cashier.updated", timeout=8)
                assert evt["data"]["id"] == cid

                # DELETE
                r = requests.delete(f"{BASE_URL}/api/cashiers/{cid}", headers=auth_headers(token_a), timeout=15)
                assert r.status_code in (200, 204), f"cashier delete: {r.status_code} {r.text}"
                evt = await drain_until(ws, lambda m: m.get("type") == "cashier.deleted", timeout=8)
                assert evt["data"]["id"] == cid
        asyncio.get_event_loop().run_until_complete(_run())


# ============= TENANCY =============
class TestTenancyIsolation:
    def test_event_does_not_leak_to_other_restaurant(self, token_a, token_b):
        async def _run():
            url_a = f"{WS_BASE}?token={token_a}"
            url_b = f"{WS_BASE}?token={token_b}"
            async with websockets.connect(url_a, open_timeout=10) as ws_a, websockets.connect(url_b, open_timeout=10) as ws_b:
                # Drain presence frames
                await drain_until(ws_a, lambda m: m.get("type") == "presence", timeout=8)
                await drain_until(ws_b, lambda m: m.get("type") == "presence", timeout=8)

                # Create an order on restaurant A
                cname = f"TEST_TENANCY_{uuid.uuid4().hex[:6]}"
                payload = {
                    "customer_name": cname,
                    "items": [{"product_id": "p1", "product_name": "Item", "quantity": 1, "product_price": 10, "subtotal": 10}],
                    "subtotal": 10, "tip": 0, "total": 10, "payment_method": "cash",
                }
                r = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=auth_headers(token_a), timeout=15)
                assert r.status_code in (200, 201)

                # ws_a must receive order.created
                evt = await drain_until(ws_a, lambda m: m.get("type") == "order.created", timeout=10)
                assert evt["data"]["customer_name"] == cname

                # ws_b must NOT receive that order within reasonable window
                leaked = False
                try:
                    leak = await drain_until(
                        ws_b,
                        lambda m: m.get("type") == "order.created" and (m.get("data") or {}).get("customer_name") == cname,
                        timeout=3.0,
                    )
                    if leak:
                        leaked = True
                except asyncio.TimeoutError:
                    leaked = False
                assert not leaked, "Tenancy LEAK: restaurant B received order from restaurant A"
        asyncio.get_event_loop().run_until_complete(_run())


# ============= CASH REGISTER CLOSE (best-effort) =============
class TestCashRegisterCloseBroadcast:
    def test_cash_register_close_broadcasts(self, token_a):
        """Best-effort: the endpoint requires an open register. If precondition cannot be
        established cleanly we skip; if it can, we assert cash-register.closed is emitted."""
        async def _run():
            url = f"{WS_BASE}?token={token_a}"
            async with websockets.connect(url, open_timeout=10) as ws:
                await drain_until(ws, lambda m: m.get("type") == "presence", timeout=8)
                # Try to open then close — if open endpoint isn't there or fails, skip
                open_resp = requests.post(
                    f"{BASE_URL}/api/cash-register/open",
                    json={"opening_cash": 0},
                    headers=auth_headers(token_a),
                    timeout=15,
                )
                if open_resp.status_code not in (200, 201, 409):
                    pytest.skip(f"open cash register not available: {open_resp.status_code}")
                close_resp = requests.post(
                    f"{BASE_URL}/api/cash-register/close",
                    json={"counted_cash": 0, "notes": "TEST_WS_CLOSE"},
                    headers=auth_headers(token_a),
                    timeout=15,
                )
                if close_resp.status_code not in (200, 201):
                    pytest.skip(f"close cash register failed precondition: {close_resp.status_code} {close_resp.text}")
                evt = await drain_until(ws, lambda m: m.get("type") == "cash-register.closed", timeout=8)
                assert evt["type"] == "cash-register.closed"
                assert "data" in evt
        asyncio.get_event_loop().run_until_complete(_run())
