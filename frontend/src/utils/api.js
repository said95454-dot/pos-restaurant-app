import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API_URL = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
      localStorage.removeItem('token');
      localStorage.removeItem('restaurant');
      localStorage.removeItem('cashier');
      if (window.location.pathname !== '/login') window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===== AUTH (Restaurant multi-tenant) =====
export const authApi = {
  register: async ({ email, password, restaurant_name }) => {
    const r = await api.post('/auth/restaurant/register', { email, password, restaurant_name });
    return r.data;
  },
  login: async ({ email, password }) => {
    const r = await api.post('/auth/restaurant/login', { email, password });
    return r.data;
  },
  me: async () => (await api.get('/auth/me')).data,
  forgotPassword: async (email) => (await api.post('/auth/forgot-password', { email })).data,
  resetPassword: async (token, new_password) => (await api.post('/auth/reset-password', { token, new_password })).data,
};

// ===== BUSINESS =====
export const businessApi = {
  get: async () => (await api.get('/business')).data,
  update: async (data) => (await api.put('/business', data)).data,
};

// ===== PRODUCTS =====
export const productsApi = {
  list: async () => (await api.get('/products')).data,
  get: async (id) => (await api.get(`/products/${id}`)).data,
  create: async (data) => (await api.post('/products', data)).data,
  update: async (id, data) => (await api.put(`/products/${id}`, data)).data,
  remove: async (id) => (await api.delete(`/products/${id}`)).data,
};

// ===== ORDERS =====
export const ordersApi = {
  list: async (params = {}) => (await api.get('/orders', { params })).data,
  get: async (id) => (await api.get(`/orders/${id}`)).data,
  create: async (data) => (await api.post('/orders', data)).data,
  markPrinted: async (id) => (await api.put(`/orders/${id}/print`)).data,
};

// ===== STATS =====
export const statsApi = {
  daily: async (date_str) => (await api.get('/stats/daily', { params: date_str ? { date_str } : {} })).data,
  range: async (start_date, end_date) => (await api.get('/stats/range', { params: { start_date, end_date } })).data,
  topProducts: async (date_str, limit = 5) => (await api.get('/stats/top-products', { params: { ...(date_str && { date_str }), limit } })).data,
};

// ===== CASH REGISTER =====
export const cashRegisterApi = {
  close: async (data) => (await api.post('/cash-register/close', data)).data,
  list: async (limit = 30) => (await api.get('/cash-register/closes', { params: { limit } })).data,
  getByDate: async (date_str) => (await api.get(`/cash-register/close/${date_str}`)).data,
  remove: async (id) => (await api.delete(`/cash-register/close/${id}`)).data,
};

// ===== CASHIERS =====
export const cashiersApi = {
  list: async () => (await api.get('/cashiers')).data,
  create: async (data) => (await api.post('/cashiers', data)).data,
  update: async (id, data) => (await api.put(`/cashiers/${id}`, data)).data,
  remove: async (id) => (await api.delete(`/cashiers/${id}`)).data,
  login: async (data) => (await api.post('/cashiers/login', data)).data,
  sales: async (id, date_filter) => (await api.get(`/cashiers/${id}/sales`, { params: date_filter ? { date_filter } : {} })).data,
};

export default api;
