"""KDS (Kitchen Display System) feature tests.

Covers:
- Order model has kds_status default 'new' + kds_updated_at
- GET /orders/kds/board returns only today's orders != completed, sorted asc
- PUT /orders/{id}/kds-status happy path + 400 invalid + 404 not found
- WS broadcast 'order.kds_status' to tenant on update
- Tenancy: restaurant A cannot see/update B's orders
"""

import os
import json
import asyncio
import uuid
import pytest
import requests
import websockets

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
WS_BASE = BASE_URL.replace("http", "ws", 1) + "/api/ws"

EMAIL_A = "said95454@gmail.com"
PASSWORD_A = "pos12345"
EMAIL_B = "demo@restaurant.com"
PASSWORD_B = "pos12345"


# ============ Helpers ============
def login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/restaurant/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def auth_headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def create_order(token, name_suffix=None):
    suffix = name_suffix or uuid.uuid4().hex[:6]
    payload = {
        "customer_name": f"TEST_KDS_{suffix}",
        "items": [{"product_id": "p1", "product_name": "Item KDS", "quantity": 2, "product_price": 25, "subtotal": 50}],
        "subtotal": 50,
        "tip": 0,
        "total": 50,
        "payment_method": "cash",
    }
    r = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=auth_headers(token), timeout=15)
    assert r.status_code in (200, 201), f"create order: {r.status_code} {r.text}"
    return r.json()


async def drain_until(ws, predicate, timeout=8.0):
    end = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = end - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise asyncio.TimeoutError("predicate not satisfied")
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        msg = json.loads(raw)
        if predicate(msg):
            return msg


# ============ Fixtures ============
@pytest.fixture(scope="module")
def token_a():
    return login(EMAIL_A, PASSWORD_A)


@pytest.fixture(scope="module")
def token_b():
    return login(EMAIL_B, PASSWORD_B)


# ============ Order creation → default kds_status='new' ============
class TestOrderKdsDefault:
    def test_order_created_has_kds_status_new(self, token_a):
        order = create_order(token_a)
        # POST response may or may not include kds_status; verify via GET board
        assert order.get("id")
        # Get board, verify present with kds_status new
        r = requests.get(f"{BASE_URL}/api/orders/kds/board", headers=auth_headers(token_a), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        found = next((o for o in rows if o["id"] == order["id"]), None)
        assert found is not None, f"created order not in kds board"
        assert found.get("kds_status") == "new"

    def test_post_orders_does_not_require_kds_status(self, token_a):
        # Ensure no 422 when we omit kds_status (the previous test already does that; assert schema is not strict)
        order = create_order(token_a, name_suffix="noreq")
        assert order.get("id")


# ============ GET board ordering + filter ============
class TestKdsBoard:
    def test_board_excludes_completed_and_sorts_asc(self, token_a):
        # Create two orders, mark one as completed
        o1 = create_order(token_a, "board1")
        o2 = create_order(token_a, "board2")
        # Complete o1
        r = requests.put(
            f"{BASE_URL}/api/orders/{o1['id']}/kds-status",
            json={"kds_status": "completed"},
            headers=auth_headers(token_a),
            timeout=15,
        )
        assert r.status_code == 200
        # Fetch board
        r = requests.get(f"{BASE_URL}/api/orders/kds/board", headers=auth_headers(token_a), timeout=15)
        assert r.status_code == 200
        rows = r.json()
        ids = [o["id"] for o in rows]
        assert o1["id"] not in ids, "completed order should be excluded"
        assert o2["id"] in ids, "non-completed order should be present"
        # Verify created_at sort ascending
        created_ats = [o.get("created_at") for o in rows if o.get("created_at")]
        assert created_ats == sorted(created_ats), "board must be sorted by created_at asc"
        # Backfill: every row must have kds_status
        for o in rows:
            assert o.get("kds_status") in ("new", "preparing", "ready"), o


# ============ PUT kds-status ============
class TestKdsStatusUpdate:
    def test_update_valid_status(self, token_a):
        o = create_order(token_a, "update_ok")
        for st in ["preparing", "ready", "new"]:
            r = requests.put(
                f"{BASE_URL}/api/orders/{o['id']}/kds-status",
                json={"kds_status": st},
                headers=auth_headers(token_a),
                timeout=15,
            )
            assert r.status_code == 200, f"status {st}: {r.status_code} {r.text}"
            assert r.json().get("kds_status") == st
            # Confirm persistence
            board = requests.get(f"{BASE_URL}/api/orders/kds/board", headers=auth_headers(token_a), timeout=15).json()
            found = next((x for x in board if x["id"] == o["id"]), None)
            assert found is not None
            assert found["kds_status"] == st

    def test_update_invalid_status_returns_400(self, token_a):
        o = create_order(token_a, "invalid")
        r = requests.put(
            f"{BASE_URL}/api/orders/{o['id']}/kds-status",
            json={"kds_status": "flying"},
            headers=auth_headers(token_a),
            timeout=15,
        )
        assert r.status_code == 400, f"expected 400, got {r.status_code} {r.text}"

    def test_update_missing_order_returns_404(self, token_a):
        r = requests.put(
            f"{BASE_URL}/api/orders/nonexistent-id-{uuid.uuid4().hex[:6]}/kds-status",
            json={"kds_status": "preparing"},
            headers=auth_headers(token_a),
            timeout=15,
        )
        assert r.status_code == 404, f"expected 404, got {r.status_code} {r.text}"


# ============ Realtime broadcast ============
class TestKdsRealtimeBroadcast:
    def test_ws_emits_order_kds_status(self, token_a):
        async def _run():
            # Create order first (before WS to avoid ordering noise)
            o = create_order(token_a, "ws")
            url = f"{WS_BASE}?token={token_a}"
            async with websockets.connect(url, open_timeout=10) as ws:
                await drain_until(ws, lambda m: m.get("type") == "presence", timeout=8)
                # Trigger status update via REST
                r = requests.put(
                    f"{BASE_URL}/api/orders/{o['id']}/kds-status",
                    json={"kds_status": "preparing"},
                    headers=auth_headers(token_a),
                    timeout=15,
                )
                assert r.status_code == 200
                # Expect WS broadcast
                evt = await drain_until(ws, lambda m: m.get("type") == "order.kds_status", timeout=10)
                data = evt.get("data") or {}
                assert data.get("id") == o["id"]
                assert data.get("kds_status") == "preparing"
        asyncio.new_event_loop().run_until_complete(_run())


# ============ Tenancy isolation ============
class TestKdsTenancy:
    def test_other_tenant_cannot_see_or_update(self, token_a, token_b):
        # Create order in tenant A
        o = create_order(token_a, "tenancy")
        # Tenant B's board must not contain this order
        r = requests.get(f"{BASE_URL}/api/orders/kds/board", headers=auth_headers(token_b), timeout=15)
        assert r.status_code == 200
        b_ids = [x["id"] for x in r.json()]
        assert o["id"] not in b_ids, "A's order leaked to B's board"
        # Tenant B trying to update A's order → 404
        r = requests.put(
            f"{BASE_URL}/api/orders/{o['id']}/kds-status",
            json={"kds_status": "preparing"},
            headers=auth_headers(token_b),
            timeout=15,
        )
        assert r.status_code == 404, f"cross-tenant update should be 404, got {r.status_code}"
