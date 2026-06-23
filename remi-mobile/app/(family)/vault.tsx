import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../../supabase';

export default function MemoryVaultScreen() {
  const router = useRouter();
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchVaultImages();
  }, []);
  const [isCaptionModalVisible, setCaptionModalVisible] = useState(false);
  const [pendingImage, setPendingImage] = useState<any>(null);
  const [captionText, setCaptionText] = useState('');

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

  // 1. Pick the image and open the caption popup
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setPendingImage(result.assets[0]); // Save the image temporarily
      setCaptionModalVisible(true);      // Open the text popup
    }
  };

  // 2. Upload everything together
   const uploadWithCaption = async () => {
    setCaptionModalVisible(false); // Close the popup
    if (!pendingImage) return;

    try {
      // --- PASTE YOUR EXISTING SUPABASE UPLOAD LOGIC HERE ---
      // (The code that uploads to the storage bucket and gets the public URL)

      // When you insert into your database table, make sure you include the caption!
      // Example: 
      // await supabase.from('memory_vault').insert({ 
      //   image_url: publicUrl, 
      //   caption: captionText  <-- ADD THIS
      // });

      setPendingImage(null); // Clear the temporary image
      setCaptionText('');    // Clear the typed text
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

      // 2. Prepare the file for Supabase
      const base64FileData = result.assets[0].base64;
      const ext = result.assets[0].uri.split('.').pop()?.toLowerCase() || 'jpeg';
      const fileName = `${user.id}/${Date.now()}.${ext}`;

      // 3. Upload to Storage Bucket
      const { error: uploadError } = await supabase.storage
        .from('memory_vault')
        .upload(fileName, decode(base64FileData), {
          contentType: `image/${ext}`
        });

      if (uploadError) throw uploadError;

      // 4. Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('memory_vault')
        .getPublicUrl(fileName);

      // 5. Save the record to the Database
      const { error: dbError } = await supabase
        .from('memory_vault')
        .insert({
          uploader_id: user.id,
          patient_code: user.id, // Replace with linked_patient_id later if needed
          image_url: publicUrl,
          caption: "A beautiful memory", // We can add a text input for this later!
        });

      if (dbError) throw dbError;

      Alert.alert("Success", "Memory added to the vault!");
      fetchVaultImages(); // Refresh the gallery

    } catch (error: any) {
      Alert.alert("Upload Failed", error.message);
    } finally {
      setUploading(false);
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
            onPress={pickAndUploadImage}
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
              </View>
            ))}
            {images.length === 0 && !uploading && (
              <Text style={styles.emptyText}>No memories uploaded yet. Add the first one!</Text>
            )}
          </View>
        </ScrollView>
      )}
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
  imageContainer: { width: '48%', aspectRatio: 1, marginBottom: 15, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#231A31' },
  image: { width: '100%', height: '100%' },
  emptyText: { color: '#6B7280', width: '100%', textAlign: 'center', marginTop: 20 },
});