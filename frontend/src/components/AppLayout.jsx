import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Package, ListOrdered, BarChart3, Wallet, Users, Settings, LogOut, Sparkles, Monitor, ChefHat, UtensilsCrossed, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import Aurora from '@/components/Aurora';
import OnlineStatusIndicator from '@/components/OnlineStatusIndicator';
import RealtimeIndicator from '@/components/RealtimeIndicator';

const NAV = [
  { to: '/pos', label: 'Vender', icon: ShoppingCart, testId: 'nav-pos' },
  { to: '/tables', label: 'Sala', icon: UtensilsCrossed, testId: 'nav-tables' },
  { to: '/products', label: 'Productos', icon: Package, testId: 'nav-products' },
  { to: '/orders', label: 'Órdenes', icon: ListOrdered, testId: 'nav-orders' },
  { to: '/stats', label: 'Estadísticas', icon: BarChart3, testId: 'nav-stats' },
  { to: '/cash-register', label: 'Corte de Caja', icon: Wallet, testId: 'nav-cash-register' },
  { to: '/cashiers', label: 'Cajeros', icon: Users, testId: 'nav-cashiers' },
  { to: '/settings', label: 'Ajustes', icon: Settings, testId: 'nav-settings' },
];

const AppLayout = () => {
  const { restaurant, cashier, logout, setActiveCashier } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  const NAV_ITEMS = [
    { to: '/pos', label: t('nav.pos'), icon: ShoppingCart, testId: 'nav-pos' },
    { to: '/tables', label: t('nav.tables'), icon: UtensilsCrossed, testId: 'nav-tables' },
    { to: '/products', label: t('nav.products'), icon: Package, testId: 'nav-products' },
    { to: '/orders', label: t('nav.orders'), icon: ListOrdered, testId: 'nav-orders' },
    { to: '/stats', label: t('nav.stats'), icon: BarChart3, testId: 'nav-stats' },
    { to: '/cash-register', label: t('nav.cash_register'), icon: Wallet, testId: 'nav-cash-register' },
    { to: '/cashiers', label: t('nav.cashiers'), icon: Users, testId: 'nav-cashiers' },
    { to: '/settings', label: t('nav.settings'), icon: Settings, testId: 'nav-settings' },
  ];

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-ink-950 overflow-hidden relative" data-testid="app-layout">
      <Aurora />

      {/* Sidebar (iPad / Mac) */}
      <aside className="hidden md:flex flex-col w-72 glass-strong border-r border-white/5 safe-top safe-bottom relative z-10">
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 rounded-2xl flex items-center justify-center">
              <div className="absolute inset-0 rounded-2xl conic-border" />
              <div className="absolute inset-0.5 rounded-[0.85rem] bg-ink-900 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-500" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold tracking-widest text-foreground/40 uppercase">Restaurante</p>
              <h1 className="font-heading text-base font-bold text-foreground truncate" data-testid="sidebar-restaurant-name">{restaurant?.restaurant_name}</h1>
            </div>
          </div>
          {cashier && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-xl px-3 py-2"
              data-testid="sidebar-cashier-name"
            >
              <div className="relative">
                <span className="block h-2 w-2 rounded-full bg-success pulse-dot" />
              </div>
              <span className="text-xs font-bold text-primary-500">Cajero: {cashier.name}</span>
            </motion.div>
          )}
          <div className="mt-3">
            <OnlineStatusIndicator />
          </div>
          <div className="mt-2">
            <RealtimeIndicator />
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon, testId }) => {
            const isActive = location.pathname === to;
            const needsCashier = to === '/pos' && !cashier;
            return (
              <NavLink key={to} to={to} data-testid={testId} className="block">
                <motion.div
                  whileHover={{ x: 3 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl text-[14px] font-semibold transition-all ${
                    isActive ? 'text-primary-500' : 'text-foreground/70 hover:text-foreground hover:bg-white/5'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="active-nav-pill"
                      className="absolute inset-0 rounded-2xl bg-primary-500/10 border border-primary-500/30"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                  <Icon className={`relative h-5 w-5 ${isActive ? 'text-glow-cyan' : ''}`} strokeWidth={isActive ? 2.2 : 1.7} />
                  <span className="relative">{label}</span>
                  {needsCashier && (
                    <span className="relative ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber/15 text-amber border border-amber/30" title="Requiere cajero">
                      🔒
                    </span>
                  )}
                  {isActive && !needsCashier && <motion.span layoutId="active-nav-dot" className="relative ml-auto h-1.5 w-1.5 rounded-full bg-primary-500 shadow-[0_0_8px_rgba(0,240,255,0.8)]" />}
                </motion.div>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/5 space-y-2">
          <a
            href="/display"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 h-11 px-4 rounded-2xl bg-primary-500/10 border border-primary-500/30 text-primary-500 hover:bg-primary-500/20 transition-all text-sm font-bold"
            data-testid="open-customer-display"
          >
            <Monitor className="h-4 w-4" />
            <span>{t('nav.customer_display')}</span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-primary-500/20 border border-primary-500/40 rounded-full px-1.5 py-0.5">↗</span>
          </a>
          <a
            href="/kitchen"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 h-11 px-4 rounded-2xl bg-amber/10 border border-amber/30 text-amber hover:bg-amber/20 transition-all text-sm font-bold"
            data-testid="open-kitchen-display"
          >
            <ChefHat className="h-4 w-4" />
            <span>{t('nav.kitchen_display')}</span>
            <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-amber/20 border border-amber/40 rounded-full px-1.5 py-0.5">↗</span>
          </a>
          {cashier && (
            <Button
              variant="outline"
              onClick={() => setActiveCashier(null)}
              className="w-full justify-start gap-3 h-11 rounded-2xl bg-white/5 border-white/10 hover:bg-white/10 text-foreground/80 hover:text-foreground"
              data-testid="sidebar-cashier-logout"
            >
              <LogOut className="h-4 w-4" /> {t('cashier.sign_out_cashier')}
            </Button>
          )}
          {cashier ? (
            <div
              className="w-full flex items-center gap-3 h-11 px-4 rounded-2xl bg-white/[0.02] border border-white/5 text-foreground/30 cursor-not-allowed"
              data-testid="sidebar-logout-locked"
              title={t('logout_confirm.locked_tip')}
            >
              <LogOut className="h-4 w-4" /> {t('common.logout')}
              <span className="ml-auto text-[9px] font-bold uppercase tracking-widest bg-amber/10 border border-amber/30 text-amber rounded-full px-1.5 py-0.5">{t('logout_confirm.locked_badge')}</span>
            </div>
          ) : (
            <Button
              variant="ghost"
              onClick={() => setConfirmLogoutOpen(true)}
              className="w-full justify-start gap-3 h-11 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
              data-testid="sidebar-logout-button"
            >
              <LogOut className="h-4 w-4" /> {t('common.logout')}
            </Button>
          )}
        </div>
      </aside>

      {/* Confirm logout dialog */}
      <AlertDialog open={confirmLogoutOpen} onOpenChange={setConfirmLogoutOpen}>
        <AlertDialogContent className="bg-ink-900 border border-white/10 text-foreground max-w-md" data-testid="confirm-logout-dialog">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-2xl bg-destructive/15 border border-destructive/30 text-destructive flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <AlertDialogTitle className="font-heading text-xl font-black text-foreground">
                {t('logout_confirm.title')}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-foreground/60">
              {t('logout_confirm.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              className="rounded-2xl border-white/10 bg-white/5 hover:bg-white/10 text-foreground"
              data-testid="confirm-logout-cancel"
            >
              {t('logout_confirm.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-bold"
              data-testid="confirm-logout-confirm"
            >
              {t('logout_confirm.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col safe-top relative z-10" data-testid="app-main">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col overflow-hidden"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating status indicator (mobile) */}
      <div className="md:hidden fixed top-2 right-2 z-30" data-testid="mobile-status-wrap">
        <OnlineStatusIndicator />
      </div>

      {/* Bottom Tab Bar (mobile) */}
      <nav className="md:hidden glass-strong border-t border-white/5 safe-bottom relative z-20" data-testid="mobile-bottom-nav">
        <div className="flex items-stretch justify-around overflow-x-auto no-scrollbar">
          {NAV_ITEMS.slice(0, 5).map(({ to, label, icon: Icon, testId }) => {
            const isActive = location.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                data-testid={`mobile-${testId}`}
                className={`relative flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] flex-1 ${isActive ? 'text-primary-500' : 'text-foreground/50'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-mobile-pill"
                    className="absolute top-1 h-1 w-8 bg-primary-500 rounded-full shadow-[0_0_8px_rgba(0,240,255,0.8)]"
                  />
                )}
                <Icon className="h-5 w-5" strokeWidth={isActive ? 2.2 : 1.7} />
                <span className="text-[10px] font-bold">{label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
