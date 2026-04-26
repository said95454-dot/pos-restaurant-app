import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LogOut, User, Mail, Calendar } from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white" data-testid="dashboard-title">
            Dashboard
          </h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white"
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Cerrar Sesión
          </Button>
        </div>

        {/* Welcome Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-xl shadow-2xl mb-6">
          <CardHeader>
            <CardTitle className="text-xl text-white">
              ¡Bienvenido, {user?.name}!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Has iniciado sesión correctamente
            </CardDescription>
          </CardHeader>
        </Card>

        {/* User Info Card */}
        <Card className="border-slate-700 bg-slate-800/50 backdrop-blur-xl shadow-2xl">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Perfil
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
              <User className="h-5 w-5 text-blue-400" />
              <div>
                <p className="text-sm text-slate-400">Nombre</p>
                <p className="text-white font-medium" data-testid="user-name">{user?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
              <Mail className="h-5 w-5 text-green-400" />
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white font-medium" data-testid="user-email">{user?.email}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/50">
              <Calendar className="h-5 w-5 text-purple-400" />
              <div>
                <p className="text-sm text-slate-400">Miembro desde</p>
                <p className="text-white font-medium" data-testid="user-created">
                  {user?.created_at ? formatDate(user.created_at) : '-'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardPage;
