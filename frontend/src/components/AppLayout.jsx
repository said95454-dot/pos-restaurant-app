import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ShoppingCart, Package, ListOrdered, BarChart3, Wallet, Users, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NAV = [
  { to: '/pos', label: 'Vender', icon: ShoppingCart, testId: 'nav-pos' },
  { to: '/products', label: 'Productos', icon: Package, testId: 'nav-products' },
  { to: '/orders', label: 'Órdenes', icon: ListOrdered, testId: 'nav-orders' },
  { to: '/stats', label: 'Estadísticas', icon: BarChart3, testId: 'nav-stats' },
  { to: '/cash-register', label: 'Corte de Caja', icon: Wallet, testId: 'nav-cash-register' },
  { to: '/cashiers', label: 'Cajeros', icon: Users, testId: 'nav-cashiers' },
  { to: '/settings', label: 'Ajustes', icon: Settings, testId: 'nav-settings' },
];

const AppLayout = () => {
  const { restaurant, cashier, logout, setActiveCashier } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-ios-bg overflow-hidden" data-testid="app-layout">
      {/* Sidebar (iPad / Mac) */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-ios-border safe-top safe-bottom">
        <div className="px-6 py-5 border-b border-ios-border">
          <p className="text-xs font-semibold tracking-widest text-ios-secondary uppercase">Restaurante</p>
          <h1 className="text-lg font-heading font-bold text-ios-text truncate" data-testid="sidebar-restaurant-name">{restaurant?.restaurant_name}</h1>
          {cashier && (
            <p className="text-sm text-primary-500 font-medium mt-1" data-testid="sidebar-cashier-name">
              Cajero: {cashier.name}
            </p>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, label, icon: Icon, testId }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={testId}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-2xl text-[15px] font-semibold transition-all ios-press ${
                  isActive
                    ? 'bg-primary-50 text-primary-500'
                    : 'text-ios-text hover:bg-ios-gray'
                }`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="p-3 border-t border-ios-border space-y-2">
          {cashier ? (
            <Button
              variant="outline"
              onClick={() => setActiveCashier(null)}
              className="w-full justify-start gap-3 h-12 rounded-2xl"
              data-testid="sidebar-cashier-logout"
            >
              <LogOut className="h-4 w-4" /> Salir cajero
            </Button>
          ) : null}
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-3 h-12 rounded-2xl text-destructive hover:bg-destructive/10 hover:text-destructive"
            data-testid="sidebar-logout-button"
          >
            <LogOut className="h-4 w-4" /> Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-hidden flex flex-col safe-top" data-testid="app-main">
        <Outlet />
      </main>

      {/* Bottom Tab Bar (mobile) */}
      <nav className="md:hidden glass border-t border-ios-border safe-bottom" data-testid="mobile-bottom-nav">
        <div className="flex items-stretch justify-around overflow-x-auto no-scrollbar">
          {NAV.slice(0, 5).map(({ to, label, icon: Icon, testId }) => (
            <NavLink
              key={to}
              to={to}
              data-testid={`mobile-${testId}`}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] flex-1 ${
                  isActive ? 'text-primary-500' : 'text-ios-secondary'
                }`
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span className="text-[10px] font-semibold">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
};

export default AppLayout;
