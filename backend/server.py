from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, date
from passlib.context import CryptContext


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============= MODELS =============

# Business Settings
class Business(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    logo: Optional[str] = None  # base64 image

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None

# Product Models
class Product(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    image: Optional[str] = None  # base64 image
    category: str = "comida"  # comida, bebida
    custom_options: List[str] = []  # Lista de opciones personalizadas ["con cebolla", "con cilantro", etc]
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ProductCreate(BaseModel):
    name: str
    price: float
    image: Optional[str] = None
    category: str = "comida"
    custom_options: List[str] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    custom_options: Optional[List[str]] = None

# Order Models
class OrderItem(BaseModel):
    product_id: str
    product_name: str
    product_price: float
    quantity: int
    selected_options: List[str] = []  # Lista de opciones seleccionadas
    subtotal: float

class Order(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    items: List[OrderItem]
    total: float
    payment_method: str  # "cash", "card", "transfer"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    printed: bool = False
    date: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    cashier_id: Optional[str] = None
    cashier_name: Optional[str] = None

class OrderCreate(BaseModel):
    customer_name: str
    items: List[OrderItem]
    total: float
    payment_method: str
    cashier_id: Optional[str] = None
    cashier_name: Optional[str] = None

# User Models (Manager)
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    password_hash: str
    role: str = "manager"

class UserLogin(BaseModel):
    username: str
    password: str

class UserCreate(BaseModel):
    username: str
    password: str

# Cashier Models (Cajeros)
class Cashier(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    pin: Optional[str] = None  # PIN de 4 dígitos
    password_hash: Optional[str] = None  # Contraseña normal
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CashierCreate(BaseModel):
    name: str
    pin: Optional[str] = None
    password: Optional[str] = None

class CashierUpdate(BaseModel):
    name: Optional[str] = None
    pin: Optional[str] = None
    password: Optional[str] = None
    active: Optional[bool] = None

class CashierLogin(BaseModel):
    pin: Optional[str] = None
    password: Optional[str] = None
    cashier_id: Optional[str] = None

# Statistics Models
class DailySales(BaseModel):
    date: str
    total_orders: int
    total_sales: float
    cash_sales: float
    card_sales: float
    transfer_sales: float

# Cash Register Close (Corte de Caja) Model
class CashRegisterClose(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    close_time: datetime = Field(default_factory=datetime.utcnow)
    total_orders: int
    total_sales: float
    cash_sales: float
    card_sales: float
    transfer_sales: float
    initial_cash: float = 0.0  # Fondo de caja inicial
    expected_cash: float = 0.0  # Efectivo esperado (inicial + ventas en efectivo)
    actual_cash: float = 0.0  # Efectivo real contado
    difference: float = 0.0  # Diferencia (actual - esperado)
    notes: str = ""
    closed_by: str = ""

class CashRegisterCloseCreate(BaseModel):
    date: str
    total_orders: int
    total_sales: float
    cash_sales: float
    card_sales: float
    transfer_sales: float
    initial_cash: float = 0.0
    actual_cash: float = 0.0
    notes: str = ""
    closed_by: str = ""

# Top Selling Product Model
class TopProduct(BaseModel):
    product_name: str
    quantity_sold: int
    total_revenue: float


# ============= ROUTES =============

@api_router.get("/")
async def root():
    return {"message": "Food POS API"}

# ========= Business Routes =========
@api_router.get("/business", response_model=Business)
async def get_business():
    business = await db.business.find_one()
    if not business:
        # Create default business
        default_business = Business(name="Mi Negocio")
        await db.business.insert_one(default_business.dict())
        return default_business
    return Business(**business)

@api_router.put("/business", response_model=Business)
async def update_business(update: BusinessUpdate):
    business = await db.business.find_one()
    if not business:
        business = Business(name="Mi Negocio")
        await db.business.insert_one(business.dict())
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.business.update_one({}, {"$set": update_data})
    
    updated_business = await db.business.find_one()
    return Business(**updated_business)

# ========= Product Routes =========
@api_router.get("/products", response_model=List[Product])
async def get_products():
    products = await db.products.find().to_list(1000)
    return [Product(**product) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate):
    new_product = Product(**product.dict())
    await db.products.insert_one(new_product.dict())
    return new_product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, update: ProductUpdate):
    product = await db.products.find_one({"id": product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated_product = await db.products.find_one({"id": product_id})
    return Product(**updated_product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted successfully"}

# ========= Order Routes =========
@api_router.get("/orders")
async def get_orders(date_filter: Optional[str] = None, cashier_id: Optional[str] = None):
    query = {}
    if date_filter:
        query["date"] = date_filter
    if cashier_id:
        query["cashier_id"] = cashier_id
    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    
    # Convertir órdenes antiguas al nuevo formato
    result = []
    for order in orders:
        # Convertir items con selected_options dict al nuevo formato list
        if "items" in order:
            for item in order["items"]:
                if isinstance(item.get("selected_options"), dict):
                    # Convertir dict a list de opciones activas
                    item["selected_options"] = [k for k, v in item["selected_options"].items() if v]
        result.append(order)
    
    return result

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    new_order = Order(**order.dict())
    await db.orders.insert_one(new_order.dict())
    return new_order

@api_router.put("/orders/{order_id}/print")
async def mark_order_printed(order_id: str):
    result = await db.orders.update_one({"id": order_id}, {"$set": {"printed": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order marked as printed"}

# ========= User/Auth Routes =========
@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not pwd_context.verify(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    return {"message": "Login successful", "user_id": user["id"], "username": user["username"]}

@api_router.post("/auth/register", response_model=User)
async def register_user(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"username": user_data.username})
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Hash password
    hashed_password = pwd_context.hash(user_data.password)
    new_user = User(username=user_data.username, password_hash=hashed_password)
    await db.users.insert_one(new_user.dict())
    return new_user

@api_router.get("/auth/check-setup")
async def check_setup():
    user_count = await db.users.count_documents({})
    return {"has_manager": user_count > 0}

# ========= Statistics Routes =========
@api_router.get("/stats/daily", response_model=DailySales)
async def get_daily_sales(date_str: Optional[str] = None):
    if not date_str:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    orders = await db.orders.find({"date": date_str}).to_list(1000)
    
    total_orders = len(orders)
    total_sales = sum(order["total"] for order in orders)
    cash_sales = sum(order["total"] for order in orders if order["payment_method"] == "cash")
    card_sales = sum(order["total"] for order in orders if order["payment_method"] == "card")
    transfer_sales = sum(order["total"] for order in orders if order["payment_method"] == "transfer")
    
    return DailySales(
        date=date_str,
        total_orders=total_orders,
        total_sales=total_sales,
        cash_sales=cash_sales,
        card_sales=card_sales,
        transfer_sales=transfer_sales
    )

@api_router.get("/stats/range")
async def get_sales_range(start_date: str, end_date: str):
    orders = await db.orders.find({
        "date": {"$gte": start_date, "$lte": end_date}
    }).to_list(10000)
    
    # Group by date
    daily_stats = {}
    for order in orders:
        order_date = order["date"]
        if order_date not in daily_stats:
            daily_stats[order_date] = {
                "date": order_date,
                "total_orders": 0,
                "total_sales": 0.0,
                "cash_sales": 0.0,
                "card_sales": 0.0,
                "transfer_sales": 0.0
            }
        
        daily_stats[order_date]["total_orders"] += 1
        daily_stats[order_date]["total_sales"] += order["total"]
        
        if order["payment_method"] == "cash":
            daily_stats[order_date]["cash_sales"] += order["total"]
        elif order["payment_method"] == "card":
            daily_stats[order_date]["card_sales"] += order["total"]
        elif order["payment_method"] == "transfer":
            daily_stats[order_date]["transfer_sales"] += order["total"]
    
    return {"daily_stats": list(daily_stats.values())}

# ========= Top Products Route =========
@api_router.get("/stats/top-products")
async def get_top_products(date_str: Optional[str] = None, limit: int = 5):
    if not date_str:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    orders = await db.orders.find({"date": date_str}).to_list(10000)
    
    # Count products sold
    product_sales = {}
    for order in orders:
        for item in order.get("items", []):
            product_name = item.get("product_name", "Unknown")
            quantity = item.get("quantity", 1)
            subtotal = item.get("subtotal", 0)
            
            if product_name not in product_sales:
                product_sales[product_name] = {
                    "product_name": product_name,
                    "quantity_sold": 0,
                    "total_revenue": 0.0
                }
            
            product_sales[product_name]["quantity_sold"] += quantity
            product_sales[product_name]["total_revenue"] += subtotal
    
    # Sort by quantity sold and limit
    sorted_products = sorted(
        product_sales.values(),
        key=lambda x: x["quantity_sold"],
        reverse=True
    )[:limit]
    
    return {"top_products": sorted_products}

# ========= Cash Register Close (Corte de Caja) Routes =========
@api_router.post("/cash-register/close", response_model=CashRegisterClose)
async def close_cash_register(data: CashRegisterCloseCreate):
    # Check if there's already a close for this date
    existing = await db.cash_register_closes.find_one({"date": data.date})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un corte de caja para esta fecha")
    
    # Calculate expected and difference
    expected_cash = data.initial_cash + data.cash_sales
    difference = data.actual_cash - expected_cash
    
    new_close = CashRegisterClose(
        **data.dict(),
        expected_cash=expected_cash,
        difference=difference
    )
    
    await db.cash_register_closes.insert_one(new_close.dict())
    return new_close

@api_router.get("/cash-register/closes", response_model=List[CashRegisterClose])
async def get_cash_register_closes(limit: int = 30):
    closes = await db.cash_register_closes.find().sort("close_time", -1).to_list(limit)
    return [CashRegisterClose(**close) for close in closes]

@api_router.get("/cash-register/close/{date_str}")
async def get_cash_register_close(date_str: str):
    close = await db.cash_register_closes.find_one({"date": date_str})
    if not close:
        return {"closed": False}
    return {"closed": True, "data": CashRegisterClose(**close)}

@api_router.delete("/cash-register/close/{close_id}")
async def delete_cash_register_close(close_id: str):
    result = await db.cash_register_closes.delete_one({"id": close_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Corte de caja no encontrado")
    return {"message": "Corte de caja eliminado"}

# ========= Cashier (Cajeros) Routes =========
@api_router.get("/cashiers")
async def get_cashiers():
    cashiers = await db.cashiers.find().to_list(100)
    # No devolver password_hash ni pin por seguridad
    result = []
    for c in cashiers:
        result.append({
            "id": c["id"],
            "name": c["name"],
            "active": c.get("active", True),
            "has_pin": bool(c.get("pin")),
            "has_password": bool(c.get("password_hash")),
            "created_at": c.get("created_at")
        })
    return result

@api_router.post("/cashiers")
async def create_cashier(cashier: CashierCreate):
    # Verificar si ya existe un cajero con ese nombre
    existing = await db.cashiers.find_one({"name": cashier.name})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un cajero con ese nombre")
    
    new_cashier = Cashier(
        name=cashier.name,
        pin=cashier.pin if cashier.pin else None,
        password_hash=pwd_context.hash(cashier.password) if cashier.password else None
    )
    await db.cashiers.insert_one(new_cashier.dict())
    return {"id": new_cashier.id, "name": new_cashier.name, "message": "Cajero creado"}

@api_router.put("/cashiers/{cashier_id}")
async def update_cashier(cashier_id: str, update: CashierUpdate):
    cashier = await db.cashiers.find_one({"id": cashier_id})
    if not cashier:
        raise HTTPException(status_code=404, detail="Cajero no encontrado")
    
    update_data = {}
    if update.name is not None:
        update_data["name"] = update.name
    if update.pin is not None:
        update_data["pin"] = update.pin
    if update.password is not None:
        update_data["password_hash"] = pwd_context.hash(update.password)
    if update.active is not None:
        update_data["active"] = update.active
    
    if update_data:
        await db.cashiers.update_one({"id": cashier_id}, {"$set": update_data})
    
    return {"message": "Cajero actualizado"}

@api_router.delete("/cashiers/{cashier_id}")
async def delete_cashier(cashier_id: str):
    result = await db.cashiers.delete_one({"id": cashier_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cajero no encontrado")
    return {"message": "Cajero eliminado"}

@api_router.post("/cashiers/login")
async def cashier_login(login: CashierLogin):
    # Buscar por PIN
    if login.pin:
        cashier = await db.cashiers.find_one({"pin": login.pin, "active": True})
        if cashier:
            return {"success": True, "cashier_id": cashier["id"], "name": cashier["name"]}
    
    # Buscar por contraseña (necesita cashier_id)
    if login.password and login.cashier_id:
        cashier = await db.cashiers.find_one({"id": login.cashier_id, "active": True})
        if cashier and cashier.get("password_hash"):
            if pwd_context.verify(login.password, cashier["password_hash"]):
                return {"success": True, "cashier_id": cashier["id"], "name": cashier["name"]}
    
    raise HTTPException(status_code=401, detail="PIN o contraseña incorrectos")

@api_router.get("/cashiers/{cashier_id}/sales")
async def get_cashier_sales(cashier_id: str, date_filter: Optional[str] = None):
    query = {"cashier_id": cashier_id}
    if date_filter:
        query["date"] = date_filter
    
    orders = await db.orders.find(query).sort("created_at", -1).to_list(1000)
    
    total_sales = sum(o.get("total", 0) for o in orders)
    total_orders = len(orders)
    
    return {
        "cashier_id": cashier_id,
        "total_orders": total_orders,
        "total_sales": total_sales,
        "orders": orders
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
