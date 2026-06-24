import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../supabase';

export default function MemoryVaultScreen() {
  const router = useRouter();
  
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isCaptionModalVisible, setCaptionModalVisible] = useState(false);
  const [pendingImage, setPendingImage] = useState<any>(null);
  const [captionText, setCaptionText] = useState('');

  useEffect(() => {
    fetchVaultImages();
  }, []);

  const fetchVaultImages = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('memory_vault')
        .select('*')
        .eq('uploader_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setImages(data || []);
    } catch (error) {
      console.error('Error fetching images:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setPendingImage(result.assets[0]);
      setCaptionModalVisible(true);
    }
  };

  const uploadWithCaption = async () => {
    setCaptionModalVisible(false);
    if (!pendingImage) return;

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const base64FileData = pendingImage.base64;
      const ext = pendingImage.uri.split('.').pop()?.toLowerCase() || 'jpeg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('memory_vault')
        .upload(fileName, decode(base64FileData), {
          contentType: `image/${ext}`
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('memory_vault')
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from('memory_vault')
        .insert({
          uploader_id: user.id,
          patient_code: user.id,
          image_url: publicUrl,
          caption: captionText,
        });

      if (dbError) throw dbError;

      fetchVaultImages();

    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
      setPendingImage(null);
      setCaptionText('');
    }
  };

  // --- NEW DELETE LOGIC ---
  const confirmDelete = (img: any) => {
    Alert.alert(
      "Delete Memory",
      "Are you sure you want to remove this photo from the vault?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteImage(img) }
      ]
    );
  };

  const deleteImage = async (img: any) => {
    setLoading(true);
    try {
      // 1. Extract the specific file path from the full public URL
      const filePath = img.image_url.split('/memory_vault/')[1];
      
      // 2. Remove the actual image file from the Supabase Storage Bucket
      if (filePath) {
        const { error: storageError } = await supabase.storage
          .from('memory_vault')
          .remove([filePath]);
        if (storageError) throw storageError;
      }

      // 3. Delete the text record from the database table
      const { error: dbError } = await supabase
        .from('memory_vault')
        .delete()
        .eq('id', img.id);
        
      if (dbError) throw dbError;

      // 4. Refresh the gallery
      fetchVaultImages();

    } catch (error: any) {
      Alert.alert("Delete Failed", error.message);
      setLoading(false); // Only stop loading if it fails, otherwise fetchVaultImages handles it
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Memory Vault</Text>
        <View style={{ width: 44 }} /> 
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.subtitle}>Photos uploaded here will be visible to Mary in her Remi app.</Text>

          <TouchableOpacity 
            style={[styles.uploadCard, uploading && styles.uploadCardDisabled]} 
            onPress={pickImage}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="#8B5CF6" />
            ) : (
              <>
                <View style={styles.uploadIconBadge}>
                  <Ionicons name="cloud-upload" size={28} color="#8B5CF6" />
                </View>
                <Text style={styles.uploadTitle}>Upload New Photo</Text>
                <Text style={styles.uploadSubtitle}>Tap to open gallery</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.galleryGrid}>
            {images.map((img) => (
              <View key={img.id} style={styles.imageContainer}>
                <Image source={{ uri: img.image_url }} style={styles.image} />
                
                {img.caption ? (
                  <View style={styles.captionOverlay}>
                    <Text style={styles.captionText} numberOfLines={2}>
                      {img.caption}
                    </Text>
                  </View>
                ) : null}

                {/* THE NEW DELETE BUTTON */}
                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => confirmDelete(img)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="trash-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>

              </View>
            ))}
            
            {images.length === 0 && !uploading && (
              <Text style={styles.emptyText}>No memories uploaded yet. Add the first one!</Text>
            )}
          </View>
        </ScrollView>
      )}

      <Modal visible={isCaptionModalVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Memory</Text>
            
            <TextInput
              style={styles.captionInput}
              placeholder="What's the story behind this photo?"
              placeholderTextColor="#9CA3AF"
              value={captionText}
              onChangeText={setCaptionText}
              multiline
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                onPress={() => {
                  setCaptionModalVisible(false);
                  setPendingImage(null);
                  setCaptionText('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.saveButton} onPress={uploadWithCaption}>
                <Text style={styles.saveButtonText}>Save & Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15 },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#110C1D', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#231A31' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  subtitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 25, lineHeight: 20, textAlign: 'center' },
  
  uploadCard: { backgroundColor: '#110C1D', borderRadius: 24, padding: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#231A31', borderStyle: 'dashed', marginBottom: 30 },
  uploadCardDisabled: { opacity: 0.5 },
  uploadIconBadge: { width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(139, 92, 246, 0.15)', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  uploadTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  uploadSubtitle: { color: '#6B7280', fontSize: 14 },
  
  galleryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  imageContainer: { width: '48%', aspectRatio: 1, marginBottom: 15, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#231A31', position: 'relative' },
  image: { width: '100%', height: '100%' },
  captionOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 10 },
  captionText: { color: '#FFFFFF', fontSize: 12, lineHeight: 16 },
  emptyText: { color: '#6B7280', width: '100%', textAlign: 'center', marginTop: 20 },

  // --- NEW DELETE BUTTON STYLE ---
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.85)', // A nice semi-transparent red
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#110C1D', borderRadius: 20, padding: 20, width: '100%', borderWidth: 1, borderColor: '#231A31' },
  modalTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },
  captionInput: { backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 10, padding: 15, minHeight: 100, borderWidth: 1, borderColor: '#231A31', textAlignVertical: 'top', marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelButton: { paddingVertical: 10, paddingHorizontal: 15, justifyContent: 'center' },
  cancelButtonText: { color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#8B5CF6', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});