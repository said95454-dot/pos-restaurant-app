import React, { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { AnimatePresence, motion } from "framer-motion";

import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import POSPage from "@/pages/POSPage";
import ProductsPage from "@/pages/ProductsPage";
import OrdersPage from "@/pages/OrdersPage";
import StatsPage from "@/pages/StatsPage";
import CashRegisterPage from "@/pages/CashRegisterPage";
import CashiersPage from "@/pages/CashiersPage";
import SettingsPage from "@/pages/SettingsPage";
import AppLayout from "@/components/AppLayout";
import Splash from "@/components/Splash";

const Protected = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Splash subtitle="Sincronizando..." />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Splash subtitle="Sincronizando..." />;
  if (isAuthenticated) return <Navigate to="/pos" replace />;
  return children;
};

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    className="contents"
  >
    {children}
  </motion.div>
);

function AppRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Navigate to="/pos" replace />} />
        <Route path="/login" element={<PublicOnly><PageTransition><LoginPage /></PageTransition></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><PageTransition><RegisterPage /></PageTransition></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><PageTransition><ForgotPasswordPage /></PageTransition></PublicOnly>} />
        <Route path="/reset-password" element={<PublicOnly><PageTransition><ResetPasswordPage /></PageTransition></PublicOnly>} />

        <Route element={<Protected><AppLayout /></Protected>}>
          <Route path="/pos" element={<POSPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/cash-register" element={<CashRegisterPage />} />
          <Route path="/cashiers" element={<CashiersPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  const [bootSplash, setBootSplash] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setBootSplash(false), 1400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AnimatePresence>
            {bootSplash && (
              <motion.div key="boot" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                <Splash subtitle="Inicializando…" />
              </motion.div>
            )}
          </AnimatePresence>
          <AppRoutes />
          <Toaster position="top-center" richColors theme="dark" />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
