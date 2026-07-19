from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
import json
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, validator
from typing import List, Optional, Dict, Any
import uuid
import secrets
from datetime import datetime, date, timedelta, timezone
from passlib.context import CryptContext
import jwt
import resend


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'tu-secreto-super-seguro-cambiar-en-produccion')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# Security
security = HTTPBearer(auto_error=False)

# Resend Configuration
resend.api_key = os.environ.get('RESEND_API_KEY')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')

# Helper functions for JWT
def create_access_token(restaurant_id: str, email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        "restaurant_id": restaurant_id,
        "email": email,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_restaurant(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="No autorizado")
    token = credentials.credentials
    payload = decode_token(token)
    restaurant = await db.restaurants.find_one({"id": payload["restaurant_id"]}, {"_id": 0, "password_hash": 0})
    if not restaurant:
        raise HTTPException(status_code=401, detail="Restaurante no encontrado")
    return restaurant

# ============= Realtime WebSocket Manager =============
class RealtimeManager:
    """Broadcasts events to all sockets connected for the same restaurant_id."""
    def __init__(self):
        # restaurant_id -> set[WebSocket]
        self._conns: Dict[str, set] = {}
        self._lock = asyncio.Lock()

    async def connect(self, restaurant_id: str, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self._conns.setdefault(restaurant_id, set()).add(ws)
        await self.broadcast(restaurant_id, {"type": "presence", "count": self.count(restaurant_id)})

    async def disconnect(self, restaurant_id: str, ws: WebSocket):
        async with self._lock:
            conns = self._conns.get(restaurant_id)
            if conns and ws in conns:
                conns.discard(ws)
                if not conns:
                    self._conns.pop(restaurant_id, None)
        try:
            await self.broadcast(restaurant_id, {"type": "presence", "count": self.count(restaurant_id)})
        except Exception:
            pass

    def count(self, restaurant_id: str) -> int:
        return len(self._conns.get(restaurant_id, set()))

    async def broadcast(self, restaurant_id: str, message: dict):
        conns = list(self._conns.get(restaurant_id, set()))
        dead = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._conns.get(restaurant_id, set()).discard(ws)

realtime = RealtimeManager()

async def emit(restaurant_id: str, event_type: str, data: dict | None = None):
    """Fire-and-forget broadcast; never raises into the request path."""
    try:
        await realtime.broadcast(restaurant_id, {"type": event_type, "data": data or {}})
    except Exception as e:
        logging.getLogger(__name__).warning(f"emit({event_type}) failed: {e}")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============= MODELS =============

# Restaurant Models (Multi-tenant)
class RestaurantRegister(BaseModel):
    email: str
    password: str
    restaurant_name: str

class RestaurantLogin(BaseModel):
    email: str
    password: str

class Restaurant(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    restaurant_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RestaurantResponse(BaseModel):
    id: str
    email: str
    restaurant_name: str
    created_at: str

class AuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    restaurant_id: str
    email: str
    restaurant_name: str

# Password Recovery Models
class PasswordResetRequest(BaseModel):
    email: str

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

# Business Settings
class Business(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    logo: Optional[str] = None  # base64 image
    logo_size: Optional[str] = 'md'  # sm | md | lg | xl
    qr_url: Optional[str] = None
    qr_label: Optional[str] = None
    default_tip_percent: float = 0.0  # propina sugerida global

class BusinessUpdate(BaseModel):
    name: Optional[str] = None
    logo: Optional[str] = None
    logo_size: Optional[str] = None
    qr_url: Optional[str] = None
    qr_label: Optional[str] = None
    default_tip_percent: Optional[float] = None

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
    subtotal: float = 0.0  # suma de items antes de propina
    tip: float = 0.0  # propina
    total: float
    payment_method: str  # "cash", "card", "transfer"
    amount_received: Optional[float] = None  # Monto recibido (para efectivo)
    change: Optional[float] = None  # Cambio dado (para efectivo)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    printed: bool = False
    date: str = Field(default_factory=lambda: datetime.utcnow().strftime("%Y-%m-%d"))
    cashier_id: Optional[str] = None
    cashier_name: Optional[str] = None
    kds_status: str = "new"  # new | preparing | ready | completed
    kds_updated_at: Optional[datetime] = None
    table_id: Optional[str] = None
    table_number: Optional[int] = None

class OrderCreate(BaseModel):
    customer_name: str
    items: List[OrderItem]
    subtotal: Optional[float] = None
    tip: float = 0.0
    total: float
    payment_method: str
    amount_received: Optional[float] = None  # Monto recibido (para efectivo)
    change: Optional[float] = None  # Cambio dado (para efectivo)
    cashier_id: Optional[str] = None
    cashier_name: Optional[str] = None
    table_id: Optional[str] = None
    table_number: Optional[int] = None

    @validator('subtotal', always=True)
    def _default_subtotal(cls, v, values):
        if v is None:
            # legacy clients without subtotal: derive from total - tip
            return float(values.get('total', 0)) - float(values.get('tip', 0) or 0)
        return v


# ========= Table (Sala) Models =========
TABLE_STATUSES = ("free", "occupied", "billed", "reserved")

class Table(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    number: int
    capacity: int = 4
    status: str = "free"  # free | occupied | billed | reserved
    waiter_id: Optional[str] = None
    waiter_name: Optional[str] = None
    current_order_id: Optional[str] = None
    opened_at: Optional[datetime] = None
    reserved_for: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TableCreate(BaseModel):
    number: int
    capacity: int = 4

class TableUpdate(BaseModel):
    number: Optional[int] = None
    capacity: Optional[int] = None

class TableOpenPayload(BaseModel):
    waiter_id: Optional[str] = None
    waiter_name: Optional[str] = None

class TableReservePayload(BaseModel):
    reserved_for: Optional[str] = None

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
    default_tip_percent: Optional[float] = None  # override del global (None = usar global)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CashierCreate(BaseModel):
    name: str
    pin: Optional[str] = None
    password: Optional[str] = None
    default_tip_percent: Optional[float] = None

class CashierUpdate(BaseModel):
    name: Optional[str] = None
    pin: Optional[str] = None
    password: Optional[str] = None
    active: Optional[bool] = None
    default_tip_percent: Optional[float] = None

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
    total_tips: float = 0.0

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
    return {"message": "Food POS API - Multi-tenant"}

# ========= Restaurant Auth Routes (Multi-tenant) =========
@api_router.post("/auth/restaurant/register", response_model=AuthTokenResponse)
async def register_restaurant(data: RestaurantRegister):
    # Check if email already exists
    existing = await db.restaurants.find_one({"email": data.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Create restaurant
    restaurant_id = str(uuid.uuid4())
    restaurant_doc = {
        "id": restaurant_id,
        "email": data.email.lower(),
        "password_hash": pwd_context.hash(data.password),
        "restaurant_name": data.restaurant_name,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.restaurants.insert_one(restaurant_doc)
    
    # Generate token
    access_token = create_access_token(restaurant_id, data.email.lower())
    
    return AuthTokenResponse(
        access_token=access_token,
        restaurant_id=restaurant_id,
        email=data.email.lower(),
        restaurant_name=data.restaurant_name
    )

@api_router.post("/auth/restaurant/login", response_model=AuthTokenResponse)
async def login_restaurant(data: RestaurantLogin):
    # Find restaurant
    restaurant = await db.restaurants.find_one({"email": data.email.lower()})
    if not restaurant:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Verify password
    if not pwd_context.verify(data.password, restaurant["password_hash"]):
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Generate token
    access_token = create_access_token(restaurant["id"], restaurant["email"])
    
    return AuthTokenResponse(
        access_token=access_token,
        restaurant_id=restaurant["id"],
        email=restaurant["email"],
        restaurant_name=restaurant["restaurant_name"]
    )

@api_router.get("/auth/me", response_model=RestaurantResponse)
async def get_current_restaurant_info(restaurant: dict = Depends(get_current_restaurant)):
    return RestaurantResponse(
        id=restaurant["id"],
        email=restaurant["email"],
        restaurant_name=restaurant["restaurant_name"],
        created_at=restaurant["created_at"]
    )

# ========= Password Recovery Routes =========
@api_router.post("/auth/forgot-password")
async def forgot_password(data: PasswordResetRequest):
    # Find restaurant by email
    restaurant = await db.restaurants.find_one({"email": data.email.lower()})
    
    # Always return success to prevent email enumeration
    if not restaurant:
        return {"message": "Si el email existe, recibirás un enlace de recuperación"}
    
    # Generate reset token
    reset_token = secrets.token_urlsafe(32)
    expiration = datetime.now(timezone.utc) + timedelta(hours=1)
    
    # Save token in database
    await db.password_resets.update_one(
        {"email": data.email.lower()},
        {
            "$set": {
                "email": data.email.lower(),
                "token": reset_token,
                "expires_at": expiration.isoformat(),
                "used": False
            }
        },
        upsert=True
    )
    
    # Send email
    try:
        reset_link = f"https://tu-app.com/reset-password?token={reset_token}"
        
        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #00f0ff;">Recuperar Contraseña</h2>
            <p>Hola,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña en <strong>{restaurant['restaurant_name']}</strong>.</p>
            <p>Tu código de recuperación es:</p>
            <div style="background: #1a0a2e; padding: 20px; border-radius: 10px; text-align: center; margin: 20px 0;">
                <span style="color: #00f0ff; font-size: 32px; font-weight: bold; letter-spacing: 4px;">{reset_token[:8].upper()}</span>
            </div>
            <p>Este código expira en <strong>1 hora</strong>.</p>
            <p>Si no solicitaste esto, ignora este email.</p>
            <hr style="border: none; border-top: 1px solid #333; margin: 20px 0;">
            <p style="color: #666; font-size: 12px;">Sistema POS Multi-Restaurante</p>
        </div>
        """
        
        params = {
            "from": SENDER_EMAIL,
            "to": [data.email.lower()],
            "subject": f"Recuperar contraseña - {restaurant['restaurant_name']}",
            "html": html_content
        }
        
        await asyncio.to_thread(resend.Emails.send, params)
        
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        # Don't expose error to user
    
    return {"message": "Si el email existe, recibirás un enlace de recuperación"}

@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    # Find token that matches (first 8 chars)
    all_tokens = await db.password_resets.find({"used": False}).to_list(100)
    
    reset_record = None
    for record in all_tokens:
        if record["token"][:8].upper() == data.token.upper()[:8]:
            reset_record = record
            break
    
    if not reset_record:
        raise HTTPException(status_code=400, detail="Código inválido o expirado")
    
    # Check expiration
    expires_at = datetime.fromisoformat(reset_record["expires_at"])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Código expirado")
    
    # Validate new password
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="La contraseña debe tener al menos 6 caracteres")
    
    # Update password
    await db.restaurants.update_one(
        {"email": reset_record["email"]},
        {"$set": {"password_hash": pwd_context.hash(data.new_password)}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"_id": reset_record["_id"]},
        {"$set": {"used": True}}
    )
    
    return {"message": "Contraseña actualizada exitosamente"}

# ========= Business Routes - Multi-tenant =========
@api_router.get("/business", response_model=Business)
async def get_business(restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    business = await db.business.find_one({"restaurant_id": restaurant_id})
    if not business:
        default_business = Business(name=restaurant["restaurant_name"])
        business_dict = default_business.dict()
        business_dict["restaurant_id"] = restaurant_id
        await db.business.insert_one(business_dict)
        return default_business
    return Business(**business)

@api_router.put("/business", response_model=Business)
async def update_business(update: BusinessUpdate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    business = await db.business.find_one({"restaurant_id": restaurant_id})
    if not business:
        default_business = Business(name=restaurant["restaurant_name"])
        business_dict = default_business.dict()
        business_dict["restaurant_id"] = restaurant_id
        await db.business.insert_one(business_dict)
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.business.update_one({"restaurant_id": restaurant_id}, {"$set": update_data})
    
    updated_business = await db.business.find_one({"restaurant_id": restaurant_id})
    return Business(**updated_business)

# ========= Product Routes - Multi-tenant =========
@api_router.get("/products", response_model=List[Product])
async def get_products(restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    products = await db.products.find({"restaurant_id": restaurant_id}).to_list(1000)
    return [Product(**product) for product in products]

@api_router.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    product = await db.products.find_one({"id": product_id, "restaurant_id": restaurant_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@api_router.post("/products", response_model=Product)
async def create_product(product: ProductCreate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    new_product = Product(**product.dict())
    product_dict = new_product.dict()
    product_dict["restaurant_id"] = restaurant_id
    await db.products.insert_one(product_dict)
    await emit(restaurant_id, "product.created", {"id": new_product.id, "name": new_product.name})
    return new_product

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, update: ProductUpdate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    product = await db.products.find_one({"id": product_id, "restaurant_id": restaurant_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = {k: v for k, v in update.dict().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id, "restaurant_id": restaurant_id}, {"$set": update_data})
    
    updated_product = await db.products.find_one({"id": product_id, "restaurant_id": restaurant_id})
    await emit(restaurant_id, "product.updated", {"id": product_id, "name": updated_product.get("name")})
    return Product(**updated_product)

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    result = await db.products.delete_one({"id": product_id, "restaurant_id": restaurant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    await emit(restaurant_id, "product.deleted", {"id": product_id})
    return {"message": "Product deleted successfully"}

# ========= Order Routes - Multi-tenant =========
@api_router.get("/orders")
async def get_orders(restaurant: dict = Depends(get_current_restaurant), date_filter: Optional[str] = None, cashier_id: Optional[str] = None):
    restaurant_id = restaurant["id"]
    query = {"restaurant_id": restaurant_id}
    if date_filter:
        query["date"] = date_filter
    if cashier_id:
        query["cashier_id"] = cashier_id
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    result = []
    for order in orders:
        if "items" in order:
            for item in order["items"]:
                if isinstance(item.get("selected_options"), dict):
                    item["selected_options"] = [k for k, v in item["selected_options"].items() if v]
        result.append(order)
    
    return result

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    order = await db.orders.find_one({"id": order_id, "restaurant_id": restaurant_id})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return Order(**order)

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    order_data = order.dict()
    # Fallback: legacy clients (offline-queued before tips feature) may omit subtotal — derive it
    if order_data.get("subtotal") in (None, 0, 0.0):
        order_data["subtotal"] = float(order_data.get("total", 0)) - float(order_data.get("tip", 0) or 0)
    new_order = Order(**order_data)
    order_dict = new_order.dict()
    order_dict["restaurant_id"] = restaurant_id
    await db.orders.insert_one(order_dict)
    # If the order is bound to a table, mark it as billed and store current_order_id
    if new_order.table_id:
        await db.tables.update_one(
            {"id": new_order.table_id, "restaurant_id": restaurant_id},
            {"$set": {"status": "billed", "current_order_id": new_order.id}},
        )
        await emit(restaurant_id, "table.billed", {"id": new_order.table_id, "current_order_id": new_order.id})
    await emit(restaurant_id, "order.created", {
        "id": new_order.id,
        "customer_name": new_order.customer_name,
        "total": new_order.total,
        "tip": new_order.tip,
        "subtotal": new_order.subtotal,
        "payment_method": new_order.payment_method,
        "cashier_name": new_order.cashier_name,
        "items_count": len(new_order.items),
        "created_at": new_order.created_at.isoformat() if hasattr(new_order.created_at, 'isoformat') else str(new_order.created_at),
    })
    return new_order

@api_router.put("/orders/{order_id}/print")
async def mark_order_printed(order_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    result = await db.orders.update_one({"id": order_id, "restaurant_id": restaurant_id}, {"$set": {"printed": True}})
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    return {"message": "Order marked as printed"}

# ========= KDS (Kitchen Display) Routes =========
class KDSStatusUpdate(BaseModel):
    kds_status: str  # 'new' | 'preparing' | 'ready' | 'completed'

@api_router.get("/orders/kds/board")
async def kds_board(restaurant: dict = Depends(get_current_restaurant)):
    """Returns all orders for today that are not yet completed, oldest first."""
    restaurant_id = restaurant["id"]
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    orders = await db.orders.find(
        {
            "restaurant_id": restaurant_id,
            "date": date_str,
            "kds_status": {"$ne": "completed"},
        },
        {"_id": 0},
    ).sort("created_at", 1).to_list(500)
    # Backfill missing kds_status for legacy rows
    for o in orders:
        if not o.get("kds_status"):
            o["kds_status"] = "new"
    return orders

@api_router.put("/orders/{order_id}/kds-status")
async def update_kds_status(order_id: str, update: KDSStatusUpdate, restaurant: dict = Depends(get_current_restaurant)):
    if update.kds_status not in ("new", "preparing", "ready", "completed"):
        raise HTTPException(status_code=400, detail="Estado inválido")
    restaurant_id = restaurant["id"]
    result = await db.orders.update_one(
        {"id": order_id, "restaurant_id": restaurant_id},
        {"$set": {"kds_status": update.kds_status, "kds_updated_at": datetime.utcnow()}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Orden no encontrada")
    await emit(restaurant_id, "order.kds_status", {"id": order_id, "kds_status": update.kds_status})
    return {"message": "Estado actualizado", "kds_status": update.kds_status}


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

# ========= Statistics Routes - Multi-tenant =========
@api_router.get("/stats/daily", response_model=DailySales)
async def get_daily_sales(restaurant: dict = Depends(get_current_restaurant), date_str: Optional[str] = None):
    restaurant_id = restaurant["id"]
    if not date_str:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    orders = await db.orders.find({"date": date_str, "restaurant_id": restaurant_id}, {"_id": 0}).to_list(1000)
    
    total_orders = len(orders)
    total_sales = sum(order["total"] for order in orders)
    cash_sales = sum(order["total"] for order in orders if order["payment_method"] == "cash")
    card_sales = sum(order["total"] for order in orders if order["payment_method"] == "card")
    transfer_sales = sum(order["total"] for order in orders if order["payment_method"] == "transfer")
    total_tips = sum(order.get("tip", 0) or 0 for order in orders)
    
    return DailySales(
        date=date_str,
        total_orders=total_orders,
        total_sales=total_sales,
        cash_sales=cash_sales,
        card_sales=card_sales,
        transfer_sales=transfer_sales,
        total_tips=total_tips
    )

@api_router.get("/stats/range")
async def get_sales_range(start_date: str, end_date: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    orders = await db.orders.find({
        "date": {"$gte": start_date, "$lte": end_date},
        "restaurant_id": restaurant_id
    }, {"_id": 0}).to_list(10000)
    
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
                "transfer_sales": 0.0,
                "total_tips": 0.0
            }
        
        daily_stats[order_date]["total_orders"] += 1
        daily_stats[order_date]["total_sales"] += order["total"]
        daily_stats[order_date]["total_tips"] += (order.get("tip", 0) or 0)
        
        if order["payment_method"] == "cash":
            daily_stats[order_date]["cash_sales"] += order["total"]
        elif order["payment_method"] == "card":
            daily_stats[order_date]["card_sales"] += order["total"]
        elif order["payment_method"] == "transfer":
            daily_stats[order_date]["transfer_sales"] += order["total"]
    
    return {"daily_stats": list(daily_stats.values())}

# ========= Top Products Route - Multi-tenant =========
@api_router.get("/stats/cashier-tips")
async def get_cashier_tips(restaurant: dict = Depends(get_current_restaurant), date_str: Optional[str] = None):
    restaurant_id = restaurant["id"]
    query = {"restaurant_id": restaurant_id}
    if date_str:
        query["date"] = date_str
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    ranking = {}
    for o in orders:
        cid = o.get("cashier_id") or "__none__"
        name = o.get("cashier_name") or "Sin cajero"
        if cid not in ranking:
            ranking[cid] = {"cashier_id": cid, "cashier_name": name, "total_tips": 0.0, "total_orders": 0}
        ranking[cid]["total_tips"] += (o.get("tip", 0) or 0)
        ranking[cid]["total_orders"] += 1
    
    result = sorted(ranking.values(), key=lambda x: x["total_tips"], reverse=True)
    return {"ranking": result, "date": date_str}

@api_router.get("/stats/top-products")
async def get_top_products(restaurant: dict = Depends(get_current_restaurant), date_str: Optional[str] = None, limit: int = 5):
    restaurant_id = restaurant["id"]
    if not date_str:
        date_str = datetime.utcnow().strftime("%Y-%m-%d")
    
    orders = await db.orders.find({"date": date_str, "restaurant_id": restaurant_id}, {"_id": 0}).to_list(10000)
    
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
    
    sorted_products = sorted(
        product_sales.values(),
        key=lambda x: x["quantity_sold"],
        reverse=True
    )[:limit]
    
    return {"top_products": sorted_products}

# ========= Cash Register Close - Multi-tenant =========
@api_router.post("/cash-register/close", response_model=CashRegisterClose)
async def close_cash_register(data: CashRegisterCloseCreate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    existing = await db.cash_register_closes.find_one({"date": data.date, "restaurant_id": restaurant_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un corte de caja para esta fecha")
    
    expected_cash = data.initial_cash + data.cash_sales
    difference = data.actual_cash - expected_cash
    
    new_close = CashRegisterClose(
        **data.dict(),
        expected_cash=expected_cash,
        difference=difference
    )
    close_dict = new_close.dict()
    close_dict["restaurant_id"] = restaurant_id
    
    await db.cash_register_closes.insert_one(close_dict)
    await emit(restaurant_id, "cash-register.closed", {"date": new_close.date, "total_sales": new_close.cash_sales + new_close.card_sales + new_close.transfer_sales, "difference": difference})
    return new_close

@api_router.get("/cash-register/closes", response_model=List[CashRegisterClose])
async def get_cash_register_closes(restaurant: dict = Depends(get_current_restaurant), limit: int = 30):
    restaurant_id = restaurant["id"]
    closes = await db.cash_register_closes.find({"restaurant_id": restaurant_id}).sort("close_time", -1).to_list(limit)
    return [CashRegisterClose(**close) for close in closes]

@api_router.get("/cash-register/close/{date_str}")
async def get_cash_register_close(date_str: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    close = await db.cash_register_closes.find_one({"date": date_str, "restaurant_id": restaurant_id})
    if not close:
        return {"closed": False}
    return {"closed": True, "data": CashRegisterClose(**close)}

@api_router.delete("/cash-register/close/{close_id}")
async def delete_cash_register_close(close_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    result = await db.cash_register_closes.delete_one({"id": close_id, "restaurant_id": restaurant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Corte de caja no encontrado")
    return {"message": "Corte de caja eliminado"}

# ========= Cashier (Cajeros) Routes - Multi-tenant =========
@api_router.get("/cashiers")
async def get_cashiers(restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    cashiers = await db.cashiers.find({"restaurant_id": restaurant_id}).to_list(100)
    result = []
    for c in cashiers:
        result.append({
            "id": c["id"],
            "name": c["name"],
            "active": c.get("active", True),
            "has_pin": bool(c.get("pin")),
            "has_password": bool(c.get("password_hash")),
            "default_tip_percent": c.get("default_tip_percent"),
            "created_at": c.get("created_at")
        })
    return result

@api_router.post("/cashiers")
async def create_cashier(cashier: CashierCreate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    
    # Verificar si ya existe un cajero con ese nombre en este restaurante
    existing = await db.cashiers.find_one({"name": cashier.name, "restaurant_id": restaurant_id})
    if existing:
        raise HTTPException(status_code=400, detail="Ya existe un cajero con ese nombre")
    
    new_cashier = Cashier(
        name=cashier.name,
        pin=cashier.pin if cashier.pin else None,
        password_hash=pwd_context.hash(cashier.password) if cashier.password else None,
        default_tip_percent=cashier.default_tip_percent
    )
    cashier_dict = new_cashier.dict()
    cashier_dict["restaurant_id"] = restaurant_id
    
    await db.cashiers.insert_one(cashier_dict)
    await emit(restaurant_id, "cashier.created", {"id": new_cashier.id, "name": new_cashier.name})
    return {"id": new_cashier.id, "name": new_cashier.name, "message": "Cajero creado"}

@api_router.put("/cashiers/{cashier_id}")
async def update_cashier(cashier_id: str, update: CashierUpdate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    cashier = await db.cashiers.find_one({"id": cashier_id, "restaurant_id": restaurant_id})
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
    # default_tip_percent supports clearing to null (use global) via explicit null
    payload_unset = update.model_dump(exclude_unset=True) if hasattr(update, "model_dump") else update.dict(exclude_unset=True)
    if "default_tip_percent" in payload_unset:
        update_data["default_tip_percent"] = payload_unset["default_tip_percent"]
    
    if update_data:
        await db.cashiers.update_one({"id": cashier_id, "restaurant_id": restaurant_id}, {"$set": update_data})
    
    await emit(restaurant_id, "cashier.updated", {"id": cashier_id})
    return {"message": "Cajero actualizado"}

@api_router.delete("/cashiers/{cashier_id}")
async def delete_cashier(cashier_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    result = await db.cashiers.delete_one({"id": cashier_id, "restaurant_id": restaurant_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cajero no encontrado")
    await emit(restaurant_id, "cashier.deleted", {"id": cashier_id})
    return {"message": "Cajero eliminado"}

@api_router.post("/cashiers/login")
async def cashier_login(login: CashierLogin, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    
    # Buscar por PIN en este restaurante
    if login.pin:
        cashier = await db.cashiers.find_one({"pin": login.pin, "active": True, "restaurant_id": restaurant_id})
        if cashier:
            return {"success": True, "cashier_id": cashier["id"], "name": cashier["name"]}
    
    # Buscar por contraseña (necesita cashier_id)
    if login.password and login.cashier_id:
        cashier = await db.cashiers.find_one({"id": login.cashier_id, "active": True, "restaurant_id": restaurant_id})
        if cashier and cashier.get("password_hash"):
            if pwd_context.verify(login.password, cashier["password_hash"]):
                return {"success": True, "cashier_id": cashier["id"], "name": cashier["name"]}
    
    raise HTTPException(status_code=401, detail="PIN o contraseña incorrectos")

@api_router.get("/cashiers/{cashier_id}/sales")
async def get_cashier_sales(cashier_id: str, restaurant: dict = Depends(get_current_restaurant), date_filter: Optional[str] = None):
    restaurant_id = restaurant["id"]
    query = {"cashier_id": cashier_id, "restaurant_id": restaurant_id}
    if date_filter:
        query["date"] = date_filter
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    total_sales = sum(o.get("total", 0) for o in orders)
    total_tips = sum((o.get("tip", 0) or 0) for o in orders)
    total_orders = len(orders)
    
    return {
        "cashier_id": cashier_id,
        "total_orders": total_orders,
        "total_sales": total_sales,
        "total_tips": total_tips,
        "orders": orders
    }

# ========= Tables (Sala) Routes - Multi-tenant =========
@api_router.get("/tables")
async def list_tables(restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    tables = await db.tables.find({"restaurant_id": restaurant_id}, {"_id": 0}).sort("number", 1).to_list(1000)
    return tables

@api_router.post("/tables")
async def create_table(payload: TableCreate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    # Unique number per restaurant
    existing = await db.tables.find_one({"restaurant_id": restaurant_id, "number": payload.number})
    if existing:
        raise HTTPException(status_code=400, detail=f"Ya existe una mesa con el número {payload.number}")
    if payload.number <= 0 or payload.capacity <= 0:
        raise HTTPException(status_code=400, detail="Número y capacidad deben ser positivos")
    new_table = Table(number=payload.number, capacity=payload.capacity)
    doc = new_table.dict()
    doc["restaurant_id"] = restaurant_id
    await db.tables.insert_one(doc)
    await emit(restaurant_id, "table.created", {"id": new_table.id, "number": new_table.number})
    return new_table

@api_router.put("/tables/{table_id}")
async def update_table(table_id: str, payload: TableUpdate, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    table = await db.tables.find_one({"id": table_id, "restaurant_id": restaurant_id})
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    update = {k: v for k, v in payload.dict().items() if v is not None}
    if "number" in update:
        if update["number"] != table.get("number"):
            other = await db.tables.find_one({"restaurant_id": restaurant_id, "number": update["number"]})
            if other:
                raise HTTPException(status_code=400, detail=f"Ya existe una mesa con el número {update['number']}")
        if update["number"] <= 0:
            raise HTTPException(status_code=400, detail="Número inválido")
    if "capacity" in update and update["capacity"] <= 0:
        raise HTTPException(status_code=400, detail="Capacidad inválida")
    if update:
        await db.tables.update_one({"id": table_id, "restaurant_id": restaurant_id}, {"$set": update})
    await emit(restaurant_id, "table.updated", {"id": table_id})
    return {"message": "Mesa actualizada"}

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    table = await db.tables.find_one({"id": table_id, "restaurant_id": restaurant_id})
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    if table.get("status") in ("occupied", "billed"):
        raise HTTPException(status_code=400, detail="No se puede eliminar una mesa con orden activa")
    await db.tables.delete_one({"id": table_id, "restaurant_id": restaurant_id})
    await emit(restaurant_id, "table.deleted", {"id": table_id})
    return {"message": "Mesa eliminada"}

@api_router.put("/tables/{table_id}/open")
async def open_table(table_id: str, payload: TableOpenPayload, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    table = await db.tables.find_one({"id": table_id, "restaurant_id": restaurant_id})
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    if table.get("status") in ("occupied", "billed"):
        raise HTTPException(status_code=400, detail="La mesa ya está en uso")
    await db.tables.update_one(
        {"id": table_id, "restaurant_id": restaurant_id},
        {"$set": {
            "status": "occupied",
            "waiter_id": payload.waiter_id,
            "waiter_name": payload.waiter_name,
            "opened_at": datetime.utcnow(),
            "reserved_for": None,
        }}
    )
    await emit(restaurant_id, "table.opened", {"id": table_id, "waiter_name": payload.waiter_name})
    fresh = await db.tables.find_one({"id": table_id, "restaurant_id": restaurant_id}, {"_id": 0})
    return fresh

@api_router.put("/tables/{table_id}/close")
async def close_table(table_id: str, restaurant: dict = Depends(get_current_restaurant)):
    """Marks the table free again (call after payment or cancel)."""
    restaurant_id = restaurant["id"]
    table = await db.tables.find_one({"id": table_id, "restaurant_id": restaurant_id})
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    await db.tables.update_one(
        {"id": table_id, "restaurant_id": restaurant_id},
        {"$set": {
            "status": "free",
            "waiter_id": None,
            "waiter_name": None,
            "current_order_id": None,
            "opened_at": None,
            "reserved_for": None,
        }}
    )
    await emit(restaurant_id, "table.closed", {"id": table_id})
    return {"message": "Mesa liberada"}

@api_router.put("/tables/{table_id}/bill")
async def mark_table_billed(table_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    result = await db.tables.update_one(
        {"id": table_id, "restaurant_id": restaurant_id},
        {"$set": {"status": "billed"}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    await emit(restaurant_id, "table.billed", {"id": table_id})
    return {"message": "Cuenta pedida"}

@api_router.put("/tables/{table_id}/reserve")
async def reserve_table(table_id: str, payload: TableReservePayload, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    table = await db.tables.find_one({"id": table_id, "restaurant_id": restaurant_id})
    if not table:
        raise HTTPException(status_code=404, detail="Mesa no encontrada")
    if table.get("status") in ("occupied", "billed"):
        raise HTTPException(status_code=400, detail="No se puede reservar una mesa ocupada")
    await db.tables.update_one(
        {"id": table_id, "restaurant_id": restaurant_id},
        {"$set": {"status": "reserved", "reserved_for": payload.reserved_for}}
    )
    await emit(restaurant_id, "table.reserved", {"id": table_id, "reserved_for": payload.reserved_for})
    return {"message": "Mesa reservada"}

@api_router.put("/tables/{table_id}/unreserve")
async def unreserve_table(table_id: str, restaurant: dict = Depends(get_current_restaurant)):
    restaurant_id = restaurant["id"]
    result = await db.tables.update_one(
        {"id": table_id, "restaurant_id": restaurant_id, "status": "reserved"},
        {"$set": {"status": "free", "reserved_for": None}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Mesa no encontrada o no reservada")
    await emit(restaurant_id, "table.unreserved", {"id": table_id})
    return {"message": "Reserva cancelada"}


# Include the router in the main app
app.include_router(api_router)

# ============= WebSocket endpoint (must be on the main app to allow upgrade through /api ingress) =============
@app.websocket("/api/ws")
async def ws_realtime(ws: WebSocket, token: str = Query(...)):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        restaurant_id = payload["restaurant_id"]
    except Exception:
        await ws.close(code=4401)
        return
    await realtime.connect(restaurant_id, ws)
    try:
        while True:
            msg = await ws.receive_text()
            if msg == "ping":
                try:
                    await ws.send_json({"type": "pong"})
                except Exception:
                    break
                continue
            # Client-relayed events (e.g. cart preview for customer display)
            try:
                data = json.loads(msg)
                mtype = data.get("type")
                if mtype in ("cart.update", "cart.clear"):
                    # Rebroadcast to all *other* sockets on the same tenant
                    for peer in list(realtime._conns.get(restaurant_id, set())):
                        if peer is ws:
                            continue
                        try:
                            await peer.send_json({"type": mtype, "data": data.get("data", {})})
                        except Exception:
                            pass
            except Exception:
                pass
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await realtime.disconnect(restaurant_id, ws)

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
