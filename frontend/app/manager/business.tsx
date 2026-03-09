import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../utils/api';

export default function BusinessScreen() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState('');
  const [logo, setLogo] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBusiness();
  }, []);

  const loadBusiness = async () => {
    try {
      const data = await api.getBusiness();
      setBusinessName(data.name);
      setLogo(data.logo || '');
    } catch (error) {
      console.error('Error loading business:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async (useCamera: boolean = false) => {
    try {
      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        setLogo(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'No se pudo cargar la imagen. Intenta con otro método.');
    }
  };

  // Web-compatible image upload using base64
  const handleWebImageUpload = (event: any) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5000000) {
        Alert.alert('Error', 'La imagen es muy grande. Máximo 5MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogo(reader.result as string);
      };
      reader.onerror = () => {
        Alert.alert('Error', 'No se pudo cargar la imagen');
      };
      reader.readAsDataURL(file);
    }
  };

  const showImageOptions = () => {
    // Check if running on web
    if (Platform.OS === 'web') {
      // For web, trigger file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = handleWebImageUpload;
      input.click();
    } else {
      // For native, show options
      Alert.alert('Logo del Negocio', 'Elige una opción', [
        { text: 'Cámara', onPress: () => pickImage(true) },
        { text: 'Galería', onPress: () => pickImage(false) },
        { text: 'Cancelar', style: 'cancel' },
      ]);
    }
  };

  const handleSave = async () => {
    if (!businessName.trim()) {
      Alert.alert('Error', 'El nombre del negocio es obligatorio');
      return;
    }

    setSaving(true);
    try {
      await api.updateBusiness({
        name: businessName,
        logo: logo || undefined,
      });
      Alert.alert('Éxito', 'Información actualizada correctamente');
    } catch (error) {
      console.error('Error saving business:', error);
      Alert.alert('Error', 'No se pudo guardar la información');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#14b8a6', '#0d9488']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configuración del Negocio</Text>
        <View style={{ width: 24 }} />
      </LinearGradient>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Logo */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Logo del Negocio</Text>
            <TouchableOpacity onPress={showImageOptions} style={styles.logoContainer}>
              {logo ? (
                <Image source={{ uri: logo }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="business" size={48} color="#94a3b8" />
                  <Text style={styles.logoPlaceholderText}>Agregar Logo</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Business Name */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nombre del Negocio *</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="Mi Restaurante"
              placeholderTextColor="#94a3b8"
            />
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <LinearGradient
              colors={saving ? ['#94a3b8', '#64748b'] : ['#10b981', '#059669']}
              style={styles.saveButtonGradient}
            >
              {saving ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={24} color="white" />
                  <Text style={styles.saveButtonText}>Guardar Cambios</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 16,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoImage: {
    width: 150,
    height: 150,
    borderRadius: 75,
  },
  logoPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
  },
  logoPlaceholderText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  saveButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: 16,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'white',
  },
});
