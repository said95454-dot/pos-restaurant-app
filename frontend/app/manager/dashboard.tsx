import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { format } from 'date-fns';

export default function ManagerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const userData = await storage.getUser();
      if (!userData) {
        router.replace('/manager/login');
        return;
      }
      setUser(userData);
      await loadStats();
    } catch (error) {
      console.error('Error checking auth:', error);
      router.replace('/manager/login');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const dailyStats = await api.getDailySales();
      setStats(dailyStats);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Salir',
        style: 'destructive',
        onPress: async () => {
          await storage.removeUser();
          router.replace('/manager/login');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Panel de Gerente</Text>
        <Text style={styles.headerSubtitle}>Bienvenido, {user?.username}</Text>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Daily Stats */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Ventas de Hoy</Text>
            <Text style={styles.statsDate}>{format(new Date(), 'd MMMM yyyy')}</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Ionicons name="receipt" size={32} color="#6366f1" />
                <Text style={styles.statValue}>{stats.total_orders}</Text>
                <Text style={styles.statLabel}>Órdenes</Text>
              </View>
              <View style={styles.statItem}>
                <Ionicons name="cash" size={32} color="#10b981" />
                <Text style={styles.statValue}>${stats.total_sales.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Ventas</Text>
              </View>
            </View>
            <View style={styles.paymentBreakdown}>
              <Text style={styles.breakdownTitle}>Desglose por Método de Pago:</Text>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Efectivo:</Text>
                <Text style={styles.breakdownValue}>${stats.cash_sales.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Tarjeta:</Text>
                <Text style={styles.breakdownValue}>${stats.card_sales.toFixed(2)}</Text>
              </View>
              <View style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>Transferencia:</Text>
                <Text style={styles.breakdownValue}>${stats.transfer_sales.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Menu */}
        <View style={styles.menuGrid}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/manager/products')}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.menuItemGradient}>
              <Ionicons name="fast-food" size={40} color="white" />
              <Text style={styles.menuItemText}>Productos</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/manager/bebidas')}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.menuItemGradient}>
              <Ionicons name="beer" size={40} color="white" />
              <Text style={styles.menuItemText}>Bebidas</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/manager/orders')}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.menuItemGradient}>
              <Ionicons name="receipt" size={40} color="white" />
              <Text style={styles.menuItemText}>Historial</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/manager/business')}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.menuItemGradient}>
              <Ionicons name="business" size={40} color="white" />
              <Text style={styles.menuItemText}>Negocio</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/manager/cajeros')}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#10b981', '#059669']} style={styles.menuItemGradient}>
              <Ionicons name="people" size={40} color="white" />
              <Text style={styles.menuItemText}>Cajeros</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/manager/reports')}
            activeOpacity={0.7}
          >
            <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.menuItemGradient}>
              <Ionicons name="bar-chart" size={40} color="white" />
              <Text style={styles.menuItemText}>Reportes</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Corte de Caja Button */}
        <TouchableOpacity
          style={styles.corteCajaButton}
          onPress={() => router.push('/manager/corte-caja')}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.corteCajaGradient}>
            <Ionicons name="lock-closed" size={28} color="white" />
            <View style={styles.corteCajaText}>
              <Text style={styles.corteCajaTitle}>Corte de Caja</Text>
              <Text style={styles.corteCajaSubtitle}>Cierre del día y arqueo</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  statsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  statsDate: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  paymentBreakdown: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
  },
  breakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  breakdownLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  menuItem: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuItemGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  corteCajaButton: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  corteCajaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
    gap: 16,
  },
  corteCajaText: {
    flex: 1,
  },
  corteCajaTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  corteCajaSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
});
