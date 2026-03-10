// API URL configuration that works for both web and mobile
const API_URL = 'https://app-continuation-22.preview.emergentagent.com';

export const api = {
  // Business
  getBusiness: async () => {
    const response = await fetch(`${API_URL}/api/business`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Response is not JSON:', text);
      throw new Error('El servidor no devolvió datos válidos');
    }
    
    return response.json();
  },

  updateBusiness: async (data: { name?: string; logo?: string }) => {
    const response = await fetch(`${API_URL}/api/business`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // Products
  getProducts: async () => {
    const response = await fetch(`${API_URL}/api/products`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Response is not JSON:', text);
      throw new Error('El servidor no devolvió datos válidos');
    }
    
    return response.json();
  },

  getProduct: async (id: string) => {
    const response = await fetch(`${API_URL}/api/products/${id}`);
    return response.json();
  },

  createProduct: async (data: any) => {
    const response = await fetch(`${API_URL}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  updateProduct: async (id: string, data: any) => {
    const response = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteProduct: async (id: string) => {
    const response = await fetch(`${API_URL}/api/products/${id}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // Orders
  getOrders: async (dateFilter?: string) => {
    const url = dateFilter 
      ? `${API_URL}/api/orders?date_filter=${dateFilter}`
      : `${API_URL}/api/orders`;
    const response = await fetch(url);
    
    // Verificar que la respuesta sea exitosa
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    // Verificar que sea JSON antes de parsear
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Response is not JSON:', text);
      throw new Error('El servidor no devolvió datos válidos');
    }
    
    return response.json();
  },

  createOrder: async (data: any) => {
    const response = await fetch(`${API_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  markOrderPrinted: async (id: string) => {
    const response = await fetch(`${API_URL}/api/orders/${id}/print`, {
      method: 'PUT',
    });
    return response.json();
  },

  // Auth
  login: async (username: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      throw new Error('Invalid credentials');
    }
    return response.json();
  },

  register: async (username: string, password: string) => {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    return response.json();
  },

  checkSetup: async () => {
    const response = await fetch(`${API_URL}/api/auth/check-setup`);
    return response.json();
  },

  // Statistics
  getDailySales: async (dateStr?: string) => {
    const url = dateStr
      ? `${API_URL}/api/stats/daily?date_str=${dateStr}`
      : `${API_URL}/api/stats/daily`;
    const response = await fetch(url);
    return response.json();
  },

  getSalesRange: async (startDate: string, endDate: string) => {
    const response = await fetch(
      `${API_URL}/api/stats/range?start_date=${startDate}&end_date=${endDate}`
    );
    return response.json();
  },

  // Top Products
  getTopProducts: async (dateStr?: string, limit: number = 5) => {
    const params = new URLSearchParams();
    if (dateStr) params.append('date_str', dateStr);
    params.append('limit', limit.toString());
    const response = await fetch(`${API_URL}/api/stats/top-products?${params}`);
    return response.json();
  },

  // Cash Register Close (Corte de Caja)
  closeCashRegister: async (data: {
    date: string;
    total_orders: number;
    total_sales: number;
    cash_sales: number;
    card_sales: number;
    transfer_sales: number;
    initial_cash: number;
    actual_cash: number;
    notes: string;
    closed_by: string;
  }) => {
    const response = await fetch(`${API_URL}/api/cash-register/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al cerrar caja');
    }
    return response.json();
  },

  getCashRegisterCloses: async (limit: number = 30) => {
    const response = await fetch(`${API_URL}/api/cash-register/closes?limit=${limit}`);
    return response.json();
  },

  getCashRegisterClose: async (dateStr: string) => {
    const response = await fetch(`${API_URL}/api/cash-register/close/${dateStr}`);
    return response.json();
  },

  deleteCashRegisterClose: async (closeId: string) => {
    const response = await fetch(`${API_URL}/api/cash-register/close/${closeId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  // Cashiers (Cajeros)
  getCashiers: async () => {
    const response = await fetch(`${API_URL}/api/cashiers`);
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Response is not JSON:', text);
      throw new Error('El servidor no devolvió datos válidos');
    }
    
    return response.json();
  },

  createCashier: async (data: { name: string; pin?: string; password?: string }) => {
    const response = await fetch(`${API_URL}/api/cashiers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Error al crear cajero');
    }
    return response.json();
  },

  updateCashier: async (cashierId: string, data: any) => {
    const response = await fetch(`${API_URL}/api/cashiers/${cashierId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  deleteCashier: async (cashierId: string) => {
    const response = await fetch(`${API_URL}/api/cashiers/${cashierId}`, {
      method: 'DELETE',
    });
    return response.json();
  },

  loginCashier: async (data: { pin?: string; password?: string; cashier_id?: string }) => {
    const response = await fetch(`${API_URL}/api/cashiers/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'PIN o contraseña incorrectos');
    }
    return response.json();
  },

  getCashierSales: async (cashierId: string, dateFilter?: string) => {
    const params = dateFilter ? `?date_filter=${dateFilter}` : '';
    const response = await fetch(`${API_URL}/api/cashiers/${cashierId}/sales${params}`);
    
    // Verificar que la respuesta sea exitosa
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    // Verificar que sea JSON antes de parsear
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Response is not JSON:', text);
      throw new Error('El servidor no devolvió datos válidos');
    }
    
    return response.json();
  },
};
