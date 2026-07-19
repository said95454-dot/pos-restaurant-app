"""Tables (Sala) feature — Fase A backend tests.

Coverage:
- CRUD /api/tables (list sorted by number asc, POST duplicate → 400, PUT, DELETE state-guarded)
- State machine: open/close/reserve/unreserve/bill and their guards
- Order↔Table binding: POST /api/orders with table_id auto-marks table 'billed' + current_order_id
- Tenancy isolation (restaurant A cannot mutate tables of restaurant B)
- Realtime WS emit for 'table.billed' when creating an order bound to a table
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
    r = requests.post(
        f"{BASE_URL}/api/auth/restaurant/login",
        json={"email": email, "password": password},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    return r.json()["access_token"]


def auth(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _next_number(token):
    """Return a table number that doesn't exist yet for this tenant."""
    r = requests.get(f"{BASE_URL}/api/tables", headers=auth(token), timeout=15)
    r.raise_for_status()
    used = {t.get("number") for t in r.json()}
    n = 100
    while n in used:
        n += 1
    return n


def _cleanup_table(token, table_id):
    try:
        # ensure free before delete
        requests.put(f"{BASE_URL}/api/tables/{table_id}/close", headers=auth(token), timeout=10)
        requests.delete(f"{BASE_URL}/api/tables/{table_id}", headers=auth(token), timeout=10)
    except Exception:
        pass


# ============ Fixtures ============
@pytest.fixture(scope="module")
def token_a():
    return login(EMAIL_A, PASSWORD_A)


@pytest.fixture(scope="module")
def token_b():
    return login(EMAIL_B, PASSWORD_B)


# ============ CRUD tests ============
class TestTablesCRUD:
    def test_create_table_and_list_sorted(self, token_a):
        n1 = _next_number(token_a)
        n2 = n1 + 5  # create in reverse order to test sorting
        r_high = requests.post(f"{BASE_URL}/api/tables", json={"number": n2, "capacity": 4}, headers=auth(token_a))
        assert r_high.status_code == 200, r_high.text
        tid2 = r_high.json()["id"]
        assert r_high.json()["status"] == "free"
        assert r_high.json()["capacity"] == 4

        r_low = requests.post(f"{BASE_URL}/api/tables", json={"number": n1, "capacity": 6}, headers=auth(token_a))
        assert r_low.status_code == 200, r_low.text
        tid1 = r_low.json()["id"]

        # GET returns list sorted by number asc — assert relative order
        r_list = requests.get(f"{BASE_URL}/api/tables", headers=auth(token_a))
        assert r_list.status_code == 200
        numbers = [t["number"] for t in r_list.json() if t["id"] in (tid1, tid2)]
        assert numbers == sorted(numbers), f"tables not sorted asc: {numbers}"
        assert numbers[0] == n1 and numbers[-1] == n2

        _cleanup_table(token_a, tid1)
        _cleanup_table(token_a, tid2)

    def test_create_duplicate_number_returns_400(self, token_a):
        n = _next_number(token_a)
        r1 = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 2}, headers=auth(token_a))
        assert r1.status_code == 200
        tid = r1.json()["id"]
        try:
            r2 = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 8}, headers=auth(token_a))
            assert r2.status_code == 400, r2.text
        finally:
            _cleanup_table(token_a, tid)

    def test_update_table(self, token_a):
        n = _next_number(token_a)
        r = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 2}, headers=auth(token_a))
        tid = r.json()["id"]
        try:
            new_n = n + 50
            up = requests.put(
                f"{BASE_URL}/api/tables/{tid}",
                json={"number": new_n, "capacity": 10},
                headers=auth(token_a),
            )
            assert up.status_code == 200, up.text
            # GET to verify persistence
            listed = requests.get(f"{BASE_URL}/api/tables", headers=auth(token_a)).json()
            match = [t for t in listed if t["id"] == tid][0]
            assert match["number"] == new_n
            assert match["capacity"] == 10
        finally:
            _cleanup_table(token_a, tid)

    def test_delete_respects_status(self, token_a):
        n = _next_number(token_a)
        r = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 2}, headers=auth(token_a))
        tid = r.json()["id"]
        # open the table -> occupied
        op = requests.put(
            f"{BASE_URL}/api/tables/{tid}/open",
            json={"waiter_name": "Test Waiter"},
            headers=auth(token_a),
        )
        assert op.status_code == 200
        # DELETE occupied -> 400
        d = requests.delete(f"{BASE_URL}/api/tables/{tid}", headers=auth(token_a))
        assert d.status_code == 400, d.text
        # close then delete OK
        cl = requests.put(f"{BASE_URL}/api/tables/{tid}/close", headers=auth(token_a))
        assert cl.status_code == 200
        d2 = requests.delete(f"{BASE_URL}/api/tables/{tid}", headers=auth(token_a))
        assert d2.status_code == 200


