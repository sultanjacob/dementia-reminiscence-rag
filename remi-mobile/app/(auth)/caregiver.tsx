import { Ionicons } from '@expo/vector-icons';
import { decode } from 'base64-arraybuffer';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function CaregiverScreen() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 0.5, // Reduced slightly for faster uploads
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert("Permission Denied", "Microphone access is required.");
      
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    try {
      await recording?.stopAndUnloadAsync();
      const uri = recording?.getURI();
      if (uri) setAudioUri(uri);
      setRecording(null);
      setIsRecording(false);
    } catch (err) {
      console.error("Failed to stop recording", err);
    }
  };

  const playPreview = async () => {
    if (!audioUri) return;
    const { sound } = await Audio.Sound.createAsync({ uri: audioUri });
    await sound.playAsync();
  };

  // --- THE NEW CLOUD UPLOAD FUNCTION ---
  const saveMemory = async () => {
    if (!title || !imageUri) {
      return Alert.alert("Missing Info", "Please provide at least a title and an image.");
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      let publicImageUrl = '';
      let publicAudioUrl = null;

      // 1. Upload Image to Supabase Storage
      const imageBase64 = await FileSystem.readAsStringAsync(imageUri, { encoding: 'base64' });
      const imagePath = `${user.id}/${Date.now()}_image.jpg`;
      const { error: imgError } = await supabase.storage
        .from('memories')
        .upload(imagePath, decode(imageBase64), { contentType: 'image/jpeg' });
      
      if (imgError) throw new Error("Image Upload Failed: " + imgError.message);
      publicImageUrl = supabase.storage.from('memories').getPublicUrl(imagePath).data.publicUrl;

      // 2. Upload Audio to Supabase Storage (If recorded)
      if (audioUri) {
        const audioBase64 = await FileSystem.readAsStringAsync(audioUri, { encoding: 'base64' });
        const audioPath = `${user.id}/${Date.now()}_audio.m4a`;
        const { error: audError } = await supabase.storage
          .from('memories')
          .upload(audioPath, decode(audioBase64), { contentType: 'audio/m4a' });
        
        if (audError) throw new Error("Audio Upload Failed: " + audError.message);
        publicAudioUrl = supabase.storage.from('memories').getPublicUrl(audioPath).data.publicUrl;
      }

      // 3. Save everything to the database
      const newMemory = {
        user_id: user.id,
        title,
        date,
        description,
        image_url: publicImageUrl,
        audio_url: publicAudioUrl, 
      };

      const { error: dbError } = await supabase.from('memories').insert([newMemory]);
      if (dbError) throw dbError;

      Alert.alert("Success!", "Memory safely uploaded to the cloud.");
      
      // Clear the form for the next memory
      setTitle(''); setDate(''); setDescription(''); setImageUri(null); setAudioUri(null);
    } catch (error: any) {
      Alert.alert("Upload Error", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.appCapsule}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Caregiver Portal</Text>
          <Ionicons name="shield-checkmark" size={28} color="#A78BFA" />
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Add a New Memory</Text>
              <Text style={styles.sectionSubtitle}>Upload a photo and record the story behind it.</Text>
            </View>

            <TouchableOpacity style={styles.imageUploadBox} onPress={pickImage} activeOpacity={0.8}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="camera" size={40} color="#8B5CF6" />
                  <Text style={styles.uploadText}>Tap to select a photo</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput style={styles.input} placeholder="e.g., Sarah's Wedding" placeholderTextColor="#6B7280" value={title} onChangeText={setTitle} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Date (Optional)</Text>
              <TextInput style={styles.input} placeholder="e.g., June 2018" placeholderTextColor="#6B7280" value={date} onChangeText={setDate} />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Written Story</Text>
              <TextInput style={[styles.input, styles.textArea]} placeholder="Type the story here as a backup for Remi to read..." placeholderTextColor="#6B7280" value={description} onChangeText={setDescription} multiline numberOfLines={4} />
            </View>

            <View style={styles.audioSection}>
              <Text style={styles.inputLabel}>Family Voice Note</Text>
              {!audioUri ? (
                <TouchableOpacity style={[styles.recordButton, isRecording && styles.recordingActive]} onPress={isRecording ? stopRecording : startRecording} activeOpacity={0.8}>
                  <Ionicons name={isRecording ? "stop-circle" : "mic"} size={24} color="#FFFFFF" />
                  <Text style={styles.recordButtonText}>{isRecording ? "Stop Recording" : "Hold to Record Story"}</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.audioPreviewContainer}>
                  <TouchableOpacity style={styles.playPreviewButton} onPress={playPreview}>
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                    <Text style={styles.playPreviewText}>Play Recording</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteAudioButton} onPress={() => setAudioUri(null)}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <TouchableOpacity style={[styles.saveButton, isSaving && styles.savingState]} onPress={saveMemory} disabled={isSaving}>
              {isSaving ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <ActivityIndicator color="#110C1D" style={{ marginRight: 10 }} />
                  <Text style={styles.saveButtonText}>Uploading to Cloud...</Text>
                </View>
              ) : (
                <Text style={styles.saveButtonText}>Save Memory to Cloud</Text>
              )}
            </TouchableOpacity>

          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, backgroundColor: '#110C1D', borderRadius: 45, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#231A31' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#231A31' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  sectionHeader: { marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  sectionSubtitle: { fontSize: 14, color: '#A396B5', marginTop: 4 },
  imageUploadBox: { height: 200, backgroundColor: '#1A1325', borderRadius: 20, borderWidth: 2, borderColor: '#231A31', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 20, overflow: 'hidden' },
  uploadText: { color: '#8B5CF6', marginTop: 10, fontWeight: '600' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#E2D8F0', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#1A1325', borderWidth: 1, borderColor: '#231A31', borderRadius: 16, color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  audioSection: { marginBottom: 30, padding: 20, backgroundColor: '#1A1325', borderRadius: 20, borderWidth: 1, borderColor: '#231A31' },
  recordButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 30 },
  recordingActive: { backgroundColor: '#EF4444' },
  recordButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  audioPreviewContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playPreviewButton: { flex: 1, backgroundColor: '#3D2F4F', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 30, marginRight: 10 },
  playPreviewText: { color: '#FFFFFF', fontWeight: 'bold', marginLeft: 8 },
  deleteAudioButton: { backgroundColor: '#3D2F4F', padding: 14, borderRadius: 30 },
  saveButton: { backgroundColor: '#A78BFA', paddingVertical: 18, borderRadius: 30, alignItems: 'center', marginBottom: 20 },
  savingState: { backgroundColor: '#8B5CF6', opacity: 0.7 },
  saveButtonText: { color: '#110C1D', fontSize: 18, fontWeight: 'bold' }
});