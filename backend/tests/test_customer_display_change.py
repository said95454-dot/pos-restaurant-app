"""Customer Display 'change' visibility tests.

Covers:
- cart.update relay carries amount_received/change/is_checkout_open (live change on display).
- POST /api/orders accepts amount_received/change and returns them.
- Backend emits order.created via WebSocket with amount_received/change to peers.
"""

import os
import json
import asyncio
import uuid
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
WS_BASE = BASE_URL.replace("http", "ws", 1) + "/api/ws"

EMAIL = "said95454@gmail.com"
PASSWORD = "pos12345"


def login(email, password):
    r = requests.post(
        f"{BASE_URL}/api/auth/restaurant/login",
        json={"email": email, "password": password},
        timeout=15,
    )
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
def token():
    return login(EMAIL, PASSWORD)


class TestLiveChangeRelay:
    """The POS broadcasts cart.update with amount_received/change while cashier types
    the amount. The customer display peer must receive those fields."""

    def test_cart_update_carries_amount_received_and_change(self, token):
        async def _run():
            url = f"{WS_BASE}?token={token}"
            async with websockets.connect(url, open_timeout=10) as ws_pos, \
                       websockets.connect(url, open_timeout=10) as ws_display:
                await drain_until(ws_pos, lambda m: m.get("type") == "presence", timeout=8)
                await drain_until(ws_display, lambda m: m.get("type") == "presence", timeout=8)

                marker = f"CHG_{uuid.uuid4().hex[:6]}"
                payload = {
                    "type": "cart.update",
                    "data": {
                        "marker": marker,
                        "items": [{"product_name": "Taco", "product_price": 30, "quantity": 2, "subtotal": 60}],
                        "subtotal": 60, "tip": 0, "total": 60,
                        "payment_method": "cash",
                        "is_checkout_open": True,
                        "amount_received": 100,
                        "change": 40,
                    },
                }
                await ws_pos.send(json.dumps(payload))
                evt = await drain_until(
                    ws_display,
                    lambda m: m.get("type") == "cart.update" and (m.get("data") or {}).get("marker") == marker,
                    timeout=6,
                )
                d = evt["data"]
                assert d.get("amount_received") == 100, "amount_received not relayed"
                assert d.get("change") == 40, "change not relayed"
                assert d.get("is_checkout_open") is True
                assert d.get("payment_method") == "cash"

        asyncio.get_event_loop().run_until_complete(_run())