# ============ State Machine tests ============
class TestTableStateMachine:
    def test_open_sets_occupied_and_waiter(self, token_a):
        n = _next_number(token_a)
        r = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 4}, headers=auth(token_a))
        tid = r.json()["id"]
        try:
            op = requests.put(
                f"{BASE_URL}/api/tables/{tid}/open",
                json={"waiter_id": "w1", "waiter_name": "Mario"},
                headers=auth(token_a),
            )
            assert op.status_code == 200, op.text
            body = op.json()
            assert body["status"] == "occupied"
            assert body["waiter_name"] == "Mario"
            assert body["waiter_id"] == "w1"
            assert body["opened_at"] is not None
            # opening an occupied table -> 400
            op2 = requests.put(
                f"{BASE_URL}/api/tables/{tid}/open",
                json={"waiter_name": "Mario"},
                headers=auth(token_a),
            )
            assert op2.status_code == 400
        finally:
            _cleanup_table(token_a, tid)

    def test_close_resets_fields(self, token_a):
        n = _next_number(token_a)
        r = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 4}, headers=auth(token_a))
        tid = r.json()["id"]
        try:
            requests.put(f"{BASE_URL}/api/tables/{tid}/open", json={"waiter_name": "Ana"}, headers=auth(token_a))
            cl = requests.put(f"{BASE_URL}/api/tables/{tid}/close", headers=auth(token_a))
            assert cl.status_code == 200
            listed = requests.get(f"{BASE_URL}/api/tables", headers=auth(token_a)).json()
            match = [t for t in listed if t["id"] == tid][0]
            assert match["status"] == "free"
            assert match.get("waiter_name") is None
            assert match.get("opened_at") is None
            assert match.get("current_order_id") is None
        finally:
            _cleanup_table(token_a, tid)

    def test_reserve_and_unreserve(self, token_a):
        n = _next_number(token_a)
        r = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 4}, headers=auth(token_a))
        tid = r.json()["id"]
        try:
            rv = requests.put(
                f"{BASE_URL}/api/tables/{tid}/reserve",
                json={"reserved_for": "Cliente TEST"},
                headers=auth(token_a),
            )
            assert rv.status_code == 200, rv.text
            listed = requests.get(f"{BASE_URL}/api/tables", headers=auth(token_a)).json()
            match = [t for t in listed if t["id"] == tid][0]
            assert match["status"] == "reserved"
            assert match["reserved_for"] == "Cliente TEST"

            un = requests.put(f"{BASE_URL}/api/tables/{tid}/unreserve", headers=auth(token_a))
            assert un.status_code == 200
            listed = requests.get(f"{BASE_URL}/api/tables", headers=auth(token_a)).json()
            match = [t for t in listed if t["id"] == tid][0]
            assert match["status"] == "free"
            assert match.get("reserved_for") is None
        finally:
            _cleanup_table(token_a, tid)

    def test_bill_endpoint(self, token_a):
        n = _next_number(token_a)
        r = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 4}, headers=auth(token_a))
        tid = r.json()["id"]
        try:
            requests.put(f"{BASE_URL}/api/tables/{tid}/open", json={"waiter_name": "X"}, headers=auth(token_a))
            b = requests.put(f"{BASE_URL}/api/tables/{tid}/bill", headers=auth(token_a))
            assert b.status_code == 200
            listed = requests.get(f"{BASE_URL}/api/tables", headers=auth(token_a)).json()
            match = [t for t in listed if t["id"] == tid][0]
            assert match["status"] == "billed"
        finally:
            _cleanup_table(token_a, tid)


