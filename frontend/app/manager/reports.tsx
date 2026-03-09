import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { format } from 'date-fns';

export default function ReportsScreen() {
  const router = useRouter();
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const stats = await api.getDailySales(today);
      setDailyStats(stats);
    } catch (error) {
      console.error('Error loading stats:', error);
      Alert.alert('Error', 'No se pudieron cargar las estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseCashRegister = () => {
    Alert.alert(
      'Corte de Caja',
      `Resumen del día:\n\nTotal Órdenes: ${dailyStats.total_orders}\nVentas Totales: $${dailyStats.total_sales.toFixed(2)}\n\nEfectivo: $${dailyStats.cash_sales.toFixed(2)}\nTarjeta: $${dailyStats.card_sales.toFixed(2)}\nTransferencia: $${dailyStats.transfer_sales.toFixed(2)}\n\n¿Confirmar cierre?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            Alert.alert('Éxito', 'Corte de caja registrado');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reportes y Estadísticas</Text>
        <TouchableOpacity onPress={loadStats}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Daily Summary */}
        <View style={styles.summaryCard}>
          <Text style={styles.cardTitle}>Resumen de Hoy</Text>
          <Text style={styles.dateText}>{format(new Date(), 'dd MMMM yyyy')}</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Ionicons name="receipt" size={40} color="#6366f1" />
              <Text style={styles.statValue}>{dailyStats.total_orders}</Text>
              <Text style={styles.statLabel}>Órdenes</Text>
            </View>
            <View style={styles.statBox}>
              <Ionicons name="trending-up" size={40} color="#10b981" />
              <Text style={styles.statValue}>${dailyStats.total_sales.toFixed(2)}</Text>
              <Text style={styles.statLabel}>Ventas</Text>
            </View>
          </View>
        </View>

        {/* Payment Methods Breakdown */}
        <View style={styles.breakdownCard}>
          <Text style={styles.cardTitle}>Desglose por Método de Pago</Text>

          <View style={styles.methodItem}>
            <View style={styles.methodInfo}>
              <Ionicons name="cash" size={24} color="#10b981" />
              <Text style={styles.methodLabel}>Efectivo</Text>
            </View>
            <Text style={styles.methodValue}>${dailyStats.cash_sales.toFixed(2)}</Text>
          </View>

          <View style={styles.methodItem}>
            <View style={styles.methodInfo}>
              <Ionicons name="card" size={24} color="#6366f1" />
              <Text style={styles.methodLabel}>Tarjeta</Text>
            </View>
            <Text style={styles.methodValue}>${dailyStats.card_sales.toFixed(2)}</Text>
          </View>

          <View style={styles.methodItem}>
            <View style={styles.methodInfo}>
              <Ionicons name="phone-portrait" size={24} color="#8b5cf6" />
              <Text style={styles.methodLabel}>Transferencia</Text>
            </View>
            <Text style={styles.methodValue}>${dailyStats.transfer_sales.toFixed(2)}</Text>
          </View>
        </View>

        {/* Close Cash Register */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleCloseCashRegister}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.closeButtonGradient}>
            <Ionicons name="lock-closed" size={24} color="white" />
            <Text style={styles.closeButtonText}>Realizar Corte de Caja</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statBox: {
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
  breakdownCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  methodItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  methodInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  methodLabel: {
    fontSize: 16,
    color: '#475569',
  },
  methodValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  closeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  closeButtonGradient: {
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
});
