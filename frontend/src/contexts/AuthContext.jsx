import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '@/utils/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [restaurant, setRestaurant] = useState(null);
  const [cashier, setCashier] = useState(null);
  const [loading, setLoading] = useState(true);

  const isAuthenticated = !!restaurant;

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const r = await authApi.me();
      setRestaurant(r);
      const savedCashier = localStorage.getItem('cashier');
      if (savedCashier) setCashier(JSON.parse(savedCashier));
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('restaurant');
      localStorage.removeItem('cashier');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { checkAuth(); }, [checkAuth]);

  const login = async (email, password) => {
    const r = await authApi.login({ email, password });
    localStorage.setItem('token', r.access_token);
    localStorage.setItem('restaurant', JSON.stringify({
      id: r.restaurant_id, email: r.email, restaurant_name: r.restaurant_name,
    }));
    setRestaurant({ id: r.restaurant_id, email: r.email, restaurant_name: r.restaurant_name });
    return r;
  };

  const register = async (email, password, restaurant_name) => {
    const r = await authApi.register({ email, password, restaurant_name });
    localStorage.setItem('token', r.access_token);
    localStorage.setItem('restaurant', JSON.stringify({
      id: r.restaurant_id, email: r.email, restaurant_name: r.restaurant_name,
    }));
    setRestaurant({ id: r.restaurant_id, email: r.email, restaurant_name: r.restaurant_name });
    return r;
  };

  const setActiveCashier = (c) => {
    if (c) {
      localStorage.setItem('cashier', JSON.stringify(c));
      setCashier(c);
    } else {
      localStorage.removeItem('cashier');
      setCashier(null);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('restaurant');
    localStorage.removeItem('cashier');
    setRestaurant(null);
    setCashier(null);
  };

  return (
    <AuthContext.Provider value={{ restaurant, cashier, loading, isAuthenticated, login, register, logout, setActiveCashier }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