# ============ Order ↔ Table integration ============
class TestOrderTableBinding:
    def test_order_with_table_id_marks_table_billed(self, token_a):
        n = _next_number(token_a)
        r = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 4}, headers=auth(token_a))
        tid = r.json()["id"]
        tnum = r.json()["number"]
        try:
            # open first
            requests.put(f"{BASE_URL}/api/tables/{tid}/open", json={"waiter_name": "Wtr"}, headers=auth(token_a))
            payload = {
                "customer_name": f"TEST_TBL_{uuid.uuid4().hex[:6]}",
                "items": [{"product_id": "p1", "product_name": "Coffee", "quantity": 1, "product_price": 30, "subtotal": 30}],
                "subtotal": 30,
                "tip": 0,
                "total": 30,
                "payment_method": "cash",
                "table_id": tid,
                "table_number": tnum,
            }
            ro = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=auth(token_a))
            assert ro.status_code == 200, ro.text
            body = ro.json()
            assert body["table_id"] == tid
            assert body["table_number"] == tnum
            order_id = body["id"]
            # Verify table is billed and current_order_id set
            listed = requests.get(f"{BASE_URL}/api/tables", headers=auth(token_a)).json()
            match = [t for t in listed if t["id"] == tid][0]
            assert match["status"] == "billed"
            assert match["current_order_id"] == order_id
        finally:
            _cleanup_table(token_a, tid)

    def test_tenancy_isolation_a_cannot_touch_b(self, token_a, token_b):
        # create in B
        n_b = _next_number(token_b)
        r = requests.post(f"{BASE_URL}/api/tables", json={"number": n_b, "capacity": 4}, headers=auth(token_b))
        assert r.status_code == 200
        tid = r.json()["id"]
        try:
            # A tries to update / open / delete B's table -> 404
            up = requests.put(f"{BASE_URL}/api/tables/{tid}", json={"capacity": 999}, headers=auth(token_a))
            assert up.status_code == 404
            op = requests.put(
                f"{BASE_URL}/api/tables/{tid}/open",
                json={"waiter_name": "Intruder"},
                headers=auth(token_a),
            )
            assert op.status_code == 404
            de = requests.delete(f"{BASE_URL}/api/tables/{tid}", headers=auth(token_a))
            assert de.status_code == 404
            # A's list must NOT contain B's table id
            listed_a = requests.get(f"{BASE_URL}/api/tables", headers=auth(token_a)).json()
            assert not any(t["id"] == tid for t in listed_a)
        finally:
            _cleanup_table(token_b, tid)


# ============ Realtime WS ============
async def _drain_until(ws, predicate, timeout=8.0):
    end = asyncio.get_event_loop().time() + timeout
    while True:
        remaining = end - asyncio.get_event_loop().time()
        if remaining <= 0:
            raise asyncio.TimeoutError("predicate not satisfied")
        raw = await asyncio.wait_for(ws.recv(), timeout=remaining)
        try:
            msg = json.loads(raw)
        except Exception:
            continue
        if predicate(msg):
            return msg


@pytest.mark.asyncio
async def test_ws_emits_table_billed_on_order_creation(token_a):
    n = _next_number(token_a)
    r = requests.post(f"{BASE_URL}/api/tables", json={"number": n, "capacity": 4}, headers=auth(token_a))
    tid = r.json()["id"]
    tnum = r.json()["number"]
    try:
        requests.put(f"{BASE_URL}/api/tables/{tid}/open", json={"waiter_name": "WS"}, headers=auth(token_a))
        ws_url = f"{WS_BASE}?token={token_a}"
        async with websockets.connect(ws_url, ping_interval=None) as ws:
            # trigger order creation
            payload = {
                "customer_name": f"TEST_WS_{uuid.uuid4().hex[:6]}",
                "items": [{"product_id": "p1", "product_name": "X", "quantity": 1, "product_price": 10, "subtotal": 10}],
                "subtotal": 10, "tip": 0, "total": 10, "payment_method": "cash",
                "table_id": tid, "table_number": tnum,
            }
            r_order = requests.post(f"{BASE_URL}/api/orders", json=payload, headers=auth(token_a))
            assert r_order.status_code == 200
            msg = await _drain_until(
                ws,
                lambda m: m.get("type") == "table.billed" and (m.get("data") or {}).get("id") == tid,
                timeout=8.0,
            )
            assert msg["data"]["id"] == tid
            assert "current_order_id" in msg["data"]
    finally:
        _cleanup_table(token_a, tid)
