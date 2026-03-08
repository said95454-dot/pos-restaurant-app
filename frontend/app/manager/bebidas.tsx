import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../utils/api';

interface Bebida {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
}

export default function BebidasScreen() {
  const router = useRouter();
  const [bebidas, setBebidas] = useState<Bebida[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBebida, setEditingBebida] = useState<Bebida | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBebidas();
  }, []);

  const loadBebidas = async () => {
    try {
      const products = await api.getProducts();
      const bebidasOnly = products.filter((p: any) => p.category === 'bebida');
      setBebidas(bebidasOnly);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    // Solicitar permiso primero
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu galería para seleccionar fotos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    // Solicitar permiso primero
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Requerido', 'Necesitamos acceso a la cámara para tomar fotos');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const openAddModal = () => {
    setEditingBebida(null);
    setName('');
    setPrice('');
    setImage('');
    setShowModal(true);
  };

  const openEditModal = (bebida: Bebida) => {
    setEditingBebida(bebida);
    setName(bebida.name);
    setPrice(bebida.price.toString());
    setImage(bebida.image || '');
    setShowModal(true);
  };

  const saveBebida = async () => {
    if (!name.trim() || !price.trim()) {
      Alert.alert('Error', 'Nombre y precio son requeridos');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        price: parseFloat(price),
        image: image,
        category: 'bebida',
        options: {},
      };

      if (editingBebida) {
        await api.updateProduct(editingBebida.id, data);
      } else {
        await api.createProduct(data);
      }

      setShowModal(false);
      loadBebidas();
      Alert.alert('✅ Éxito', editingBebida ? 'Bebida actualizada' : 'Bebida agregada');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const deleteBebida = (bebida: Bebida) => {
    Alert.alert('Eliminar', `¿Eliminar ${bebida.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProduct(bebida.id);
            loadBebidas();
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
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#0891b2', '#06b6d4', '#22d3ee']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openAddModal}>
            <Ionicons name="add-circle" size={32} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerContent}>
          <Ionicons name="beer" size={40} color="white" />
          <Text style={styles.headerTitle}>Bebidas</Text>
          <Text style={styles.headerSubtitle}>{bebidas.length} bebidas registradas</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.grid}>
        {bebidas.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="beer-outline" size={80} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay bebidas</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
              <Text style={styles.addFirstText}>Agregar Primera Bebida</Text>
            </TouchableOpacity>
          </View>
        ) : (
          bebidas.map((bebida) => (
            <TouchableOpacity
              key={bebida.id}
              style={styles.bebidaCard}
              onPress={() => openEditModal(bebida)}
              onLongPress={() => deleteBebida(bebida)}
            >
              <LinearGradient colors={['#0e7490', '#0891b2']} style={styles.cardGradient}>
                {bebida.image ? (
                  <Image source={{ uri: bebida.image }} style={styles.bebidaImage} />
                ) : (
                  <View style={styles.placeholderImage}>
                    <Ionicons name="beer" size={50} color="rgba(255,255,255,0.5)" />
                  </View>
                )}
                <Text style={styles.bebidaName} numberOfLines={2}>{bebida.name}</Text>
                <Text style={styles.bebidaPrice}>${bebida.price.toFixed(2)}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal Agregar/Editar */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingBebida ? 'Editar Bebida' : 'Nueva Bebida'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.imageSection}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={40} color="#06b6d4" />
                    <Text style={styles.imagePlaceholderText}>Agregar Foto</Text>
                  </View>
                )}
                <View style={styles.imageButtons}>
                  <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                    <Ionicons name="images" size={20} color="#06b6d4" />
                    <Text style={styles.imageBtnText}>Galería</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                    <Ionicons name="camera" size={20} color="#06b6d4" />
                    <Text style={styles.imageBtnText}>Cámara</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Coca Cola, Agua, Cerveza..."
              />

              <Text style={styles.label}>Precio</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveBebida} disabled={saving}>
                <LinearGradient colors={['#06b6d4', '#0891b2']} style={styles.saveGradient}>
                  {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveText}>Guardar</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  content: { flex: 1 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 12, justifyContent: 'space-between' },
  emptyState: { width: '100%', alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#94a3b8', marginTop: 16 },
  addFirstButton: { marginTop: 20, backgroundColor: '#06b6d4', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  addFirstText: { color: 'white', fontWeight: '700' },
  bebidaCard: { width: '48%', marginBottom: 12, borderRadius: 16, overflow: 'hidden', elevation: 4 },
  cardGradient: { padding: 12, alignItems: 'center' },
  bebidaImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)' },
  placeholderImage: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  bebidaName: { fontSize: 14, fontWeight: '700', color: 'white', marginTop: 10, textAlign: 'center' },
  bebidaPrice: { fontSize: 20, fontWeight: '800', color: '#fef08a', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#0891b2' },
  modalBody: { padding: 20 },
  imagePickerButton: { alignSelf: 'center', marginBottom: 20 },
  previewImage: { width: 120, height: 120, borderRadius: 60 },
  imagePlaceholder: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#f0fdfa', borderWidth: 2, borderColor: '#06b6d4', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  imagePlaceholderText: { fontSize: 12, color: '#06b6d4', marginTop: 4 },
  imageSection: { alignItems: 'center', marginBottom: 20 },
  imageButtons: { flexDirection: 'row', marginTop: 12, gap: 12 },
  imageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f0fdfa', borderRadius: 20 },
  imageBtnText: { color: '#06b6d4', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 12 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16 },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelText: { fontWeight: '600', color: '#64748b' },
  saveButton: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveText: { fontWeight: '700', color: 'white', fontSize: 16 },
});
