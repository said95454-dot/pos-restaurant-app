"""Backend API regression tests for multi-tenant POS Restaurant app."""
import os
import uuid
from datetime import datetime, timezone

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://c641ddae-2ee0-4a6a-baba-a77b412cb102.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@restaurant.com"
DEMO_PASSWORD = "demo1234"


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def demo_token(s):
    r = s.post(f"{API}/auth/restaurant/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    if r.status_code != 200:
        # Try register
        rr = s.post(f"{API}/auth/restaurant/register",
                    json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD, "restaurant_name": "Restaurante Demo"})
        assert rr.status_code in (200, 400)
        r = s.post(f"{API}/auth/restaurant/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def auth_headers(demo_token):
    return {"Authorization": f"Bearer {demo_token}"}


# ===== Health =====
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert "message" in r.json()


# ===== Auth =====
class TestAuth:
    def test_register_new_restaurant(self, s):
        email = f"TEST_{uuid.uuid4().hex[:8]}@test.com"
        r = s.post(f"{API}/auth/restaurant/register",
                   json={"email": email, "password": "test1234", "restaurant_name": "Test Resto"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "access_token" in data
        assert data["email"] == email.lower()
        assert data["restaurant_name"] == "Test Resto"

    def test_register_duplicate_fails(self, s):
        r = s.post(f"{API}/auth/restaurant/register",
                   json={"email": DEMO_EMAIL, "password": "x", "restaurant_name": "x"})
        assert r.status_code == 400

    def test_login_demo(self, s):
        r = s.post(f"{API}/auth/restaurant/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD})
        assert r.status_code == 200
        assert "access_token" in r.json()

    def test_login_invalid(self, s):
        r = s.post(f"{API}/auth/restaurant/login", json={"email": DEMO_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me(self, s, auth_headers):
        r = s.get(f"{API}/auth/me", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_me_no_token(self, s):
        r = s.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_forgot_password(self, s):
        r = s.post(f"{API}/auth/forgot-password", json={"email": DEMO_EMAIL})
        assert r.status_code == 200
        assert "message" in r.json()

    def test_forgot_password_unknown(self, s):
        r = s.post(f"{API}/auth/forgot-password", json={"email": "nonexistent_xyz@test.com"})
        assert r.status_code == 200  # generic message

    def test_reset_password_invalid_token(self, s):
        r = s.post(f"{API}/auth/reset-password", json={"token": "INVALID0", "new_password": "newpass1"})
        assert r.status_code == 400


# ===== Business =====
class TestBusiness:
    def test_get_business(self, s, auth_headers):
        r = s.get(f"{API}/business", headers=auth_headers)
        assert r.status_code == 200
        assert "name" in r.json()

    def test_update_business(self, s, auth_headers):
        new_name = f"Demo Resto {uuid.uuid4().hex[:4]}"
        r = s.put(f"{API}/business", headers=auth_headers, json={"name": new_name})
        assert r.status_code == 200
        assert r.json()["name"] == new_name
        # Verify persistence
        r2 = s.get(f"{API}/business", headers=auth_headers)
        assert r2.json()["name"] == new_name


# ===== Products =====
class TestProducts:
    def test_product_crud(self, s, auth_headers):
        # Create
        payload = {"name": "TEST_Taco", "price": 25.5, "category": "comida",
                   "custom_options": ["con cebolla", "con cilantro"]}
        r = s.post(f"{API}/products", headers=auth_headers, json=payload)
        assert r.status_code == 200, r.text
        prod = r.json()
        assert prod["name"] == "TEST_Taco"
        assert prod["price"] == 25.5
        assert prod["custom_options"] == ["con cebolla", "con cilantro"]
        pid = prod["id"]

        # GET single
        r = s.get(f"{API}/products/{pid}", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["id"] == pid

        # List
        r = s.get(f"{API}/products", headers=auth_headers)
        assert r.status_code == 200
        assert any(p["id"] == pid for p in r.json())

        # Update
        r = s.put(f"{API}/products/{pid}", headers=auth_headers, json={"price": 30.0})
        assert r.status_code == 200
        assert r.json()["price"] == 30.0

        # Delete
        r = s.delete(f"{API}/products/{pid}", headers=auth_headers)
        assert r.status_code == 200

        # 404 after delete
        r = s.get(f"{API}/products/{pid}", headers=auth_headers)
        assert r.status_code == 404

    def test_products_unauthorized(self, s):
        r = s.get(f"{API}/products")
        assert r.status_code == 401


# ===== Orders =====
class TestOrders:
    def test_create_order_and_list(self, s, auth_headers):
        # Create a product first
        r = s.post(f"{API}/products", headers=auth_headers,
                   json={"name": "TEST_Burger", "price": 100.0, "category": "comida"})
        pid = r.json()["id"]

        order_payload = {
            "customer_name": "TEST_Customer",
            "items": [{
                "product_id": pid, "product_name": "TEST_Burger",
                "product_price": 100.0, "quantity": 2, "selected_options": [],
                "subtotal": 200.0
            }],
            "total": 200.0,
            "payment_method": "cash",
            "amount_received": 250.0,
            "change": 50.0,
        }
        r = s.post(f"{API}/orders", headers=auth_headers, json=order_payload)
        assert r.status_code == 200, r.text
        order = r.json()
        assert order["total"] == 200.0
        assert order["change"] == 50.0
        oid = order["id"]

        # List orders by date
        today = datetime.utcnow().strftime("%Y-%m-%d")
        r = s.get(f"{API}/orders", headers=auth_headers, params={"date_filter": today})
        assert r.status_code == 200
        assert any(o["id"] == oid for o in r.json())

        # Cleanup
        s.delete(f"{API}/products/{pid}", headers=auth_headers)


# ===== Stats =====
class TestStats:
    def test_daily(self, s, auth_headers):
        r = s.get(f"{API}/stats/daily", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        for k in ("date", "total_orders", "total_sales", "cash_sales", "card_sales", "transfer_sales"):
            assert k in d

    def test_range(self, s, auth_headers):
        today = datetime.utcnow().strftime("%Y-%m-%d")
        r = s.get(f"{API}/stats/range", headers=auth_headers,
                  params={"start_date": today, "end_date": today})
        assert r.status_code == 200
        assert "daily_stats" in r.json()

    def test_top_products(self, s, auth_headers):
        r = s.get(f"{API}/stats/top-products", headers=auth_headers, params={"limit": 5})
        assert r.status_code == 200
        assert "top_products" in r.json()


# ===== Cashiers =====
class TestCashiers:
    def test_cashier_crud_and_login(self, s, auth_headers):
        name = f"TEST_Cajero_{uuid.uuid4().hex[:4]}"
        pin = "9182"
        r = s.post(f"{API}/cashiers", headers=auth_headers,
                   json={"name": name, "pin": pin, "password": "cashpass1"})
        assert r.status_code == 200, r.text
        cid = r.json()["id"]

        # List
        r = s.get(f"{API}/cashiers", headers=auth_headers)
        assert r.status_code == 200
        cashier = next((c for c in r.json() if c["id"] == cid), None)
        assert cashier is not None
        assert cashier["has_pin"] is True
        assert cashier["has_password"] is True

        # Login by PIN
        r = s.post(f"{API}/cashiers/login", headers=auth_headers, json={"pin": pin})
        assert r.status_code == 200
        assert r.json()["cashier_id"] == cid

        # Login by password
        r = s.post(f"{API}/cashiers/login", headers=auth_headers,
                   json={"cashier_id": cid, "password": "cashpass1"})
        assert r.status_code == 200

        # Wrong pin
        r = s.post(f"{API}/cashiers/login", headers=auth_headers, json={"pin": "0000"})
        assert r.status_code == 401

        # Update
        r = s.put(f"{API}/cashiers/{cid}", headers=auth_headers, json={"active": False})
        assert r.status_code == 200

        # Delete
        r = s.delete(f"{API}/cashiers/{cid}", headers=auth_headers)
        assert r.status_code == 200


# ===== Cash Register =====
class TestCashRegister:
    def test_close_and_get(self, s, auth_headers):
        # Use a unique past date to avoid collisions
        unique_date = f"2099-{datetime.utcnow().strftime('%m')}-{uuid.uuid4().hex[:2]}"
        # Build a valid YYYY-MM-DD; force day in 01-28
        unique_date = f"2099-01-{(int(uuid.uuid4().hex[:2], 16) % 28) + 1:02d}"

        payload = {
            "date": unique_date,
            "total_orders": 5,
            "total_sales": 500.0,
            "cash_sales": 300.0,
            "card_sales": 100.0,
            "transfer_sales": 100.0,
            "initial_cash": 100.0,
            "actual_cash": 405.0,
            "notes": "TEST",
            "closed_by": "tester",
        }
        r = s.post(f"{API}/cash-register/close", headers=auth_headers, json=payload)
        if r.status_code == 400:
            # Already exists - acceptable
            pass
        else:
            assert r.status_code == 200, r.text
            data = r.json()
            assert data["expected_cash"] == 400.0  # initial + cash_sales
            assert data["difference"] == 5.0  # actual - expected
            close_id = data["id"]

            # Get by date
            r = s.get(f"{API}/cash-register/close/{unique_date}", headers=auth_headers)
            assert r.status_code == 200
            assert r.json()["closed"] is True

            # List
            r = s.get(f"{API}/cash-register/closes", headers=auth_headers)
            assert r.status_code == 200
            assert isinstance(r.json(), list)

            # Cleanup
            s.delete(f"{API}/cash-register/close/{close_id}", headers=auth_headers)

    def test_close_get_no_close(self, s, auth_headers):
        r = s.get(f"{API}/cash-register/close/1900-01-01", headers=auth_headers)
        assert r.status_code == 200
        assert r.json()["closed"] is False


# ===== Multi-tenant isolation =====
class TestMultiTenantIsolation:
    def test_products_scoped_to_tenant(self, s, auth_headers):
        # Create another restaurant
        email = f"TEST_iso_{uuid.uuid4().hex[:6]}@test.com"
        r = s.post(f"{API}/auth/restaurant/register",
                   json={"email": email, "password": "p", "restaurant_name": "Iso"})
        assert r.status_code == 200
        other_token = r.json()["access_token"]
        other_headers = {"Authorization": f"Bearer {other_token}"}

        # Demo creates a product
        r = s.post(f"{API}/products", headers=auth_headers,
                   json={"name": "TEST_Iso_Prod", "price": 1})
        pid = r.json()["id"]

        # Other tenant should NOT see it
        r = s.get(f"{API}/products", headers=other_headers)
        assert r.status_code == 200
        assert not any(p["id"] == pid for p in r.json())

        # Other tenant cannot fetch by id
        r = s.get(f"{API}/products/{pid}", headers=other_headers)
        assert r.status_code == 404

        # Cleanup
        s.delete(f"{API}/products/{pid}", headers=auth_headers)


# ===== PWA =====
def test_manifest_accessible(s):
    r = s.get(f"{BASE_URL}/manifest.json")
    assert r.status_code == 200
    data = r.json()
    assert data["display"] == "standalone"
    assert "icons" in data
