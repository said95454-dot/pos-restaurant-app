import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../utils/api';

interface Product {
  id: string;
  name: string;
  price: number;
  image?: string;
  category: string;
  custom_options: string[];
}

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [image, setImage] = useState('');
  const [customOptions, setCustomOptions] = useState<string[]>([]);
  const [newOption, setNewOption] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      // Solo mostrar comidas, no bebidas
      const comidas = data.filter((p: any) => p.category !== 'bebida');
      setProducts(comidas);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Requerido', 'Necesitamos acceso a tu galería para seleccionar fotos');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso Requerido', 'Necesitamos acceso a la cámara para tomar fotos');
      return;
    }
    
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets[0].base64) {
      setImage(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setImage('');
    setCustomOptions([]);
    setNewOption('');
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setPrice(product.price.toString());
    setImage(product.image || '');
    setCustomOptions(product.custom_options || []);
    setNewOption('');
    setShowModal(true);
  };

  const addOption = () => {
    if (newOption.trim()) {
      setCustomOptions([...customOptions, newOption.trim()]);
      setNewOption('');
    }
  };

  const removeOption = (index: number) => {
    setCustomOptions(customOptions.filter((_, i) => i !== index));
  };

  const saveProduct = async () => {
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
        category: 'comida',
        custom_options: customOptions,
      };
      if (editingProduct) {
        await api.updateProduct(editingProduct.id, data);
      } else {
        await api.createProduct(data);
      }
      setShowModal(false);
      loadProducts();
      Alert.alert('✅ Éxito', editingProduct ? 'Producto actualizado' : 'Producto agregado');
    } catch (error) {
      Alert.alert('Error', 'No se pudo guardar');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = (product: Product) => {
    Alert.alert('Eliminar', `¿Eliminar ${product.name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.deleteProduct(product.id);
            loadProducts();
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
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={openAddModal}>
            <Ionicons name="add-circle" size={32} color="white" />
          </TouchableOpacity>
        </View>
        <View style={styles.headerContent}>
          <Ionicons name="fast-food" size={40} color="white" />
          <Text style={styles.headerTitle}>Productos</Text>
          <Text style={styles.headerSubtitle}>{products.length} productos</Text>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.grid}>
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="fast-food-outline" size={80} color="#cbd5e1" />
            <Text style={styles.emptyText}>No hay productos</Text>
            <TouchableOpacity style={styles.addFirstButton} onPress={openAddModal}>
              <Text style={styles.addFirstText}>Agregar Primer Producto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          products.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => openEditModal(product)}
              onLongPress={() => deleteProduct(product)}
            >
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.productImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Ionicons name="fast-food" size={40} color="#cbd5e1" />
                </View>
              )}
              <View style={styles.productInfo}>
                <Text style={styles.productName} numberOfLines={2}>{product.name}</Text>
                <Text style={styles.productPrice}>${product.price.toFixed(2)}</Text>
                {product.custom_options?.length > 0 && (
                  <Text style={styles.productOptions}>
                    {product.custom_options.length} opciones
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Imagen */}
              <View style={styles.imageSection}>
                {image ? (
                  <Image source={{ uri: image }} style={styles.previewImage} />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="image" size={40} color="#6366f1" />
                  </View>
                )}
                <View style={styles.imageButtons}>
                  <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                    <Ionicons name="images" size={20} color="#6366f1" />
                    <Text style={styles.imageBtnText}>Galería</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageBtn} onPress={takePhoto}>
                    <Ionicons name="camera" size={20} color="#6366f1" />
                    <Text style={styles.imageBtnText}>Cámara</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={styles.label}>Nombre del Producto</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Tacos de Asada"
              />

              <Text style={styles.label}>Precio</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />

              {/* Opciones Personalizables */}
              <Text style={styles.label}>Opciones del Producto</Text>
              <Text style={styles.hint}>Agrega las opciones que puede llevar este producto</Text>
              
              <View style={styles.optionInputRow}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  value={newOption}
                  onChangeText={setNewOption}
                  placeholder="Ej: Con cebolla, Sin salsa..."
                  onSubmitEditing={addOption}
                />
                <TouchableOpacity style={styles.addOptionBtn} onPress={addOption}>
                  <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
              </View>

              {customOptions.length > 0 && (
                <View style={styles.optionsList}>
                  {customOptions.map((option, index) => (
                    <View key={index} style={styles.optionTag}>
                      <Text style={styles.optionTagText}>{option}</Text>
                      <TouchableOpacity onPress={() => removeOption(index)}>
                        <Ionicons name="close-circle" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowModal(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={saveProduct} disabled={saving}>
                <LinearGradient colors={['#6366f1', '#4f46e5']} style={styles.saveGradient}>
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
  grid: { padding: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 18, color: '#94a3b8', marginTop: 16 },
  addFirstButton: { marginTop: 20, backgroundColor: '#6366f1', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  addFirstText: { color: 'white', fontWeight: '700' },
  productCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, marginBottom: 12, padding: 12, elevation: 2 },
  productImage: { width: 80, height: 80, borderRadius: 10 },
  placeholderImage: { width: 80, height: 80, borderRadius: 10, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center' },
  productInfo: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: '700', color: '#1e293b' },
  productPrice: { fontSize: 18, fontWeight: '800', color: '#6366f1', marginTop: 4 },
  productOptions: { fontSize: 12, color: '#64748b', marginTop: 4 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: 'white', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#6366f1' },
  modalBody: { padding: 20 },
  imageSection: { alignItems: 'center', marginBottom: 20 },
  previewImage: { width: 120, height: 90, borderRadius: 12 },
  imagePlaceholder: { width: 120, height: 90, borderRadius: 12, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#6366f1', borderStyle: 'dashed' },
  imageButtons: { flexDirection: 'row', marginTop: 12, gap: 12 },
  imageBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f1f5f9', borderRadius: 20 },
  imageBtnText: { color: '#6366f1', fontWeight: '600' },
  label: { fontSize: 14, fontWeight: '600', color: '#475569', marginBottom: 8, marginTop: 12 },
  hint: { fontSize: 12, color: '#94a3b8', marginBottom: 8 },
  input: { backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 12, padding: 14, fontSize: 16 },
  optionInputRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addOptionBtn: { backgroundColor: '#6366f1', padding: 14, borderRadius: 12 },
  optionsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  optionTag: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#e0e7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  optionTagText: { color: '#4f46e5', fontWeight: '600' },
  modalFooter: { flexDirection: 'row', padding: 20, gap: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center' },
  cancelText: { fontWeight: '600', color: '#64748b' },
  saveButton: { flex: 2, borderRadius: 12, overflow: 'hidden' },
  saveGradient: { padding: 16, alignItems: 'center' },
  saveText: { fontWeight: '700', color: 'white', fontSize: 16 },
});
