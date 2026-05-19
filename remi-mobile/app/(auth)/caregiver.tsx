import React, { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../supabase';

export default function CaregiverScreen() {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Audio Recording State
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // --- 1. PICK AN IMAGE ---
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, 
      quality: 0.8,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  // --- 2. RECORD FAMILY VOICE ---
  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        return Alert.alert("Permission Denied", "Microphone access is required.");
      }
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

  // --- 3. SAVE TO SUPABASE ---
  const saveMemory = async () => {
    if (!title || !imageUri) {
      return Alert.alert("Missing Info", "Please provide at least a title and an image.");
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      const newMemory = {
        user_id: user.id,
        title,
        date,
        description,
        image_url: imageUri, 
      };

      const { error } = await supabase.from('memories').insert([newMemory]);
      if (error) throw error;

      Alert.alert("Success", "Memory added securely.");
      
      // Clear form
      setTitle(''); setDate(''); setDescription(''); setImageUri(null); setAudioUri(null);
    } catch (error: any) {
      Alert.alert("Error saving", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.appCapsule}>
        
        {/* HEADER */}
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

            {/* IMAGE UPLOAD */}
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

            {/* TEXT INPUTS */}
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

            {/* AUDIO RECORDER */}
            <View style={styles.audioSection}>
              <Text style={styles.inputLabel}>Family Voice Note</Text>
              
              {!audioUri ? (
                <TouchableOpacity 
                  style={[styles.recordButton, isRecording && styles.recordingActive]} 
                  onPress={isRecording ? stopRecording : startRecording}
                  activeOpacity={0.8}
                >
                  <Ionicons name={isRecording ? "stop-circle" : "mic"} size={24} color="#FFFFFF" />
                  <Text style={styles.recordButtonText}>
                    {isRecording ? "Stop Recording" : "Hold to Record Story"}
                  </Text>
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

            {/* SAVE BUTTON */}
            <TouchableOpacity style={styles.saveButton} onPress={saveMemory} disabled={isSaving}>
              <Text style={styles.saveButtonText}>{isSaving ? "Saving securely..." : "Save Memory"}</Text>
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
  saveButtonText: { color: '#110C1D', fontSize: 18, fontWeight: 'bold' }
});