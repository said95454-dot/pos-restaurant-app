"""
Backend tests for the 'Configurable Tips per Cashier' feature.
Covers: Business.default_tip_percent (global), Cashier.default_tip_percent (override),
Order with tip+subtotal, stats/daily total_tips, stats/cashier-tips ranking,
and legacy regression (orders without tip).
"""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback to frontend/.env file (sub-shell does not auto-load it)
    from pathlib import Path
    env_path = Path("/app/frontend/.env")
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
                break

EMAIL = "said95454@gmail.com"
PASSWORD = "pos12345"


# -------- Fixtures --------
@pytest.fixture(scope="session")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def token(api):
    r = api.post(f"{BASE_URL}/api/auth/restaurant/login",
                 json={"email": EMAIL, "password": PASSWORD}, timeout=15)
    assert r.status_code == 200, f"login failed {r.status_code} {r.text}"
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth(api, token):
    api.headers.update({"Authorization": f"Bearer {token}"})
    return api


# -------- Business default_tip_percent --------
class TestBusinessTip:
    def test_business_has_default_tip_field(self, auth):
        r = auth.get(f"{BASE_URL}/api/business", timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        # Critical: the new feature requires this field on Business
        assert "default_tip_percent" in data, (
            f"Business response is missing 'default_tip_percent'. Keys: {list(data.keys())}"
        )

    def test_update_business_default_tip(self, auth):
        r = auth.put(f"{BASE_URL}/api/business",
                     json={"default_tip_percent": 15}, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "default_tip_percent" in data, "PUT response missing default_tip_percent"
        assert data["default_tip_percent"] == 15, (
            f"PUT did not persist default_tip_percent. Got: {data.get('default_tip_percent')}"
        )

        # Reload
        r2 = auth.get(f"{BASE_URL}/api/business", timeout=10)
        assert r2.json().get("default_tip_percent") == 15, (
            "GET after PUT does not return 15"
        )


# -------- Cashier default_tip_percent --------
class TestCashierTip:
    created_id = None

    def test_create_cashier_with_tip(self, auth):
        name = f"TEST_tip_cashier_{int(time.time())}"
        r = auth.post(f"{BASE_URL}/api/cashiers",
                      json={"name": name, "pin": "9876",
                            "default_tip_percent": 20}, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert "id" in data
        TestCashierTip.created_id = data["id"]

        # Verify via list
        r2 = auth.get(f"{BASE_URL}/api/cashiers", timeout=10)
        assert r2.status_code == 200
        match = [c for c in r2.json() if c["id"] == data["id"]]
        assert match, "Newly created cashier not returned"
        assert "default_tip_percent" in match[0], (
            f"Cashier list does not include default_tip_percent. Keys: {list(match[0].keys())}"
        )
        assert match[0]["default_tip_percent"] == 20, (
            f"Cashier default_tip_percent not persisted on create. Got: {match[0].get('default_tip_percent')}"
        )

    def test_update_cashier_tip(self, auth):
        assert TestCashierTip.created_id, "previous test didn't create cashier"
        cid = TestCashierTip.created_id
        # Update to 10
        r = auth.put(f"{BASE_URL}/api/cashiers/{cid}",
                     json={"default_tip_percent": 10}, timeout=10)
        assert r.status_code == 200, r.text
        # Verify
        lst = auth.get(f"{BASE_URL}/api/cashiers", timeout=10).json()
        match = [c for c in lst if c["id"] == cid][0]
        assert match["default_tip_percent"] == 10, (
            f"PUT did not change default_tip_percent. Still: {match.get('default_tip_percent')}"
        )

        # Update other fields untouched: change name only -> tip stays 10
        r = auth.put(f"{BASE_URL}/api/cashiers/{cid}",
                     json={"name": match["name"] + "_x"}, timeout=10)
        assert r.status_code == 200
        lst = auth.get(f"{BASE_URL}/api/cashiers", timeout=10).json()
        match2 = [c for c in lst if c["id"] == cid][0]
        assert match2["default_tip_percent"] == 10, (
            f"Updating name should NOT clobber default_tip_percent. Got: {match2.get('default_tip_percent')}"
        )

        # Update to null (clear) — explicit null support via exclude_unset
        r = auth.put(f"{BASE_URL}/api/cashiers/{cid}",
                     json={"default_tip_percent": None}, timeout=10)
        assert r.status_code == 200
        lst = auth.get(f"{BASE_URL}/api/cashiers", timeout=10).json()
        match3 = [c for c in lst if c["id"] == cid][0]
        assert match3.get("default_tip_percent") is None, (
            f"PUT null should clear default_tip_percent. Got: {match3.get('default_tip_percent')}"
        )

    def test_cleanup_cashier(self, auth):
        if TestCashierTip.created_id:
            auth.delete(f"{BASE_URL}/api/cashiers/{TestCashierTip.created_id}", timeout=10)


# -------- Order with tip + Stats --------
class TestOrderTipAndStats:
    order_id = None
    today = time.strftime("%Y-%m-%d")

    def _item(self, qty=1):
        return {
            "product_id": "PID_TEST",
            "product_name": "TEST_TipItem",
            "product_price": 100.0,
            "quantity": qty,
            "selected_options": [],
            "subtotal": 100.0 * qty,
        }

    def test_create_order_with_tip(self, auth):
        payload = {
            "customer_name": "TEST_TipCust",
            "items": [self._item(1)],
            "subtotal": 100.0,
            "tip": 15.0,
            "total": 115.0,
            "payment_method": "cash",
            "amount_received": 120.0,
            "change": 5.0,
            "cashier_id": "test-cashier-tip",
            "cashier_name": "TEST_CashierTip",
        }
        r = auth.post(f"{BASE_URL}/api/orders", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["tip"] == 15.0, f"tip not persisted: {data}"
        assert data["subtotal"] == 100.0, f"subtotal not persisted: {data}"
        assert data["total"] == 115.0
        TestOrderTipAndStats.order_id = data["id"]

    def test_get_orders_returns_tip(self, auth):
        r = auth.get(f"{BASE_URL}/api/orders", timeout=10)
        assert r.status_code == 200
        match = [o for o in r.json() if o.get("id") == TestOrderTipAndStats.order_id]
        assert match, "Order not in /api/orders"
        assert match[0].get("tip") == 15.0
        assert match[0].get("subtotal") == 100.0

    def test_stats_daily_includes_total_tips(self, auth):
        r = auth.get(f"{BASE_URL}/api/stats/daily",
                     params={"date_str": TestOrderTipAndStats.today}, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "total_tips" in d, f"stats/daily missing total_tips: {d}"
        assert d["total_tips"] >= 15.0, (
            f"total_tips should be >=15 (we added a $15 tip). Got: {d['total_tips']}"
        )

    def test_stats_cashier_tips_ranking(self, auth):
        r = auth.get(f"{BASE_URL}/api/stats/cashier-tips",
                     params={"date_str": TestOrderTipAndStats.today}, timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "ranking" in d, f"endpoint missing 'ranking': {d}"
        # Sorted desc?
        tips = [r_["total_tips"] for r_ in d["ranking"]]
        assert tips == sorted(tips, reverse=True), f"ranking not sorted desc: {tips}"
        # Our test cashier should appear
        ours = [r_ for r_ in d["ranking"] if r_["cashier_id"] == "test-cashier-tip"]
        assert ours, f"Test cashier 'test-cashier-tip' missing from ranking: {d['ranking']}"
        assert ours[0]["total_tips"] >= 15.0

    def test_legacy_order_without_tip(self, auth):
        """Regression: POST orders without tip defaults to 0."""
        payload = {
            "customer_name": "TEST_LegacyNoTip",
            "items": [self._item(1)],
            "total": 100.0,
            "payment_method": "card",
        }
        r = auth.post(f"{BASE_URL}/api/orders", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["tip"] == 0.0
        assert data["total"] == 100.0

    def test_legacy_order_without_subtotal_auto_derived(self, auth):
        """FIX #3: POST without subtotal must auto-derive subtotal=total-tip and return 200."""
        payload = {
            "customer_name": "TEST_LegacyNoSubtotal",
            "items": [self._item(1)],
            "total": 110.0,
            "tip": 10.0,
            "payment_method": "card",
            # subtotal intentionally omitted (legacy / offline-queued payload)
        }
        r = auth.post(f"{BASE_URL}/api/orders", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["tip"] == 10.0
        assert data["total"] == 110.0
        assert data["subtotal"] == 100.0, (
            f"subtotal should be auto-derived as total-tip=100.0. Got: {data.get('subtotal')}"
        )

    def test_order_with_subtotal_preserved_verbatim(self, auth):
        """When subtotal is supplied, it must NOT be overwritten by auto-derive."""
        payload = {
            "customer_name": "TEST_SubtotalProvided",
            "items": [self._item(2)],
            "subtotal": 200.0,  # explicit
            "tip": 30.0,
            "total": 230.0,
            "payment_method": "cash",
        }
        r = auth.post(f"{BASE_URL}/api/orders", json=payload, timeout=10)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["subtotal"] == 200.0
        assert data["tip"] == 30.0
        assert data["total"] == 230.0

    def test_cleanup_orders(self, auth):
        # Orders are persistent; we leave them for audit. Tagged with TEST_ prefix on customer.
        pass


# -------- Regression: Other endpoints unchanged --------
class TestRegression:
    def test_products(self, auth):
        r = auth.get(f"{BASE_URL}/api/products", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_cashiers_list(self, auth):
        r = auth.get(f"{BASE_URL}/api/cashiers", timeout=10)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_restaurant_login_still_works(self, api):
        r = api.post(f"{BASE_URL}/api/auth/restaurant/login",
                     json={"email": EMAIL, "password": PASSWORD}, timeout=10)
        assert r.status_code == 200
        assert "access_token" in r.json()
