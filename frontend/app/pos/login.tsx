import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';
import { storage } from '../../utils/storage';

interface Cashier {
  id: string;
  name: string;
  has_pin: boolean;
  has_password: boolean;
  active: boolean;
}

export default function CashierLoginScreen() {
  const router = useRouter();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCashier, setSelectedCashier] = useState<Cashier | null>(null);
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [showPinPad, setShowPinPad] = useState(false);
  const [showPasswordInput, setShowPasswordInput] = useState(false);

  useEffect(() => {
    loadCashiers();
  }, []);

  const loadCashiers = async () => {
    try {
      const data = await api.getCashiers();
      const activeCashiers = data.filter((c: any) => c.active);
      setCashiers(activeCashiers);
      
      // Si no hay cajeros, ir directo al POS
      if (activeCashiers.length === 0) {
        router.replace('/pos');
      }
    } catch (error) {
      console.error('Error:', error);
      // Si hay error, ir al POS sin cajero
      router.replace('/pos');
    } finally {
      setLoading(false);
    }
  };

  const selectCashier = (cashier: Cashier) => {
    setSelectedCashier(cashier);
    setPin('');
    setPassword('');
    
    // Mostrar el método de autenticación apropiado
    if (cashier.has_pin) {
      setShowPinPad(true);
      setShowPasswordInput(false);
    } else if (cashier.has_password) {
      setShowPinPad(false);
      setShowPasswordInput(true);
    }
  };

  const handlePinInput = async (digit: string) => {
    const newPin = pin + digit;
    setPin(newPin);
    
    if (newPin.length === 4) {
      await loginWithPin(newPin);
    }
  };

  const handleDeletePin = () => {
    setPin(pin.slice(0, -1));
  };

  const loginWithPin = async (pinCode: string) => {
    setLoggingIn(true);
    try {
      const result = await api.loginCashier({ pin: pinCode });
      await storage.setCashier({ id: result.cashier_id, name: result.name });
      router.replace('/pos');
    } catch (error) {
      Alert.alert('Error', 'PIN incorrecto');
      setPin('');
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePasswordLogin = async () => {
    if (!selectedCashier || !password) {
      Alert.alert('Error', 'Ingresa tu contraseña');
      return;
    }
    
    setLoggingIn(true);
    try {
      const result = await api.loginCashier({ 
        cashier_id: selectedCashier.id, 
        password: password 
      });
      await storage.setCashier({ id: result.cashier_id, name: result.name });
      router.replace('/pos');
    } catch (error) {
      Alert.alert('Error', 'Contraseña incorrecta');
    } finally {
      setLoggingIn(false);
    }
  };

  const goBack = () => {
    if (showPinPad || showPasswordInput) {
      setShowPinPad(false);
      setShowPasswordInput(false);
      setSelectedCashier(null);
      setPin('');
      setPassword('');
    } else {
      router.back();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#1e1b4b', '#312e81', '#4338ca']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={goBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Selección de Cajero */}
      {!showPinPad && !showPasswordInput && (
        <View style={styles.selectCashierContainer}>
          <View style={styles.iconContainer}>
            <Ionicons name="people" size={60} color="white" />
          </View>
          <Text style={styles.title}>¿Quién eres?</Text>
          <Text style={styles.subtitle}>Selecciona tu nombre para continuar</Text>

          <ScrollView style={styles.cashierList} contentContainerStyle={styles.cashierListContent}>
            {cashiers.map((cashier) => (
              <TouchableOpacity
                key={cashier.id}
                style={styles.cashierCard}
                onPress={() => selectCashier(cashier)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['rgba(255,255,255,0.15)', 'rgba(255,255,255,0.05)']}
                  style={styles.cashierCardGradient}
                >
                  <View style={styles.cashierAvatar}>
                    <Ionicons name="person" size={32} color="white" />
                  </View>
                  <Text style={styles.cashierCardName}>{cashier.name}</Text>
                  <View style={styles.authIndicator}>
                    {cashier.has_pin && (
                      <Ionicons name="keypad" size={18} color="#10b981" />
                    )}
                    {cashier.has_password && (
                      <Ionicons name="lock-closed" size={18} color="#a78bfa" />
                    )}
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* PIN Pad */}
      {showPinPad && selectedCashier && (
        <View style={styles.authContainer}>
          <View style={styles.selectedCashierInfo}>
            <View style={styles.selectedAvatar}>
              <Ionicons name="person" size={40} color="white" />
            </View>
            <Text style={styles.selectedName}>{selectedCashier.name}</Text>
          </View>

          <Text style={styles.authTitle}>Ingresa tu PIN</Text>

          {/* PIN Display */}
          <View style={styles.pinDisplay}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={[styles.pinDot, pin.length > i && styles.pinDotFilled]} />
            ))}
          </View>

          {/* PIN Pad */}
          <View style={styles.pinPad}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <TouchableOpacity
                key={num}
                style={styles.pinButton}
                onPress={() => handlePinInput(num.toString())}
                disabled={loggingIn}
              >
                <Text style={styles.pinButtonText}>{num}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.pinButtonEmpty} />
            <TouchableOpacity
              style={styles.pinButton}
              onPress={() => handlePinInput('0')}
              disabled={loggingIn}
            >
              <Text style={styles.pinButtonText}>0</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pinButton}
              onPress={handleDeletePin}
              disabled={loggingIn}
            >
              <Ionicons name="backspace" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {/* Opción de usar contraseña si tiene ambos */}
          {selectedCashier.has_password && (
            <TouchableOpacity 
              style={styles.switchAuthButton}
              onPress={() => {
                setShowPinPad(false);
                setShowPasswordInput(true);
                setPin('');
              }}
            >
              <Text style={styles.switchAuthText}>Usar contraseña</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Password Input */}
      {showPasswordInput && selectedCashier && (
        <View style={styles.authContainer}>
          <View style={styles.selectedCashierInfo}>
            <View style={styles.selectedAvatar}>
              <Ionicons name="person" size={40} color="white" />
            </View>
            <Text style={styles.selectedName}>{selectedCashier.name}</Text>
          </View>

          <Text style={styles.authTitle}>Ingresa tu contraseña</Text>

          <View style={styles.passwordContainer}>
            <TextInput
              style={styles.passwordInput}
              value={password}
              onChangeText={setPassword}
              placeholder="Contraseña"
              placeholderTextColor="rgba(255,255,255,0.5)"
              secureTextEntry
              autoFocus
            />
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handlePasswordLogin}
              disabled={loggingIn}
            >
              {loggingIn ? (
                <ActivityIndicator color="white" />
              ) : (
                <Ionicons name="arrow-forward" size={24} color="white" />
              )}
            </TouchableOpacity>
          </View>

          {/* Opción de usar PIN si tiene ambos */}
          {selectedCashier.has_pin && (
            <TouchableOpacity 
              style={styles.switchAuthButton}
              onPress={() => {
                setShowPasswordInput(false);
                setShowPinPad(true);
                setPassword('');
              }}
            >
              <Text style={styles.switchAuthText}>Usar PIN</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {loggingIn && (
        <View style={styles.loggingOverlay}>
          <ActivityIndicator size="large" color="white" />
          <Text style={styles.loggingText}>Verificando...</Text>
        </View>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#1e1b4b' },
  header: { paddingTop: 50, paddingHorizontal: 20 },
  backButton: { padding: 8 },
  
  // Selección de cajero
  selectCashierContainer: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },
  iconContainer: { 
    width: 100, 
    height: 100, 
    borderRadius: 50, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    justifyContent: 'center', 
    alignItems: 'center',
    marginTop: 20,
  },
  title: { fontSize: 28, fontWeight: '800', color: 'white', marginTop: 20 },
  subtitle: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginTop: 8, marginBottom: 30 },
  cashierList: { flex: 1, width: '100%' },
  cashierListContent: { paddingBottom: 20 },
  cashierCard: { marginBottom: 12, borderRadius: 16, overflow: 'hidden' },
  cashierCardGradient: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    gap: 16,
  },
  cashierAvatar: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cashierCardName: { flex: 1, fontSize: 18, fontWeight: '700', color: 'white' },
  authIndicator: { flexDirection: 'row', gap: 8 },

  // Auth container (PIN/Password)
  authContainer: { flex: 1, alignItems: 'center', paddingHorizontal: 20 },
  selectedCashierInfo: { alignItems: 'center', marginTop: 10, marginBottom: 20 },
  selectedAvatar: { 
    width: 80, 
    height: 80, 
    borderRadius: 40, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  selectedName: { fontSize: 24, fontWeight: '700', color: 'white', marginTop: 12 },
  authTitle: { fontSize: 16, color: 'rgba(255,255,255,0.7)', marginBottom: 20 },

  // PIN
  pinDisplay: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginBottom: 30 },
  pinDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
  pinDotFilled: { backgroundColor: '#10b981', borderColor: '#10b981' },
  pinPad: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15, maxWidth: 280 },
  pinButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
  pinButtonEmpty: { width: 70, height: 70 },
  pinButtonText: { fontSize: 28, fontWeight: '700', color: 'white' },

  // Password
  passwordContainer: { flexDirection: 'row', width: '100%', gap: 12 },
  passwordInput: { 
    flex: 1, 
    backgroundColor: 'rgba(255,255,255,0.1)', 
    borderRadius: 12, 
    paddingHorizontal: 20, 
    paddingVertical: 16, 
    color: 'white', 
    fontSize: 16 
  },
  loginButton: { 
    backgroundColor: '#10b981', 
    width: 56, 
    borderRadius: 12, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },

  // Switch auth method
  switchAuthButton: { marginTop: 30 },
  switchAuthText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, textDecorationLine: 'underline' },

  // Overlay
  loggingOverlay: { 
    position: 'absolute', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  loggingText: { color: 'white', marginTop: 16, fontSize: 16 },
});
