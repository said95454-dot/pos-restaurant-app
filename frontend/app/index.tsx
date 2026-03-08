import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Animated,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { storage } from '../utils/storage';
import { api } from '../utils/api';

const { width, height } = Dimensions.get('window');
const isSmallScreen = height < 700;

export default function Home() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [hasCashiers, setHasCashiers] = useState(false);
  const [checkingCashiers, setCheckingCashiers] = useState(true);
  const pulseAnim = new Animated.Value(1);
  const floatAnim = new Animated.Value(0);

  useEffect(() => {
    checkSession();
    startAnimations();
  }, []);

  // Verificar cajeros cada vez que la pantalla obtiene el foco
  useFocusEffect(
    React.useCallback(() => {
      checkCashiers();
    }, [])
  );

  const startAnimations = () => {
    // Pulsing animation for the icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: -20,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const checkSession = async () => {
    setLoading(false);
  };

  const checkCashiers = async () => {
    try {
      const cashiers = await api.getCashiers();
      // Verificar si hay al menos un cajero activo
      const activeCashiers = cashiers.filter((c: any) => c.is_active);
      setHasCashiers(activeCashiers.length > 0);
    } catch (error) {
      console.error('Error checking cashiers:', error);
      setHasCashiers(false);
    } finally {
      setCheckingCashiers(false);
    }
  };

  const handlePOSPress = () => {
    if (!hasCashiers) {
      Alert.alert(
        'Sin Cajeros Registrados',
        'Debes crear al menos un cajero en el panel de Administración antes de acceder al Punto de Venta.',
        [
          {
            text: 'Ir a Administración',
            onPress: () => router.push('/manager/login'),
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
      return;
    }
    router.push('/pos/login');
  };

  const handleManagerPress = () => {
    router.push('/manager/login');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#00f0ff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Background */}
      <LinearGradient
        colors={['#0a0a1a', '#1a0a2e', '#16213e', '#0f3460']}
        style={styles.background}
      >
        {/* Animated circles background */}
        <View style={styles.circlesContainer}>
          <View style={[styles.circle, styles.circle1]} />
          <View style={[styles.circle, styles.circle2]} />
          <View style={[styles.circle, styles.circle3]} />
        </View>

        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            {/* Logo/Title with animation */}
            <Animated.View 
              style={[
                styles.header,
                {
                  transform: [
                    { translateY: floatAnim },
                    { scale: pulseAnim }
                  ]
                }
              ]}
            >
              <LinearGradient
                colors={['#00f0ff', '#0080ff', '#00f0ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconGlow}
              >
                <Ionicons name="restaurant" size={50} color="white" />
              </LinearGradient>
              <Text style={styles.title}>SISTEMA POS</Text>
              <Text style={styles.subtitle}>PUNTO DE VENTA DEL FUTURO</Text>
            </Animated.View>

            {/* Action Buttons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={styles.mainButton}
                onPress={handlePOSPress}
                activeOpacity={hasCashiers ? 0.8 : 1}
                disabled={checkingCashiers}
              >
                <LinearGradient
                  colors={hasCashiers 
                    ? ['#00f0ff', '#0080ff', '#0040ff']
                    : ['#666666', '#444444', '#333333']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  {checkingCashiers ? (
                    <ActivityIndicator size="large" color="white" />
                  ) : (
                    <>
                      <Ionicons name="cart" size={40} color="white" />
                      <Text style={styles.buttonText}>PUNTO DE VENTA</Text>
                      <Text style={styles.buttonSubtext}>
                        {hasCashiers ? 'TOMAR ÓRDENES' : '⚠️ SIN CAJEROS'}
                      </Text>
                      {!hasCashiers && (
                        <Text style={styles.warningText}>
                          Crea cajeros primero
                        </Text>
                      )}
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mainButton}
                onPress={handleManagerPress}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#ff00ff', '#8000ff', '#4000ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.buttonGradient}
                >
                  <Ionicons name="settings" size={40} color="white" />
                  <Text style={styles.buttonText}>ADMINISTRACIÓN</Text>
                  <Text style={styles.buttonSubtext}>PANEL DE GERENTE</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    position: 'relative',
  },
  safeArea: {
    flex: 1,
  },
  circlesContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.1,
  },
  circle1: {
    width: 200,
    height: 200,
    backgroundColor: '#00f0ff',
    top: -50,
    right: -50,
  },
  circle2: {
    width: 150,
    height: 150,
    backgroundColor: '#ff00ff',
    bottom: 50,
    left: -30,
  },
  circle3: {
    width: 180,
    height: 180,
    backgroundColor: '#8000ff',
    bottom: -30,
    right: '10%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  iconGlow: {
    borderRadius: 50,
    padding: 20,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
  title: {
    fontSize: 36,
    fontWeight: '900',
    color: 'white',
    marginTop: 16,
    textAlign: 'center',
    letterSpacing: 6,
    textShadowColor: '#00f0ff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
  },
  subtitle: {
    fontSize: 12,
    color: '#00f0ff',
    marginTop: 8,
    textAlign: 'center',
    letterSpacing: 3,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  buttonsContainer: {
    width: '100%',
    maxWidth: 400,
    gap: 16,
    paddingBottom: 20,
  },
  mainButton: {
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#00f0ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
  },
  buttonGradient: {
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 22,
    fontWeight: '800',
    color: 'white',
    marginTop: 10,
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  buttonSubtext: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 6,
    letterSpacing: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  warningText: {
    fontSize: 10,
    color: '#ffcc00',
    marginTop: 4,
    fontWeight: '700',
    textAlign: 'center',
  },
});