class TestOrderCreatePersistsChange:
    """POST /api/orders must accept and echo back amount_received and change."""

    def test_create_cash_order_returns_change_fields(self, token):
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        # Need at least one product to reference. Fetch existing; if none, create one.
        r = requests.get(f"{BASE_URL}/api/products", headers=headers, timeout=15)
        assert r.status_code == 200
        products = r.json()
        if not products:
            r_new = requests.post(
                f"{BASE_URL}/api/products",
                headers=headers,
                json={"name": "TEST_Taco", "price": 25.0, "category": "comida"},
                timeout=15,
            )
            assert r_new.status_code in (200, 201)
            product = r_new.json()
        else:
            product = products[0]

        pid = product["id"]
        pprice = float(product["price"])
        subtotal = pprice * 1
        total = subtotal
        amount_received = round(total + 15.5, 2)
        change = round(amount_received - total, 2)

        order_payload = {
            "customer_name": f"TEST_change_{uuid.uuid4().hex[:5]}",
            "items": [{
                "product_id": pid,
                "product_name": product["name"],
                "product_price": pprice,
                "quantity": 1,
                "selected_options": [],
                "subtotal": subtotal,
            }],
            "subtotal": subtotal,
            "tip": 0.0,
            "total": total,
            "payment_method": "cash",
            "amount_received": amount_received,
            "change": change,
        }

        r = requests.post(f"{BASE_URL}/api/orders", headers=headers, json=order_payload, timeout=20)
        assert r.status_code in (200, 201), f"order create failed: {r.status_code} {r.text}"
        data = r.json()
        assert data.get("payment_method") == "cash"
        assert data.get("amount_received") == amount_received, f"amount_received not persisted: {data}"
        assert data.get("change") == change, f"change not persisted: {data}"
        assert "_id" not in data, "MongoDB _id leaked in response"

        # Verify persistence via GET
        oid = data["id"]
        r2 = requests.get(f"{BASE_URL}/api/orders", headers=headers, timeout=15)
        assert r2.status_code == 200
        fetched = next((o for o in r2.json() if o.get("id") == oid), None)
        assert fetched is not None, "order not found after create"
        assert fetched.get("amount_received") == amount_received
        assert fetched.get("change") == change

    def test_card_order_change_is_null_or_zero(self, token):
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        r = requests.get(f"{BASE_URL}/api/products", headers=headers, timeout=15)
        assert r.status_code == 200
        products = r.json()
        assert products, "no products available for test"
        product = products[0]

        order_payload = {
            "customer_name": f"TEST_card_{uuid.uuid4().hex[:5]}",
            "items": [{
                "product_id": product["id"],
                "product_name": product["name"],
                "product_price": float(product["price"]),
                "quantity": 1,
                "selected_options": [],
                "subtotal": float(product["price"]),
            }],
            "subtotal": float(product["price"]),
            "tip": 0.0,
            "total": float(product["price"]),
            "payment_method": "card",
            "amount_received": None,
            "change": None,
        }
        r = requests.post(f"{BASE_URL}/api/orders", headers=headers, json=order_payload, timeout=20)
        assert r.status_code in (200, 201)
        d = r.json()
        assert d.get("payment_method") == "card"
        assert d.get("amount_received") in (None, 0, 0.0)
        assert d.get("change") in (None, 0, 0.0)


class TestOrderCreatedWSBroadcast:
    """Backend emits order.created to all peers including amount_received/change."""

    def test_order_created_ws_includes_change(self, token):
        async def _run():
            url = f"{WS_BASE}?token={token}"
            async with websockets.connect(url, open_timeout=10) as ws_display:
                await drain_until(ws_display, lambda m: m.get("type") == "presence", timeout=8)

                # Trigger order via HTTP in a background thread
                headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

                def _fetch_products():
                    return requests.get(f"{BASE_URL}/api/products", headers=headers, timeout=15).json()

                products = await asyncio.get_event_loop().run_in_executor(None, _fetch_products)
                assert products, "need at least one product"
                p = products[0]
                total = float(p["price"])
                amount_received = round(total + 7.25, 2)
                change = round(amount_received - total, 2)
                cname = f"TEST_ws_{uuid.uuid4().hex[:5]}"
                order_payload = {
                    "customer_name": cname,
                    "items": [{
                        "product_id": p["id"], "product_name": p["name"],
                        "product_price": float(p["price"]), "quantity": 1,
                        "selected_options": [], "subtotal": float(p["price"]),
                    }],
                    "subtotal": total, "tip": 0.0, "total": total,
                    "payment_method": "cash",
                    "amount_received": amount_received, "change": change,
                }

                def _post():
                    return requests.post(f"{BASE_URL}/api/orders", headers=headers, json=order_payload, timeout=20)

                # Fire the POST after we're listening
                loop = asyncio.get_event_loop()
                fut = loop.run_in_executor(None, _post)

                evt = await drain_until(
                    ws_display,
                    lambda m: m.get("type") == "order.created" and (m.get("data") or {}).get("customer_name") == cname,
                    timeout=10,
                )
                d = evt["data"]
                assert d.get("amount_received") == amount_received, f"WS missing amount_received: {d}"
                assert d.get("change") == change, f"WS missing change: {d}"
                assert d.get("payment_method") == "cash"

                resp = await fut
                assert resp.status_code in (200, 201)

        asyncio.get_event_loop().run_until_complete(_run())
