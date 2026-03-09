import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface DailyStats {
  date: string;
  total_orders: number;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
}

interface TopProduct {
  product_name: string;
  quantity_sold: number;
  total_revenue: number;
}

interface Order {
  id: string;
  customer_name: string;
  total: number;
  payment_method: string;
  created_at: string;
  items: any[];
}

interface CashRegisterClose {
  id: string;
  date: string;
  close_time: string;
  total_orders: number;
  total_sales: number;
  cash_sales: number;
  card_sales: number;
  transfer_sales: number;
  initial_cash: number;
  expected_cash: number;
  actual_cash: number;
  difference: number;
  notes: string;
  closed_by: string;
}

export default function CorteCajaScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [todayOrders, setTodayOrders] = useState<Order[]>([]);
  const [isClosed, setIsClosed] = useState(false);
  const [closeData, setCloseData] = useState<CashRegisterClose | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [closeHistory, setCloseHistory] = useState<CashRegisterClose[]>([]);
  const [user, setUser] = useState<any>(null);
  
  // Form state for closing
  const [initialCash, setInitialCash] = useState('0');
  const [actualCash, setActualCash] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dailyProfit, setDailyProfit] = useState(0); // Ganancias del día

  const today = format(new Date(), 'yyyy-MM-dd');
  const todayFormatted = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });

  useEffect(() => {
    loadUserAndData();
  }, []);

  const loadUserAndData = async () => {
    try {
      const userData = await storage.getUser();
      setUser(userData);
      await loadAllData();
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadAllData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [statsRes, topRes, ordersRes, closeRes] = await Promise.all([
        api.getDailySales(today),
        api.getTopProducts(today, 5),
        api.getOrders(today),
        api.getCashRegisterClose(today),
      ]);

      setDailyStats(statsRes);
      setTopProducts(topRes.top_products || []);
      setTodayOrders(ordersRes || []);
      
      if (closeRes.closed) {
        setIsClosed(true);
        setCloseData(closeRes.data);
      } else {
        setIsClosed(false);
        setCloseData(null);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  }, []);

  const loadHistory = async () => {
    try {
      const history = await api.getCashRegisterCloses(30);
      setCloseHistory(history);
      setShowHistoryModal(true);
    } catch (error) {
      console.error('Error loading history:', error);
      Alert.alert('Error', 'No se pudo cargar el historial');
    }
  };

  const handleOpenCloseModal = () => {
    if (!dailyStats) return;
    
    // Pre-fill actual cash with expected (initial + cash sales)
    const expectedCash = parseFloat(initialCash) + dailyStats.cash_sales;
    setActualCash(expectedCash.toFixed(2));
    setShowCloseModal(true);
  };

  // Función para generar el HTML del recibo
  const generateReceiptHTML = () => {
    const actualCashNum = parseFloat(actualCash) || 0;
    const initialCashNum = parseFloat(initialCash) || 0;
    const expectedCash = initialCashNum + (dailyStats?.cash_sales || 0);
    const difference = actualCashNum - expectedCash;
    const profit = dailyProfit;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Corte de Caja - ${todayFormatted}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 15px; margin-bottom: 20px; }
          .header h1 { color: #f59e0b; font-size: 22px; }
          .header p { color: #666; font-size: 12px; margin-top: 5px; }
          .total-box { background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0; }
          .total-box .label { font-size: 12px; color: #92400e; }
          .total-box .amount { font-size: 28px; font-weight: bold; color: #d97706; }
          .profit-box { background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center; margin: 15px 0; }
          .profit-box .label { font-size: 12px; color: #166534; }
          .profit-box .amount { font-size: 28px; font-weight: bold; color: #10b981; }
          .section { margin-bottom: 15px; }
          .section-title { font-weight: bold; color: #333; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; font-size: 14px; }
          .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px dotted #eee; font-size: 13px; }
          .label { color: #666; }
          .value { font-weight: bold; color: #333; }
          .difference { font-weight: bold; color: ${difference >= 0 ? '#10b981' : '#ef4444'}; }
          .footer { text-align: center; margin-top: 20px; padding-top: 15px; border-top: 2px solid #f59e0b; color: #999; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CORTE DE CAJA</h1>
          <p>${todayFormatted}</p>
          <p>Cerrado por: ${user?.username || 'Gerente'}</p>
        </div>

        <div class="total-box">
          <div class="label">VENTAS TOTALES</div>
          <div class="amount">$${dailyStats?.total_sales.toFixed(2) || '0.00'}</div>
        </div>

        <div class="profit-box">
          <div class="label">GANANCIAS DEL DÍA</div>
          <div class="amount">$${profit.toFixed(2)}</div>
        </div>

        <div class="section">
          <div class="section-title">Resumen de Ventas</div>
          <div class="row"><span class="label">Total de Órdenes:</span><span class="value">${dailyStats?.total_orders || 0}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Desglose por Método de Pago</div>
          <div class="row"><span class="label">Efectivo:</span><span class="value">$${dailyStats?.cash_sales.toFixed(2) || '0.00'}</span></div>
          <div class="row"><span class="label">Tarjeta:</span><span class="value">$${dailyStats?.card_sales.toFixed(2) || '0.00'}</span></div>
          <div class="row"><span class="label">Transferencia:</span><span class="value">$${dailyStats?.transfer_sales.toFixed(2) || '0.00'}</span></div>
        </div>

        <div class="section">
          <div class="section-title">Arqueo de Caja</div>
          <div class="row"><span class="label">Fondo Inicial:</span><span class="value">$${initialCashNum.toFixed(2)}</span></div>
          <div class="row"><span class="label">Efectivo Esperado:</span><span class="value">$${expectedCash.toFixed(2)}</span></div>
          <div class="row"><span class="label">Efectivo Real:</span><span class="value">$${actualCashNum.toFixed(2)}</span></div>
          <div class="row"><span class="label">Diferencia:</span><span class="difference">${difference >= 0 ? '+' : ''}$${difference.toFixed(2)}</span></div>
        </div>

        ${notes ? `<div class="section"><div class="section-title">Notas</div><p style="color:#666;font-size:12px;">${notes}</p></div>` : ''}

        <div class="footer">
          <p>Documento generado: ${format(new Date(), "dd/MM/yyyy HH:mm:ss")}</p>
        </div>
      </body>
      </html>
    `;
  };

  // Función para generar y mostrar PDF
  const generateAndSharePDF = async () => {
    const html = generateReceiptHTML();
    
    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.log('Error PDF:', error);
    }
  };

  // Función para imprimir directamente
  const printReceipt = async () => {
    const html = generateReceiptHTML();
    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.log('Error print:', error);
    }
  };

  const handleCloseCashRegister = async () => {
    if (!dailyStats) {
      Alert.alert('Error', 'No hay datos del día para cerrar');
      return;
    }

    const actualCashNum = parseFloat(actualCash) || 0;
    const initialCashNum = parseFloat(initialCash) || 0;
    const expectedCash = initialCashNum + dailyStats.cash_sales;
    const difference = actualCashNum - expectedCash;

    Alert.alert(
      '¿Confirmar Corte de Caja?',
      `Ventas: $${dailyStats.total_sales.toFixed(2)}\nGanancias: $${dailyProfit.toFixed(2)}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setSubmitting(true);
              
              await api.closeCashRegister({
                date: today,
                total_orders: dailyStats.total_orders,
                total_sales: dailyStats.total_sales,
                cash_sales: dailyStats.cash_sales,
                card_sales: dailyStats.card_sales,
                transfer_sales: dailyStats.transfer_sales,
                initial_cash: initialCashNum,
                actual_cash: actualCashNum,
                notes: notes,
                closed_by: user?.username || 'Gerente',
              });

              setShowCloseModal(false);
              setSubmitting(false);
              
              // Preguntar qué hacer con el recibo
              Alert.alert(
                '✅ Corte Exitoso',
                '¿Qué deseas hacer con el recibo?',
                [
                  {
                    text: 'Imprimir',
                    onPress: async () => {
                      await printReceipt();
                      router.replace('/manager/dashboard');
                    },
                  },
                  {
                    text: 'Guardar PDF',
                    onPress: async () => {
                      await generateAndSharePDF();
                      router.replace('/manager/dashboard');
                    },
                  },
                  {
                    text: 'Solo Cerrar',
                    onPress: () => router.replace('/manager/dashboard'),
                  },
                ]
              );
              
            } catch (error: any) {
              setSubmitting(false);
              Alert.alert('Error', error.message || 'No se pudo realizar el corte');
            }
          },
        },
      ]
    );
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return 'cash';
      case 'card': return 'card';
      case 'transfer': return 'phone-portrait';
      default: return 'help-circle';
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return '#10b981';
      case 'card': return '#6366f1';
      case 'transfer': return '#8b5cf6';
      default: return '#64748b';
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return method;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f59e0b" />
        <Text style={styles.loadingText}>Cargando datos del día...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={loadHistory} style={styles.headerButton}>
              <Ionicons name="time" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onRefresh} style={styles.headerButton}>
              <Ionicons name="refresh" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerTitle}>Corte de Caja</Text>
        <Text style={styles.headerDate}>{todayFormatted}</Text>
        
        {isClosed && (
          <View style={styles.closedBadge}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={styles.closedBadgeText}>CERRADO</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#f59e0b']} />
        }
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.cardTitle}>Resumen del Día</Text>
            {dailyStats && (
              <View style={styles.ordersCount}>
                <Ionicons name="receipt" size={18} color="#6366f1" />
                <Text style={styles.ordersCountText}>{dailyStats.total_orders} órdenes</Text>
              </View>
            )}
          </View>

          {dailyStats && (
            <>
              <View style={styles.totalSalesBox}>
                <Text style={styles.totalSalesLabel}>Ventas Totales</Text>
                <Text style={styles.totalSalesValue}>${dailyStats.total_sales.toFixed(2)}</Text>
              </View>

              {/* Ganancias del Día */}
              <View style={styles.profitBox}>
                <View style={styles.profitHeader}>
                  <Ionicons name="trending-up" size={24} color="#10b981" />
                  <Text style={styles.profitTitle}>Ganancias del Día</Text>
                </View>
                <TextInput
                  style={styles.profitInput}
                  value={dailyProfit.toString()}
                  onChangeText={(text) => setDailyProfit(parseFloat(text) || 0)}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <Text style={styles.profitHint}>Ingresa las ganancias estimadas del día</Text>
              </View>

              <View style={styles.paymentBreakdown}>
                <View style={styles.paymentItem}>
                  <View style={styles.paymentIcon}>
                    <Ionicons name="cash" size={24} color="#10b981" />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentLabel}>Efectivo</Text>
                    <Text style={styles.paymentValue}>${dailyStats.cash_sales.toFixed(2)}</Text>
                  </View>
                </View>
                
                <View style={styles.paymentItem}>
                  <View style={styles.paymentIcon}>
                    <Ionicons name="card" size={24} color="#6366f1" />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentLabel}>Tarjeta</Text>
                    <Text style={styles.paymentValue}>${dailyStats.card_sales.toFixed(2)}</Text>
                  </View>
                </View>
                
                <View style={styles.paymentItem}>
                  <View style={styles.paymentIcon}>
                    <Ionicons name="phone-portrait" size={24} color="#8b5cf6" />
                  </View>
                  <View style={styles.paymentInfo}>
                    <Text style={styles.paymentLabel}>Transferencia</Text>
                    <Text style={styles.paymentValue}>${dailyStats.transfer_sales.toFixed(2)}</Text>
                  </View>
                </View>
              </View>
            </>
          )}
        </View>

        {/* Top Products */}
        {topProducts.length > 0 && (
          <View style={styles.topProductsCard}>
            <Text style={styles.cardTitle}>Productos Más Vendidos</Text>
            {topProducts.map((product, index) => (
              <View key={index} style={styles.topProductItem}>
                <View style={styles.topProductRank}>
                  <Text style={styles.topProductRankText}>{index + 1}</Text>
                </View>
                <View style={styles.topProductInfo}>
                  <Text style={styles.topProductName}>{product.product_name}</Text>
                  <Text style={styles.topProductQuantity}>{product.quantity_sold} vendidos</Text>
                </View>
                <Text style={styles.topProductRevenue}>${product.total_revenue.toFixed(2)}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Today's Orders */}
        <View style={styles.ordersCard}>
          <Text style={styles.cardTitle}>Órdenes del Día ({todayOrders.length})</Text>
          {todayOrders.length === 0 ? (
            <View style={styles.emptyOrders}>
              <Ionicons name="receipt-outline" size={48} color="#cbd5e1" />
              <Text style={styles.emptyOrdersText}>No hay órdenes registradas hoy</Text>
            </View>
          ) : (
            <View style={styles.ordersList}>
              {todayOrders.slice(0, 10).map((order) => (
                <View key={order.id} style={styles.orderItem}>
                  <View style={styles.orderInfo}>
                    <Text style={styles.orderCustomer}>{order.customer_name || 'Cliente'}</Text>
                    <Text style={styles.orderTime}>
                      {format(new Date(order.created_at), 'HH:mm')} - {order.items?.length || 0} productos
                    </Text>
                  </View>
                  <View style={styles.orderRight}>
                    <Ionicons 
                      name={getPaymentMethodIcon(order.payment_method)} 
                      size={18} 
                      color={getPaymentMethodColor(order.payment_method)} 
                    />
                    <Text style={styles.orderTotal}>${order.total.toFixed(2)}</Text>
                  </View>
                </View>
              ))}
              {todayOrders.length > 10 && (
                <Text style={styles.moreOrders}>
                  +{todayOrders.length - 10} órdenes más...
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Close Cash Register Section */}
        {isClosed && closeData ? (
          <View style={styles.closedCard}>
            <View style={styles.closedHeader}>
              <Ionicons name="checkmark-circle" size={32} color="#10b981" />
              <Text style={styles.closedTitle}>Caja Cerrada</Text>
            </View>
            <Text style={styles.closedBy}>
              Cerrado por: {closeData.closed_by} a las {format(new Date(closeData.close_time), 'HH:mm')}
            </Text>
            <View style={styles.closedDetails}>
              <View style={styles.closedRow}>
                <Text style={styles.closedLabel}>Fondo Inicial:</Text>
                <Text style={styles.closedValue}>${closeData.initial_cash.toFixed(2)}</Text>
              </View>
              <View style={styles.closedRow}>
                <Text style={styles.closedLabel}>Efectivo Esperado:</Text>
                <Text style={styles.closedValue}>${closeData.expected_cash.toFixed(2)}</Text>
              </View>
              <View style={styles.closedRow}>
                <Text style={styles.closedLabel}>Efectivo Real:</Text>
                <Text style={styles.closedValue}>${closeData.actual_cash.toFixed(2)}</Text>
              </View>
              <View style={[styles.closedRow, styles.differenceRow]}>
                <Text style={styles.closedLabel}>Diferencia:</Text>
                <Text style={[
                  styles.closedValue,
                  { color: closeData.difference >= 0 ? '#10b981' : '#ef4444' }
                ]}>
                  {closeData.difference >= 0 ? '+' : ''}${closeData.difference.toFixed(2)}
                </Text>
              </View>
            </View>
            {closeData.notes ? (
              <View style={styles.notesBox}>
                <Text style={styles.notesLabel}>Notas:</Text>
                <Text style={styles.notesText}>{closeData.notes}</Text>
              </View>
            ) : null}
          </View>
        ) : (
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleOpenCloseModal}
            activeOpacity={0.8}
          >
            <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.closeButtonGradient}>
              <Ionicons name="lock-closed" size={28} color="white" />
              <Text style={styles.closeButtonText}>Realizar Corte de Caja</Text>
              <Text style={styles.closeButtonSubtext}>Cerrar el día y registrar efectivo</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Close Cash Register Modal */}
      <Modal
        visible={showCloseModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCloseModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Corte de Caja</Text>
              <TouchableOpacity onPress={() => setShowCloseModal(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Summary */}
              {dailyStats && (
                <View style={styles.modalSummary}>
                  <Text style={styles.modalSummaryTitle}>Resumen de Ventas</Text>
                  <View style={styles.modalSummaryRow}>
                    <Text>Total Órdenes:</Text>
                    <Text style={styles.modalSummaryValue}>{dailyStats.total_orders}</Text>
                  </View>
                  <View style={styles.modalSummaryRow}>
                    <Text>Ventas Totales:</Text>
                    <Text style={styles.modalSummaryValue}>${dailyStats.total_sales.toFixed(2)}</Text>
                  </View>
                  <View style={styles.modalSummaryRow}>
                    <Text>Ventas en Efectivo:</Text>
                    <Text style={[styles.modalSummaryValue, { color: '#10b981' }]}>
                      ${dailyStats.cash_sales.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Form */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Fondo de Caja Inicial</Text>
                <TextInput
                  style={styles.input}
                  value={initialCash}
                  onChangeText={setInitialCash}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <Text style={styles.formHint}>
                  Cantidad con la que iniciaste el día
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Efectivo Real en Caja</Text>
                <TextInput
                  style={styles.input}
                  value={actualCash}
                  onChangeText={setActualCash}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                />
                <Text style={styles.formHint}>
                  Cuenta el efectivo físico en caja
                </Text>
              </View>

              {dailyStats && (
                <View style={styles.expectedBox}>
                  <Text style={styles.expectedLabel}>Efectivo Esperado:</Text>
                  <Text style={styles.expectedValue}>
                    ${(parseFloat(initialCash || '0') + dailyStats.cash_sales).toFixed(2)}
                  </Text>
                  <Text style={styles.expectedHint}>
                    (Fondo inicial + Ventas en efectivo)
                  </Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Notas (Opcional)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Observaciones del día..."
                  multiline
                  numberOfLines={3}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCloseModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmButton}
                onPress={handleCloseCashRegister}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="lock-closed" size={20} color="white" />
                    <Text style={styles.confirmButtonText}>Cerrar Caja</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* History Modal */}
      <Modal
        visible={showHistoryModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowHistoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historial de Cortes</Text>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.historyList}>
              {closeHistory.length === 0 ? (
                <View style={styles.emptyHistory}>
                  <Ionicons name="time-outline" size={48} color="#cbd5e1" />
                  <Text style={styles.emptyHistoryText}>No hay cortes registrados</Text>
                </View>
              ) : (
                closeHistory.map((close) => (
                  <View key={close.id} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <Text style={styles.historyDate}>
                        {format(new Date(close.date), "d 'de' MMMM, yyyy", { locale: es })}
                      </Text>
                      <View style={[
                        styles.historyDifference,
                        { backgroundColor: close.difference >= 0 ? '#dcfce7' : '#fee2e2' }
                      ]}>
                        <Text style={[
                          styles.historyDifferenceText,
                          { color: close.difference >= 0 ? '#10b981' : '#ef4444' }
                        ]}>
                          {close.difference >= 0 ? '+' : ''}${close.difference.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyDetailText}>
                        {close.total_orders} órdenes • ${close.total_sales.toFixed(2)} ventas
                      </Text>
                      <Text style={styles.historyDetailText}>
                        Cerrado por {close.closed_by}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#64748b',
  },
  header: {
    paddingTop: 48,
    paddingBottom: 20,
    paddingHorizontal: 16,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerButton: {
    padding: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: 'white',
  },
  headerDate: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  closedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  closedBadgeText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
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
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  ordersCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  ordersCountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6366f1',
  },
  totalSalesBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  totalSalesLabel: {
    fontSize: 14,
    color: '#92400e',
    marginBottom: 4,
  },
  totalSalesValue: {
    fontSize: 36,
    fontWeight: '700',
    color: '#d97706',
  },
  paymentBreakdown: {
    gap: 12,
  },
  paymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
  },
  paymentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  paymentValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  profitBox: {
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  profitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  profitTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#166534',
  },
  profitInput: {
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 24,
    fontWeight: '700',
    color: '#10b981',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  profitHint: {
    fontSize: 12,
    color: '#15803d',
    textAlign: 'center',
    marginTop: 8,
  },
  topProductsCard: {
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
  topProductItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  topProductRank: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f59e0b',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topProductRankText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  topProductQuantity: {
    fontSize: 12,
    color: '#64748b',
  },
  topProductRevenue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  ordersCard: {
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
  emptyOrders: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyOrdersText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  ordersList: {
    marginTop: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  orderInfo: {
    flex: 1,
  },
  orderCustomer: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  orderTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  orderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  moreOrders: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 12,
    fontStyle: 'italic',
  },
  closedCard: {
    backgroundColor: '#dcfce7',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#10b981',
  },
  closedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  closedTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#166534',
  },
  closedBy: {
    fontSize: 14,
    color: '#15803d',
    marginBottom: 16,
  },
  closedDetails: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  closedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  differenceRow: {
    borderBottomWidth: 0,
    paddingTop: 12,
  },
  closedLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  closedValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
  },
  notesBox: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#1e293b',
  },
  closeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  closeButtonGradient: {
    paddingVertical: 24,
    alignItems: 'center',
    gap: 8,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  closeButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalBody: {
    padding: 20,
  },
  modalSummary: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  modalSummaryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  modalSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  modalSummaryValue: {
    fontWeight: '700',
    color: '#1e293b',
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  formHint: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    backgroundColor: '#f8fafc',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  expectedBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  expectedLabel: {
    fontSize: 14,
    color: '#92400e',
  },
  expectedValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#d97706',
    marginVertical: 4,
  },
  expectedHint: {
    fontSize: 12,
    color: '#a16207',
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  // History Modal
  historyList: {
    padding: 20,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyHistoryText: {
    marginTop: 12,
    fontSize: 14,
    color: '#94a3b8',
  },
  historyItem: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  historyDifference: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  historyDifferenceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  historyDetails: {
    gap: 4,
  },
  historyDetailText: {
    fontSize: 13,
    color: '#64748b',
  },
});
