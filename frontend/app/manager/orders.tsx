import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { format } from 'date-fns';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface Order {
  id: string;
  customer_name: string;
  total: number;
  payment_method: string;
  created_at: string;
  items: any[];
}

export default function OrdersScreen() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('Mi Negocio');
  const [printing, setPrinting] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
    loadBusiness();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadBusiness = async () => {
    try {
      const data = await api.getBusiness();
      setBusinessName(data.name);
    } catch (error) {
      console.error('Error loading business:', error);
    }
  };

  const handlePrintOrder = async (orderId: string) => {
    // Buscar la orden específica por ID
    const orderToPrint = orders.find(o => o.id === orderId);
    
    if (!orderToPrint) {
      Alert.alert('Error', 'Orden no encontrada');
      return;
    }
    
    // VERIFICACIÓN: Mostrar qué orden se va a imprimir
    const confirmation = `¿Imprimir ticket para:\n\nCliente: ${orderToPrint.customer_name}\nTotal: $${orderToPrint.total.toFixed(2)}\nProductos: ${orderToPrint.items.length} items\n\n¿Es correcto?`;
    
    Alert.alert('Confirmar Impresión', confirmation, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sí, Imprimir',
        onPress: async () => {
          setPrinting(orderId);
          
          try {
            // Crear HTML SOLO con esta orden
            const ticketHTML = generateSingleTicket(orderToPrint);
            
            console.log('=== IMPRIMIENDO ===');
            console.log('Cliente:', orderToPrint.customer_name);
            console.log('Items:', orderToPrint.items.length);
            
            // En web, usar window.print con el HTML generado
            if (Platform.OS === 'web') {
              // Crear una nueva ventana con el ticket
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                printWindow.document.write(ticketHTML);
                printWindow.document.close();
                printWindow.focus();
                
                // Dar tiempo para cargar y luego imprimir
                setTimeout(() => {
                  printWindow.print();
                }, 500);
                
                await api.markOrderPrinted(orderId);
                Alert.alert('✅ Éxito', `Ticket listo para imprimir: ${orderToPrint.customer_name}`);
              }
            } else {
              // En móvil, usar expo-print
              const { uri } = await Print.printToFileAsync({ 
                html: ticketHTML,
                base64: false
              });
              
              await Sharing.shareAsync(uri, {
                mimeType: 'application/pdf',
                dialogTitle: `Ticket - ${orderToPrint.customer_name}`,
              });
              
              await api.markOrderPrinted(orderId);
              Alert.alert('✅ Éxito', `Ticket impreso para: ${orderToPrint.customer_name}`);
            }
          } catch (error) {
            console.error('Error printing order:', error);
            Alert.alert('Error', 'No se pudo generar el ticket');
          } finally {
            setPrinting(null);
          }
        }
      }
    ]);
  };

  const generateSingleTicket = (singleOrder: Order) => {
    console.log('===== GENERANDO TICKET =====');
    console.log('Cliente:', singleOrder.customer_name);
    console.log('ID de orden:', singleOrder.id);
    console.log('Total items en esta orden:', singleOrder.items.length);
    console.log('Items:', JSON.stringify(singleOrder.items, null, 2));
    
    // Construir HTML manualmente item por item
    let productRows = '';
    
    // IMPORTANTE: Solo iterar sobre los items de ESTA orden
    const orderItems = singleOrder.items;
    
    console.log('Iterando sobre', orderItems.length, 'items');
    
    for (let i = 0; i < orderItems.length; i++) {
      const item = orderItems[i];
      console.log(`Item ${i + 1}:`, item.product_name, 'x', item.quantity);
      
      productRows += `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #ddd;">
            ${item.product_name} x${item.quantity}
          </td>
          <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">
            $${item.subtotal.toFixed(2)}
          </td>
        </tr>`;
      
      // Opciones del producto - soporta nuevo formato (array) y viejo formato (objeto)
      if (item.selected_options) {
        const opts = item.selected_options;
        
        // Nuevo formato: array de strings
        if (Array.isArray(opts)) {
          for (const opt of opts) {
            productRows += `<tr><td colspan="2" style="padding: 4px 8px 4px 24px; font-size: 12px; color: #666;">• ${opt}</td></tr>`;
          }
        } 
        // Viejo formato: objeto con booleanos
        else if (typeof opts === 'object') {
          if (opts.with_onion) productRows += `<tr><td colspan="2" style="padding: 4px 8px 4px 24px; font-size: 12px; color: #666;">• Con cebolla</td></tr>`;
          if (opts.with_cilantro) productRows += `<tr><td colspan="2" style="padding: 4px 8px 4px 24px; font-size: 12px; color: #666;">• Con cilantro</td></tr>`;
          if (opts.with_sauce) productRows += `<tr><td colspan="2" style="padding: 4px 8px 4px 24px; font-size: 12px; color: #666;">• Con salsa</td></tr>`;
          if (opts.with_cream) productRows += `<tr><td colspan="2" style="padding: 4px 8px 4px 24px; font-size: 12px; color: #666;">• Con crema</td></tr>`;
        }
      }
    }
    
    console.log('productRows length:', productRows.length);
    console.log('productRows preview:', productRows.substring(0, 200));
    
    const paymentText = 
      singleOrder.payment_method === 'cash' ? 'Efectivo' :
      singleOrder.payment_method === 'card' ? 'Tarjeta' : 'Transferencia';
    
    const finalHTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Ticket - ${singleOrder.customer_name}</title>
  <style>
    @page { margin: 20px; size: letter; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: Arial, sans-serif; 
      padding: 30px;
      max-width: 600px;
      margin: 0 auto;
    }
    h1 { text-align: center; color: #333; margin-bottom: 30px; font-size: 28px; }
    .info-line { margin-bottom: 12px; font-size: 14px; line-height: 1.6; }
    .label { font-weight: bold; }
    table { width: 100%; border-collapse: collapse; margin-top: 30px; }
    th { padding: 12px 8px; border-bottom: 2px solid #333; text-align: left; font-size: 14px; }
    th.right { text-align: right; }
    .total-row td { padding: 20px 8px 8px 8px; border-top: 2px solid #333; font-size: 20px; font-weight: bold; }
    .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
  </style>
</head>
<body>
  <h1>${businessName}</h1>
  <div class="info-line"><span class="label">Cliente:</span> ${singleOrder.customer_name}</div>
  <div class="info-line"><span class="label">Fecha:</span> ${new Date(singleOrder.created_at).toLocaleString('es-MX')}</div>
  <div class="info-line"><span class="label">Método de pago:</span> ${paymentText}</div>
  <table>
    <thead>
      <tr><th>Producto</th><th class="right">Precio</th></tr>
    </thead>
    <tbody>
      ${productRows}
      <tr class="total-row">
        <td>TOTAL</td>
        <td style="text-align: right;">$${singleOrder.total.toFixed(2)}</td>
      </tr>
    </tbody>
  </table>
  <div class="footer">¡Gracias por su compra!</div>
</body>
</html>`;

    console.log('HTML Final length:', finalHTML.length);
    console.log('HTML contiene cliente:', finalHTML.includes(singleOrder.customer_name) ? 'SÍ' : 'NO');
    console.log('===== FIN GENERACIÓN =====');
    
    return finalHTML;
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return 'cash';
      case 'card':
        return 'card';
      case 'transfer':
        return 'phone-portrait';
      default:
        return 'cash';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo';
      case 'card':
        return 'Tarjeta';
      case 'transfer':
        return 'Transferencia';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Historial de Órdenes</Text>
        <TouchableOpacity onPress={loadOrders}>
          <Ionicons name="refresh" size={24} color="white" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {orders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyText}>No hay órdenes</Text>
          </View>
        ) : (
          orders.map((order) => (
            <View key={order.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View style={styles.orderHeaderLeft}>
                  <Ionicons name="person" size={20} color="#6366f1" />
                  <Text style={styles.customerName}>{order.customer_name}</Text>
                </View>
                <View style={styles.paymentBadge}>
                  <Ionicons
                    name={getPaymentMethodIcon(order.payment_method) as any}
                    size={16}
                    color="#059669"
                  />
                  <Text style={styles.paymentBadgeText}>
                    {getPaymentMethodLabel(order.payment_method)}
                  </Text>
                </View>
              </View>

              <Text style={styles.orderDate}>
                {format(new Date(order.created_at), 'dd/MM/yyyy HH:mm')}
              </Text>

              <View style={styles.orderItems}>
                {order.items.map((item, index) => (
                  <View key={index} style={styles.orderItem}>
                    <Text style={styles.itemName}>
                      {item.quantity}x {item.product_name}
                    </Text>
                    <Text style={styles.itemPrice}>${item.subtotal.toFixed(2)}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.orderTotal}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmount}>${order.total.toFixed(2)}</Text>
              </View>
            </View>
          ))
        )}
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
  },
  orderDate: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  orderItems: {
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    marginBottom: 12,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemName: {
    fontSize: 14,
    color: '#475569',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#6366f1',
  },
  printButton: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  printButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  printButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
});
