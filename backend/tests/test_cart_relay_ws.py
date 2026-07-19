"""Customer Display cart-preview WebSocket relay tests.

Covers:
- cart.update from Socket 1 is relayed to Socket 2 (same tenant)
- The sending socket does NOT receive its own message back
- cart.clear is relayed similarly
- Tenancy: cart.update from restaurant A does NOT leak to restaurant B
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


def login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/restaurant/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


async def drain_until(ws, predicate, timeout=8.0):
    end = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = end - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise asyncio.TimeoutError("predicate not satisfied within timeout")
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        try:
            msg = json.loads(raw)
        except Exception:
            continue
        if predicate(msg):
            return msg


@pytest.fixture(scope="module")
def token_a():
    return login(EMAIL_A, PASSWORD_A)


@pytest.fixture(scope="module")
def token_b():
    return login(EMAIL_B, PASSWORD_B)


class TestCartRelay:
    def test_cart_update_relayed_and_not_echoed(self, token_a):
        async def _run():
            url = f"{WS_BASE}?token={token_a}"
            async with websockets.connect(url, open_timeout=10) as ws1, websockets.connect(url, open_timeout=10) as ws2:
                # Drain presence frames on both
                await drain_until(ws1, lambda m: m.get("type") == "presence", timeout=8)
                await drain_until(ws2, lambda m: m.get("type") == "presence", timeout=8)
                # ws2 may see the second presence when ws1 (or its later peer) joins - drain any extra presence quickly
                marker = f"TEST_CART_{uuid.uuid4().hex[:6]}"
                cart_payload = {
                    "type": "cart.update",
                    "data": {
                        "marker": marker,
                        "items": [{"product_name": "Item 1", "quantity": 1, "product_price": 10, "subtotal": 10}],
                        "subtotal": 10, "tip": 2, "total": 12, "payment_method": "cash",
                    },
                }
                await ws1.send(json.dumps(cart_payload))

                # ws2 must receive cart.update with matching marker
                evt = await drain_until(
                    ws2,
                    lambda m: m.get("type") == "cart.update" and (m.get("data") or {}).get("marker") == marker,
                    timeout=6,
                )
                assert evt["data"]["subtotal"] == 10
                assert evt["data"]["tip"] == 2
                assert evt["data"]["total"] == 12

                # ws1 must NOT receive its own message back
                echo = False
                try:
                    await drain_until(
                        ws1,
                        lambda m: m.get("type") == "cart.update" and (m.get("data") or {}).get("marker") == marker,
                        timeout=2.5,
                    )
                    echo = True
                except asyncio.TimeoutError:
                    echo = False
                assert not echo, "sender should not receive its own cart.update"
        asyncio.get_event_loop().run_until_complete(_run())

    def test_cart_clear_relayed(self, token_a):
        async def _run():
            url = f"{WS_BASE}?token={token_a}"
            async with websockets.connect(url, open_timeout=10) as ws1, websockets.connect(url, open_timeout=10) as ws2:
                await drain_until(ws1, lambda m: m.get("type") == "presence", timeout=8)
                await drain_until(ws2, lambda m: m.get("type") == "presence", timeout=8)
                marker = f"CLR_{uuid.uuid4().hex[:6]}"
                await ws1.send(json.dumps({"type": "cart.clear", "data": {"marker": marker}}))
                evt = await drain_until(
                    ws2,
                    lambda m: m.get("type") == "cart.clear" and (m.get("data") or {}).get("marker") == marker,
                    timeout=6,
                )
                assert evt["type"] == "cart.clear"
        asyncio.get_event_loop().run_until_complete(_run())

    def test_cart_update_tenancy_isolated(self, token_a, token_b):
        async def _run():
            async with websockets.connect(f"{WS_BASE}?token={token_a}", open_timeout=10) as ws_a, \
                       websockets.connect(f"{WS_BASE}?token={token_b}", open_timeout=10) as ws_b:
                await drain_until(ws_a, lambda m: m.get("type") == "presence", timeout=8)
                await drain_until(ws_b, lambda m: m.get("type") == "presence", timeout=8)
                marker = f"TENANT_{uuid.uuid4().hex[:6]}"
                await ws_a.send(json.dumps({"type": "cart.update", "data": {"marker": marker, "items": [], "subtotal": 0, "total": 0}}))
                # ws_b should NOT receive it
                leaked = False
                try:
                    await drain_until(
                        ws_b,
                        lambda m: m.get("type") == "cart.update" and (m.get("data") or {}).get("marker") == marker,
                        timeout=3,
                    )
                    leaked = True
                except asyncio.TimeoutError:
                    leaked = False
                assert not leaked, "cart.update leaked across tenants"
        asyncio.get_event_loop().run_until_complete(_run())
