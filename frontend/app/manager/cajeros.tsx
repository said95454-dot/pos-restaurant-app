import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../utils/api';

interface Cashier {
  id: string;
  name: string;
  active: boolean;
  has_pin: boolean;
  has_password: boolean;
}

export default function CajerosScreen() {
  const router = useRouter();
  const [cashiers, setCashiers] = useState<Cashier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCashier, setEditingCashier] = useState<Cashier | null>(null);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
  const [password, setPassword] = useState('');
  const [usePin, setUsePin] = useState(true);
  const [usePassword, setUsePassword] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCashiers();
  }, []);

  const loadCashiers = async () => {
    try {
      const data = await api.getCashiers();
      setCashiers(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCashier(null);
    setName('');
    setPin('');
    setPassword('');
    setUsePin(true);
    setUsePassword(false);
    setShowModal(true);
  };

  const openEditModal = (cashier: Cashier) => {
    setEditingCashier(cashier);
    setName(cashier.name);
    setPin('');
    setPassword('');
    setUsePin(cashier.has_pin);
    setUsePassword(cashier.has_password);
    setShowModal(true);
  };

  const saveCashier = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }
    if (!editingCashier && !usePin && !usePassword) {
      Alert.alert('Error', 'Debe agregar PIN o contraseña');
      return;
    }
    if (usePin && pin && pin.length !== 4) {
      Alert.alert('Error', 'El PIN debe ser de 4 dígitos');
      return;
    }

    setSaving(true);
    try {
      const data: any = { name: name.trim() };
      if (usePin && pin) data.pin = pin;
      if (usePassword && password) data.password = password;

      if (editingCashier) {
        await api.updateCashier(editingCashier.id, data);
      } else {
        await api.createCashier(data);
      }
      setShowModal(false);
      loadCashiers();
      Alert.alert('✅ Éxito', editingCashier ? 'Cajero actualizado' : 'Cajero creado');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (cashier: Cashier) => {
    try {
      await api.updateCashier(cashier.id, { active: !cashier.active });
      loadCashiers();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar');
    }
  };

  const deleteCashier = (cashier: Cashier) => {
    Alert.alert('Eliminar Cajero', `¿Eliminar a ${cashier.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteCashier(cashier.id);
            loadCashiers();
          } catch (error) {
            Alert.alert('Error', 'No se pudo eliminar');
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#10b981', '#059669']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openAddModal}>
            <Ionicons name="person-add" size={28} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerContent}>
          <Ionicons name="people" size={40} color="white" />
          <Text style={styles.headerTitle}>Cajeros</Text>
          <Text style={styles.headerSubtitle}>{cashiers.length} cajeros registrados</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content}>
        {cashiers.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={80} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay cajeros</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
              <Text style={styles.addFirstText}>Agregar Primer Cajero</Text>
            </TouchableOpacity>
          </View>
        ) : (
          cashiers.map((cashier) => (
            <TouchableOpacity
              key={cashier.id}
              style={styles.cashierCard}
              onPress={() => openEditModal(cashier)}
              onLongPress={() => deleteCashier(cashier)}
            >
              <View style={styles.cashierInfo}>
                <View style={[styles.avatar, !cashier.active && styles.avatarInactive]}>
                  <Ionicons name="person" size={24} color="white" />
                </View>
                <View style={styles.cashierDetails}>
                  <Text style={styles.cashierName}>{cashier.name}</Text>
                  <View style={styles.authMethods}>
                    {cashier.has_pin && (
                      <View style={styles.authBadge}>
                        <Ionicons name="keypad" size={12} color="#10b981" />
                        <Text style={styles.authBadgeText}>PIN</Text>
                      </View>
                    )}
                    {cashier.has_password && (
                      <View style={styles.authBadge}>
                        <Ionicons name="lock-closed" size={12} color="#6366f1" />
                        <Text style={styles.authBadgeText}>Contraseña</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              <View style={styles.activeToggle}>
                <Text style={styles.activeLabel}>{cashier.active ? 'Activo' : 'Inactivo'}</Text>
                <Switch
                  value={cashier.active}
                  onValueChange={() => toggleActive(cashier)}
                  trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                  thumbColor={cashier.active ? '#10b981' : '#94a3b8'}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCashier ? 'Editar Cajero' : 'Nuevo Cajero'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Nombre del Cajero</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Juan Pérez"
              />

              <Text style={styles.sectionTitle}>Método de Acceso</Text>

              <View style={styles.authOption}>
                <View style={styles.authOptionLeft}>
                  <Ionicons name="keypad" size={24} color="#10b981" />
                  <View>
                    <Text style={styles.authOptionTitle}>PIN de 4 dígitos</Text>
                    <Text style={styles.authOptionDesc}>Acceso rápido</Text>
                  </View>
                </View>
                <Switch
                  value={usePin}
                  onValueChange={setUsePin}
                  trackColor={{ false: '#e2e8f0', true: '#86efac' }}
                  thumbColor={usePin ? '#10b981' : '#94a3b8'}
                />
              </View>

              {usePin && (
                <TextInput
                  style={styles.input}
                  value={pin}
                  onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
                  placeholder={editingCashier ? 'Nuevo PIN (dejar vacío para mantener)' : 'PIN de 4 dígitos'}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
              )}

              <View style={styles.authOption}>
                <View style={styles.authOptionLeft}>
                  <Ionicons name="lock-closed" size={24} color="#6366f1" />
                  <View>
                    <Text style={styles.authOptionTitle}>Contraseña</Text>
                    <Text style={styles.authOptionDesc}>Más seguro</Text>
                  </View>
                </View>
                <Switch
                  value={usePassword}
                  onValueChange={setUsePassword}
                  trackColor={{ false: '#e2e8f0', true: '#c4b5fd' }}
                  thumbColor={usePassword ? '#6366f1' : '#94a3b8'}
                />
              </View>

              {usePassword && (
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={editingCashier ? 'Nueva contraseña (dejar vacío para mantener)' : 'Contraseña'}
                  secureTextEntry
                />
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveCashier} disabled={saving}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.saveGradient}>
                  {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Guardar</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingBottom: 24, paddingHorizontal: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerContent: { alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: 'white', marginTop: 8 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#94a3b8', marginTop: 16 },
  addFirstButton: { marginTop: 20, backgroundColor: '#10b981', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  addFirstText: { color: 'white', fontWeight: '700' },
  cashierCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 2 },
  cashierInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#10b981', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarInactive: { backgroundColor: '#94a3b8' },
  cashierDetails: { flex: 1 },
  cashierName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  authMethods: { flexDirection: 'row', gap: 8, marginTop: 4 },
  authBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  authBadgeText: { fontSize: 11, color: '#64748b' },
  activeToggle: { alignItems: 'flex-end' },
  activeLabel: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#10b981' },
  modalBody: { padding: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1e293b', marginTop: 8, marginBottom: 16 },
  authOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', padding: 16, borderRadius: 12, marginBottom: 12 },
  authOptionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  authOptionTitle: { fontSize: 14, fontWeight: '600', color: '#1e293b' },
  authOptionDesc: { fontSize: 12, color: '#64748b' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelText: { fontWeight: '600', color: '#64748b' },
  saveButton: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveText: { fontWeight: '700', color: 'white', fontSize: 16 },
});
