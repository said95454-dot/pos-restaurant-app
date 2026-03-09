import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  custom_options: string[];
}

interface CartItem {
  product_id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  selected_options: string[];
  subtotal: number;
}

interface Cashier {
  id: string;
  name: string;
}

export default function POSScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [businessName, setBusinessName] = useState('Mi Negocio');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [cashier, setCashier] = useState<Cashier | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountReceived, setAmountReceived] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [showDailyHistory, setShowDailyHistory] = useState(false);
  const [showCashierSales, setShowCashierSales] = useState(false);
  const [dailyOrders, setDailyOrders] = useState<any[]>([]);
  const [cashierOrders, setCashierOrders] = useState<any[]>([]);
  
  // Animation for shine effect
  const shineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadData();
    
    // Start shine animation (slower and smoother)
    Animated.loop(
      Animated.sequence([
        Animated.timing(shineAnim, {
          toValue: 1,
          duration: 3500, // Más lento (3.5 segundos)
          useNativeDriver: true,
        }),
        Animated.timing(shineAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const loadData = async () => {
    try {
      // Cargar cajero actual
      const currentCashier = await storage.getCashier();
      setCashier(currentCashier);
      
      const [productsData, businessData] = await Promise.all([
        api.getProducts(),
        api.getBusiness(),
      ]);
      setProducts(productsData);
      setBusinessName(businessData.name);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const loadDailyOrders = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const allOrders = await api.getOrders(today);
      setDailyOrders(allOrders);
      setShowDailyHistory(true);
    } catch (error) {
      console.error('Error loading daily orders:', error);
      Alert.alert('Error', 'No se pudieron cargar las órdenes del día');
    }
  };

  const loadCashierSales = async () => {
    try {
      if (!cashier) {
        Alert.alert('Error', 'No hay cajero logueado');
        return;
      }
      
      console.log('Loading sales for cashier:', cashier.name, cashier.id);
      
      // Intentar cargar TODAS las órdenes sin filtro de fecha
      let allOrders = [];
      try {
        allOrders = await api.getOrders(); // Sin parámetro de fecha
        console.log('Total orders loaded:', allOrders.length);
      } catch (apiError: any) {
        console.error('API error:', apiError);
        setCashierOrders([]);
        setShowCashierSales(true);
        return;
      }
      
      if (!Array.isArray(allOrders)) {
        console.error('Orders is not an array:', allOrders);
        setCashierOrders([]);
        setShowCashierSales(true);
        return;
      }
      
      // Filtrar por cajero Y por fecha de hoy manualmente
      const today = new Date().toISOString().split('T')[0];
      const mySales = allOrders.filter((order: any) => {
        if (!order || !order.cashier_id) return false;
        
        // Verificar que sea del cajero
        const orderCashierId = String(order.cashier_id);
        const currentCashierId = String(cashier.id);
        const isMyCashier = orderCashierId === currentCashierId;
        
        // Verificar que sea de hoy
        const orderDate = order.created_at ? new Date(order.created_at).toISOString().split('T')[0] : null;
        const isToday = orderDate === today;
        
        return isMyCashier && isToday;
      });
      
      console.log('My sales today:', mySales.length);
      
      setCashierOrders(mySales);
      setShowCashierSales(true);
    } catch (error: any) {
      console.error('Error loading cashier sales:', error);
      setCashierOrders([]);
      setShowCashierSales(true);
    }
  };

  const addToCart = (product: Product, options: string[]) => {
    const existingItemIndex = cart.findIndex(
      (item) =>
        item.product_id === product.id &&
        JSON.stringify(item.selected_options) === JSON.stringify(options)
    );

    if (existingItemIndex >= 0) {
      const newCart = [...cart];
      newCart[existingItemIndex].quantity += 1;
      newCart[existingItemIndex].subtotal =
        newCart[existingItemIndex].quantity * product.price;
      setCart(newCart);
    } else {
      const newItem: CartItem = {
        product_id: product.id,
        product_name: product.name,
        product_price: product.price,
        quantity: 1,
        selected_options: options,
        subtotal: product.price,
      };
      setCart([...cart, newItem]);
    }
    setShowCustomizeModal(false);
  };

  // Función para agregar bebida directamente (sin opciones)
  const addBeverageToCart = (product: Product) => {
    addToCart(product, []);
  };

  // Función para manejar click en producto
  const handleProductClick = (product: Product) => {
    if (product.category === 'bebida' || !product.custom_options || product.custom_options.length === 0) {
      // Bebidas o productos sin opciones: agregar directo al carrito
      addToCart(product, []);
    } else {
      // Comidas con opciones: mostrar modal de personalización
      setSelectedProduct(product);
      setShowCustomizeModal(true);
    }
  };

  const removeFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const updateQuantity = (index: number, delta: number) => {
    const newCart = [...cart];
    newCart[index].quantity += delta;
    if (newCart[index].quantity <= 0) {
      newCart.splice(index, 1);
    } else {
      newCart[index].subtotal =
        newCart[index].quantity * newCart[index].product_price;
    }
    setCart(newCart);
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calculateChange = () => {
    const total = calculateTotal();
    const received = parseFloat(amountReceived) || 0;
    return received - total;
  };

  const handleCheckout = async () => {
    if (!customerName.trim()) {
      Alert.alert('Error', 'Por favor ingresa el nombre del cliente');
      return;
    }

    if (cart.length === 0) {
      Alert.alert('Error', 'El carrito está vacío');
      return;
    }

    // Validar monto recibido si el pago es en efectivo
    if (paymentMethod === 'cash') {
      const received = parseFloat(amountReceived) || 0;
      const total = calculateTotal();
      
      if (received === 0) {
        Alert.alert('Error', 'Ingresa el monto recibido del cliente');
        return;
      }
      
      if (received < total) {
        Alert.alert('Error', `El monto recibido ($${received.toFixed(2)}) es menor al total ($${total.toFixed(2)})`);
        return;
      }
    }

    setProcessing(true);
    try {
      const orderData: any = {
        customer_name: customerName,
        items: cart,
        total: calculateTotal(),
        payment_method: paymentMethod,
        cashier_id: cashier?.id || null,
        cashier_name: cashier?.name || null,
      };

      // Agregar información de cambio si es pago en efectivo
      if (paymentMethod === 'cash') {
        orderData.amount_received = parseFloat(amountReceived);
        orderData.change = calculateChange();
      }

      const createdOrder = await api.createOrder(orderData);
      
      setProcessing(false);
      setShowCheckoutModal(false);
      
      // Mostrar opciones de ticket
      showTicketOptions(createdOrder);
      
    } catch (error) {
      console.error('Error creating order:', error);
      setProcessing(false);
      Alert.alert('Error', 'No se pudo crear la orden');
    }
  };

  const resetOrderState = () => {
    setCart([]);
    setCustomerName('');
    setPaymentMethod('cash');
    setAmountReceived('');
  };

  const showTicketOptions = (order: any) => {
    Alert.alert(
      '✅ Orden Completada',
      'Selecciona una opción para el ticket:',
      [
        {
          text: '🖨️ Imprimir (AirPrint)',
          onPress: () => handlePrintTicket(order),
        },
        {
          text: '📄 Guardar PDF',
          onPress: () => handleSaveTicket(order),
        },
        {
          text: '📧 Enviar por Email',
          onPress: () => handleEmailTicket(order),
        },
        {
          text: '📱 Compartir',
          onPress: () => handleShareTicket(order),
        },
        {
          text: 'Cerrar',
          style: 'cancel',
          onPress: () => resetOrderState(),
        },
      ],
      { cancelable: false }
    );
  };

  const handleSaveTicket = async (order: any) => {
    try {
      const html = await generateReceipt(order);
      const { uri } = await Print.printToFileAsync({ html });
      
      // Compartir/Guardar el PDF
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Guardar Ticket',
          UTI: 'com.adobe.pdf',
        });
        // Si llegó aquí, el usuario compartió exitosamente
        resetOrderState();
      } else {
        Alert.alert('Éxito', 'Ticket guardado en: ' + uri);
        resetOrderState();
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const isCancellation = 
        errorMessage.includes('cancel') ||
        errorMessage.includes('User cancelled') ||
        errorMessage.includes('dismissed');
      
      if (isCancellation) {
        // Usuario canceló, volver a opciones sin error en consola
        showTicketOptions(order);
      } else {
        // Error real
        console.error('Error saving ticket:', error);
        Alert.alert('Error', 'No se pudo guardar el ticket', [
          {
            text: 'Reintentar',
            onPress: () => showTicketOptions(order),
          },
        ]);
      }
    }
  };

  const handlePrintTicket = async (order: any) => {
    try {
      const result = await Print.printAsync({ 
        html: await generateReceipt(order),
        printerUrl: undefined,
      });
      // Si llegó aquí sin error, la impresión se completó
      resetOrderState();
    } catch (error: any) {
      // Manejo silencioso de cancelación
      const errorMessage = error?.message || '';
      const isCancellation = 
        errorMessage.includes('cancel') || 
        errorMessage.includes('User') ||
        errorMessage.includes('did not complete') ||
        error.code === 'E_PRINT_INCOMPLETE';
      
      if (isCancellation) {
        // Usuario canceló, volver a opciones sin mostrar error en consola
        showTicketOptions(order);
      } else {
        // Error real, registrar y mostrar opciones
        console.error('Error printing ticket:', error);
        showTicketOptions(order);
      }
    }
  };

  const handleEmailTicket = async (order: any) => {
    try {
      const html = await generateReceipt(order);
      const { uri } = await Print.printToFileAsync({ html });
      
      // Compartir específicamente por email
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Enviar ticket por email',
          UTI: 'com.adobe.pdf',
        });
        resetOrderState();
      } else {
        Alert.alert('Error', 'No se puede compartir en este dispositivo');
        showTicketOptions(order);
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const isCancellation = 
        errorMessage.includes('cancel') ||
        errorMessage.includes('User cancelled') ||
        errorMessage.includes('dismissed');
      
      if (isCancellation) {
        showTicketOptions(order);
      } else {
        console.error('Error emailing ticket:', error);
        Alert.alert('Error', 'No se pudo enviar el ticket', [
          {
            text: 'Reintentar',
            onPress: () => showTicketOptions(order),
          },
        ]);
      }
    }
  };

  const handleShareTicket = async (order: any) => {
    try {
      const html = await generateReceipt(order);
      const { uri } = await Print.printToFileAsync({ html });
      
      // Abrir menú de compartir completo (WhatsApp, Drive, etc.)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartir ticket',
          UTI: 'com.adobe.pdf',
        });
        resetOrderState();
      } else {
        Alert.alert('Éxito', 'Ticket guardado en: ' + uri);
        resetOrderState();
      }
    } catch (error: any) {
      const errorMessage = error?.message || '';
      const isCancellation = 
        errorMessage.includes('cancel') ||
        errorMessage.includes('User cancelled') ||
        errorMessage.includes('dismissed');
      
      if (isCancellation) {
        showTicketOptions(order);
      } else {
        console.error('Error sharing ticket:', error);
        Alert.alert('Error', 'No se pudo compartir el ticket', [
          {
            text: 'Reintentar',
            onPress: () => showTicketOptions(order),
          },
        ]);
      }
    }
  };

  const generateReceipt = async (order: any) => {
    const itemsHtml = order.items
      .map(
        (item: CartItem) => {
          // Opciones personalizadas
          const optionsHtml = item.selected_options && item.selected_options.length > 0
            ? item.selected_options.map(option => `
              <tr>
                <td colspan="2" style="padding: 2px 8px 2px 24px; font-size: 11px; color: #666;">
                  • ${option}
                </td>
              </tr>
            `).join('')
            : '';

          return `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${item.product_name} x${item.quantity}</td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: right;">$${item.subtotal.toFixed(2)}</td>
            </tr>
            ${optionsHtml}
          `;
        }
      )
      .join('');

    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            @page {
              margin: 20px;
            }
            body { 
              font-family: Arial, sans-serif; 
              padding: 10px;
              font-size: 14px;
            }
            h1 { 
              text-align: center; 
              color: #333;
              font-size: 20px;
              margin-bottom: 10px;
            }
            p {
              margin: 4px 0;
              font-size: 13px;
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-top: 15px;
            }
            th {
              padding: 8px;
              border-bottom: 2px solid #333;
              text-align: left;
              font-size: 13px;
            }
            td {
              font-size: 13px;
            }
            .total { 
              font-size: 16px; 
              font-weight: bold;
            }
            .payment-details {
              margin-top: 15px;
              padding: 12px;
              background-color: #f8fafc;
              border-radius: 8px;
            }
            .payment-row {
              display: flex;
              justify-content: space-between;
              padding: 4px 0;
              font-size: 14px;
            }
            .change-highlight {
              background-color: #dcfce7;
              padding: 8px;
              border-radius: 6px;
              margin-top: 8px;
              font-weight: bold;
              color: #166534;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              color: #666;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <h1>${businessName}</h1>
          <p><strong>Cliente:</strong> ${order.customer_name}</p>
          <p><strong>Fecha:</strong> ${new Date().toLocaleString('es-MX')}</p>
          <p><strong>Cajero:</strong> ${order.cashier_name || 'N/A'}</p>
          <p><strong>Método de pago:</strong> ${
            order.payment_method === 'cash' ? 'Efectivo' : 
            order.payment_method === 'card' ? 'Tarjeta' : 
            'Transferencia'
          }</p>
          <table>
            <thead>
              <tr>
                <th>Producto</th>
                <th style="text-align: right;">Precio</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
              <tr>
                <td class="total" style="padding: 16px 8px 8px 8px; border-top: 2px solid #333;">TOTAL</td>
                <td class="total" style="padding: 16px 8px 8px 8px; border-top: 2px solid #333; text-align: right;">$${order.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
          ${order.payment_method === 'cash' && order.amount_received ? `
            <div class="payment-details">
              <div class="payment-row">
                <span><strong>Recibido:</strong></span>
                <span><strong>$${order.amount_received.toFixed(2)}</strong></span>
              </div>
              <div class="change-highlight">
                <div class="payment-row">
                  <span>CAMBIO:</span>
                  <span style="font-size: 18px;">$${order.change.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ` : ''}
          <p class="footer">¡Gracias por su compra!</p>
        </body>
      </html>
    `;

    return html;
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
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          {/* Resplandor de fondo */}
          <View style={styles.glowBackground} />
          
          {/* Texto con efecto de brillo animado */}
          <View style={styles.textWrapper}>
            <Animated.View
              style={[
                styles.shineEffect,
                {
                  transform: [
                    {
                      translateX: shineAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-300, 300],
                      }),
                    },
                  ],
                },
              ]}
            />
            <Text style={styles.headerTitle}>{businessName}</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          {cashier && (
            <TouchableOpacity 
              style={styles.cashierBadge}
              onPress={() => {
                Alert.alert(
                  'Cerrar Sesión',
                  `¿${cashier.name} desea cerrar sesión?`,
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { 
                      text: 'Salir', 
                      style: 'destructive',
                      onPress: async () => {
                        await storage.removeCashier();
                        router.replace('/');
                      }
                    },
                  ]
                );
              }}
            >
              <Ionicons name="person" size={16} color="white" />
              <Text style={styles.cashierName}>{cashier.name}</Text>
            </TouchableOpacity>
          )}
          {cashier && (
            <TouchableOpacity onPress={loadCashierSales} style={styles.historyButton}>
              <Ionicons name="cash" size={24} color="white" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={loadDailyOrders} style={styles.historyButton}>
            <Ionicons name="list" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowCheckoutModal(true)}>
            <View style={styles.cartBadge}>
              <Ionicons name="cart" size={24} color="white" />
              {cart.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{cart.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Products Grid */}
      <ScrollView style={styles.content} contentContainerStyle={styles.productsGrid}>
        {products.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cube-outline" size={64} color="#94a3b8" />
            <Text style={styles.emptyText}>No hay productos disponibles</Text>
            <Text style={styles.emptySubtext}>El gerente debe agregar productos</Text>
          </View>
        ) : (
          products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={[
                styles.productCard,
                product.category === 'bebida' && styles.beverageCard
              ]}
              onPress={() => handleProductClick(product)}
              activeOpacity={0.7}
            >
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  style={styles.productImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.productImage, styles.noImage]}>
                  <Ionicons 
                    name={product.category === 'bebida' ? 'beer' : 'fast-food'} 
                    size={48} 
                    color={product.category === 'bebida' ? '#06b6d4' : '#94a3b8'} 
                  />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={[
                  styles.productPrice,
                  product.category === 'bebida' && styles.beveragePrice
                ]}>${product.price.toFixed(2)}</Text>
                {product.category === 'bebida' && (
                  <View style={styles.beverageBadge}>
                    <Text style={styles.beverageBadgeText}>Bebida</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Customize Modal */}
      <Modal
        visible={showCustomizeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCustomizeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedProduct && (
              <CustomizeProduct
                product={selectedProduct}
                onAdd={addToCart}
                onCancel={() => setShowCustomizeModal(false)}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Checkout Modal */}
      <Modal
        visible={showCheckoutModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCheckoutModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.checkoutContainer}
        >
          <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.checkoutHeader}>
            <TouchableOpacity onPress={() => setShowCheckoutModal(false)}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.checkoutTitle}>Finalizar Orden</Text>
            <View style={{ width: 28 }} />
          </LinearGradient>

          <ScrollView style={styles.checkoutContent}>
            {/* Customer Name */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nombre del Cliente</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Ingresa el nombre"
                placeholderTextColor="#94a3b8"
              />
            </View>

            {/* Cart Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Productos ({cart.length})</Text>
              {cart.map((item, index) => (
                <View key={index} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product_name}</Text>
                    {item.selected_options && item.selected_options.length > 0 && (
                      item.selected_options.map((option, optIndex) => (
                        <Text key={optIndex} style={styles.cartItemOption}>
                          • {option}
                        </Text>
                      ))
                    )}
                    <Text style={styles.cartItemPrice}>
                      ${item.product_price.toFixed(2)} x {item.quantity} = ${item.subtotal.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      onPress={() => updateQuantity(index, -1)}
                      style={styles.quantityButton}
                    >
                      <Ionicons name="remove" size={20} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.quantityText}>{item.quantity}</Text>
                    <TouchableOpacity
                      onPress={() => updateQuantity(index, 1)}
                      style={styles.quantityButton}
                    >
                      <Ionicons name="add" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            {/* Payment Method */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Método de Pago</Text>
              <View style={styles.paymentMethods}>
                {[
                  { value: 'cash', label: 'Efectivo', icon: 'cash' },
                  { value: 'card', label: 'Tarjeta', icon: 'card' },
                  { value: 'transfer', label: 'Transferencia', icon: 'phone-portrait' },
                ].map((method) => (
                  <TouchableOpacity
                    key={method.value}
                    style={[
                      styles.paymentMethod,
                      paymentMethod === method.value && styles.paymentMethodActive,
                    ]}
                    onPress={() => setPaymentMethod(method.value)}
                  >
                    <Ionicons
                      name={method.icon as any}
                      size={32}
                      color={paymentMethod === method.value ? '#6366f1' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.paymentMethodText,
                        paymentMethod === method.value && styles.paymentMethodTextActive,
                      ]}
                    >
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Cash Payment Details */}
            {paymentMethod === 'cash' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Detalles de Pago</Text>
                <View style={styles.cashPaymentContainer}>
                  <Text style={styles.cashLabel}>Monto Recibido</Text>
                  <TextInput
                    style={styles.cashInput}
                    value={amountReceived}
                    onChangeText={setAmountReceived}
                    placeholder="$0.00"
                    placeholderTextColor="#94a3b8"
                    keyboardType="decimal-pad"
                  />
                  
                  {amountReceived && parseFloat(amountReceived) >= calculateTotal() && (
                    <View style={styles.changeContainer}>
                      <Text style={styles.changeLabel}>Cambio</Text>
                      <Text style={styles.changeAmount}>
                        ${calculateChange().toFixed(2)}
                      </Text>
                    </View>
                  )}
                  
                  {amountReceived && parseFloat(amountReceived) < calculateTotal() && (
                    <View style={styles.warningContainer}>
                      <Ionicons name="warning" size={20} color="#ef4444" />
                      <Text style={styles.warningText}>
                        Falta: ${(calculateTotal() - parseFloat(amountReceived)).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Total */}
            <View style={styles.totalContainer}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalAmount}>${calculateTotal().toFixed(2)}</Text>
            </View>

            {/* Complete Button */}
            <TouchableOpacity
              style={[styles.completeButton, processing && styles.completeButtonDisabled]}
              onPress={handleCheckout}
              disabled={processing}
            >
              <LinearGradient
                colors={processing ? ['#94a3b8', '#64748b'] : ['#10b981', '#059669']}
                style={styles.completeButtonGradient}
              >
                {processing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.completeButtonText}>Completar Orden</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Cashier Sales Modal */}
      <Modal
        visible={showCashierSales}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCashierSales(false)}
      >
        <View style={styles.historyContainer}>
          <LinearGradient colors={['#10b981', '#059669']} style={styles.historyHeader}>
            <TouchableOpacity onPress={() => setShowCashierSales(false)}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.historyTitle}>Mis Ventas</Text>
            <TouchableOpacity onPress={loadCashierSales}>
              <Ionicons name="refresh" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.historyContent}>
            {cashierOrders.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="cash-outline" size={64} color="#94a3b8" />
                <Text style={styles.emptyHistoryText}>No has registrado ventas hoy</Text>
                <Text style={styles.emptyHistorySubtext}>Tus ventas aparecerán aquí</Text>
              </View>
            ) : (
              <>
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Mi Resumen del Día</Text>
                  {cashier && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>Cajero:</Text>
                      <Text style={styles.summaryValue}>{cashier.name}</Text>
                    </View>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Órdenes Registradas:</Text>
                    <Text style={styles.summaryValue}>{cashierOrders.length}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Vendido:</Text>
                    <Text style={styles.summaryValueHighlight}>
                      ${cashierOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryDivider} />
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Efectivo:</Text>
                    <Text style={styles.summaryValue}>
                      ${cashierOrders
                        .filter(o => o.payment_method === 'cash')
                        .reduce((sum, order) => sum + order.total, 0)
                        .toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Tarjeta:</Text>
                    <Text style={styles.summaryValue}>
                      ${cashierOrders
                        .filter(o => o.payment_method === 'card')
                        .reduce((sum, order) => sum + order.total, 0)
                        .toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Transferencia:</Text>
                    <Text style={styles.summaryValue}>
                      ${cashierOrders
                        .filter(o => o.payment_method === 'transfer')
                        .reduce((sum, order) => sum + order.total, 0)
                        .toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Orders List */}
                {cashierOrders.map((order) => (
                  <View key={order.id} style={styles.historyOrderCard}>
                    <View style={styles.historyOrderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <Ionicons name="person" size={18} color="#10b981" />
                        <Text style={styles.historyCustomerName}>{order.customer_name}</Text>
                      </View>
                      <Text style={styles.historyOrderTime}>
                        {new Date(order.created_at).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.historyOrderItems}>
                      {order.items.map((item: any, idx: number) => (
                        <View key={idx}>
                          <Text style={styles.historyItem}>
                            {item.quantity}x {item.product_name} - ${item.subtotal.toFixed(2)}
                          </Text>
                          {item.selected_options && Array.isArray(item.selected_options) && item.selected_options.length > 0 && (
                            <Text style={styles.historyItemOptions}>
                              {item.selected_options.join(', ')}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                    <View style={styles.historyOrderFooter}>
                      <Text style={styles.historyPaymentMethod}>
                        {order.payment_method === 'cash' ? '💵 Efectivo' : 
                         order.payment_method === 'card' ? '💳 Tarjeta' : '📱 Transferencia'}
                      </Text>
                      <Text style={styles.historyOrderTotal}>
                        Total: ${order.total.toFixed(2)}
                      </Text>
                    </View>
                    {order.payment_method === 'cash' && order.change && (
                      <View style={styles.changeInfo}>
                        <Text style={styles.changeText}>
                          Recibido: ${order.amount_received?.toFixed(2)} | Cambio: ${order.change.toFixed(2)}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Daily History Modal */}
      <Modal
        visible={showDailyHistory}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowDailyHistory(false)}
      >
        <View style={styles.historyContainer}>
          <LinearGradient colors={['#8b5cf6', '#7c3aed']} style={styles.historyHeader}>
            <TouchableOpacity onPress={() => setShowDailyHistory(false)}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text style={styles.historyTitle}>Historial del Día</Text>
            <TouchableOpacity onPress={loadDailyOrders}>
              <Ionicons name="refresh" size={24} color="white" />
            </TouchableOpacity>
          </LinearGradient>

          <ScrollView style={styles.historyContent}>
            {dailyOrders.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Ionicons name="calendar-outline" size={64} color="#94a3b8" />
                <Text style={styles.emptyHistoryText}>No hay órdenes hoy</Text>
                <Text style={styles.emptyHistorySubtext}>Las órdenes aparecerán aquí</Text>
              </View>
            ) : (
              <>
                {/* Summary Card */}
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryTitle}>Resumen del Día</Text>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Órdenes:</Text>
                    <Text style={styles.summaryValue}>{dailyOrders.length}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Ventas:</Text>
                    <Text style={styles.summaryValueHighlight}>
                      ${dailyOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Orders List */}
                {dailyOrders.map((order) => (
                  <View key={order.id} style={styles.historyOrderCard}>
                    <View style={styles.historyOrderHeader}>
                      <View style={styles.orderHeaderLeft}>
                        <Ionicons name="person" size={18} color="#6366f1" />
                        <Text style={styles.historyCustomerName}>{order.customer_name}</Text>
                      </View>
                      <Text style={styles.historyOrderTime}>
                        {new Date(order.created_at).toLocaleTimeString('es-MX', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                    <View style={styles.historyOrderItems}>
                      {order.items.map((item: any, idx: number) => (
                        <View key={idx}>
                          <Text style={styles.historyItem}>
                            {item.quantity}x {item.product_name} - ${item.subtotal.toFixed(2)}
                          </Text>
                          {item.selected_options && Array.isArray(item.selected_options) && item.selected_options.length > 0 && (
                            <Text style={styles.historyItemOptions}>
                              {item.selected_options.join(', ')}
                            </Text>
                          )}
                        </View>
                      ))}
                    </View>
                    <View style={styles.historyOrderFooter}>
                      <Text style={styles.historyPaymentMethod}>
                        {order.payment_method === 'cash' ? '💵 Efectivo' : 
                         order.payment_method === 'card' ? '💳 Tarjeta' : '📱 Transferencia'}
                      </Text>
                      <Text style={styles.historyOrderTotal}>
                        Total: ${order.total.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

// Customize Product Component
function CustomizeProduct({
  product,
  onAdd,
  onCancel,
}: {
  product: Product;
  onAdd: (product: Product, options: string[]) => void;
  onCancel: () => void;
}) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>(
    product.custom_options || []
  );

  const toggleOption = (option: string) => {
    if (selectedOptions.includes(option)) {
      setSelectedOptions(selectedOptions.filter(o => o !== option));
    } else {
      setSelectedOptions([...selectedOptions, option]);
    }
  };

  return (
    <View style={styles.customizeContainer}>
      <Text style={styles.customizeTitle}>{product.name}</Text>
      <Text style={styles.customizePrice}>${product.price.toFixed(2)}</Text>

      {product.image && (
        <Image source={{ uri: product.image }} style={styles.customizeImage} resizeMode="cover" />
      )}

      {product.custom_options && product.custom_options.length > 0 && (
        <>
          <Text style={styles.customizeSubtitle}>Personaliza tu orden:</Text>
          <View style={styles.optionsList}>
            {product.custom_options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={styles.optionItem}
                onPress={() => toggleOption(option)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={selectedOptions.includes(option) ? 'checkbox' : 'square-outline'}
                  size={28}
                  color={selectedOptions.includes(option) ? '#6366f1' : '#94a3b8'}
                />
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <View style={styles.customizeButtons}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => onAdd(product, selectedOptions)}
          activeOpacity={0.8}
        >
          <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.addButtonGradient}>
            <Text style={styles.addButtonText}>Agregar al Carrito</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
  backButton: {
    padding: 8,
  },
  titleContainer: {
    position: 'relative',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  glowBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    borderRadius: 12,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  textWrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 8,
  },
  shineEffect: {
    position: 'absolute',
    top: -50,
    bottom: -50,
    width: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    transform: [{ skewX: '-20deg' }],
    shadowColor: 'rgba(255, 255, 255, 0.5)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
    textShadowColor: 'rgba(99, 102, 241, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  shineOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
  },
  cartBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  cashierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
    marginRight: 10,
  },
  cashierName: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  productsGrid: {
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    width: '47%',
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  productImage: {
    width: '100%',
    height: 150,
  },
  noImage: {
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6366f1',
  },
  beverageCard: {
    borderWidth: 2,
    borderColor: '#06b6d4',
  },
  beveragePrice: {
    color: '#06b6d4',
  },
  beverageBadge: {
    backgroundColor: '#06b6d4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  beverageBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    width: '100%',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 24,
  },
  customizeContainer: {
    alignItems: 'center',
  },
  customizeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  customizePrice: {
    fontSize: 28,
    fontWeight: '700',
    color: '#6366f1',
    marginTop: 8,
  },
  customizeImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginVertical: 16,
  },
  customizeSubtitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  optionsList: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  optionText: {
    fontSize: 16,
    color: '#334155',
  },
  customizeButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  addButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  addButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'white',
  },
  checkoutContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  checkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  checkoutTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  checkoutContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cartItemInfo: {
    flex: 1,
  },
  cartItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  cartItemOption: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  cartItemPrice: {
    fontSize: 14,
    color: '#6366f1',
    marginTop: 4,
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: '#6366f1',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    minWidth: 24,
    textAlign: 'center',
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: 12,
  },
  paymentMethod: {
    flex: 1,
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  paymentMethodActive: {
    borderColor: '#6366f1',
    backgroundColor: '#ede9fe',
  },
  paymentMethodText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  paymentMethodTextActive: {
    color: '#6366f1',
    fontWeight: '600',
  },
  cashPaymentContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  cashLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 8,
  },
  cashInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  changeContainer: {
    marginTop: 16,
    backgroundColor: '#dcfce7',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#166534',
  },
  changeAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#15803d',
  },
  warningContainer: {
    marginTop: 16,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#991b1b',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
  },
  totalAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366f1',
  },
  completeButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 32,
  },
  completeButtonDisabled: {
    opacity: 0.6,
  },
  completeButtonGradient: {
    paddingVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  historyButton: {
    padding: 8,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  historyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  historyContent: {
    flex: 1,
    padding: 16,
  },
  emptyHistory: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyHistoryText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 16,
  },
  emptyHistorySubtext: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 8,
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
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#64748b',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
  },
  summaryValueHighlight: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10b981',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#e2e8f0',
    marginVertical: 8,
  },
  changeInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  changeText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  historyOrderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyOrderHeader: {
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
  historyCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  historyOrderTime: {
    fontSize: 14,
    color: '#64748b',
  },
  historyOrderItems: {
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  historyItem: {
    fontSize: 14,
    color: '#475569',
    paddingVertical: 4,
  },
  historyItemOptions: {
    fontSize: 12,
    color: '#10b981',
    paddingLeft: 16,
    fontStyle: 'italic',
  },
  historyOrderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  historyPaymentMethod: {
    fontSize: 14,
    color: '#64748b',
  },
  historyOrderTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
});
