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

export default function FamilyRoutinesScreen() {
  const router = useRouter();

  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal & Form State
  const [isModalVisible, setModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('');
  const [pendingImage, setPendingImage] = useState<any>(null);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .eq('patient_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setRoutines(data);
    } catch (error) {
      console.error("Error fetching routines:", error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      setPendingImage(result.assets[0]);
    }
  };

  const saveRoutine = async () => {
    if (!taskTitle.trim() || !taskTime.trim()) {
      Alert.alert("Missing Info", "Please provide both a task title and a time.");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let finalImageUrl = null;

      // 1. Upload the image if one was selected
      if (pendingImage && pendingImage.base64) {
        const ext = pendingImage.uri.split('.').pop()?.toLowerCase() || 'jpeg';
        const fileName = `${user.id}/routine_${Date.now()}.${ext}`;

        // We can safely reuse the memory_vault bucket for routine images!
        const { error: uploadError } = await supabase.storage
          .from('memory_vault')
          .upload(fileName, decode(pendingImage.base64), { contentType: `image/${ext}` });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('memory_vault')
          .getPublicUrl(fileName);
          
        finalImageUrl = publicUrl;
      }

      // 2. Save the routine to the database
      const { error: dbError } = await supabase
        .from('routines')
        .insert({
          patient_id: user.id,
          title: taskTitle.trim(),
          time_string: taskTime.trim(),
          image_url: finalImageUrl,
          is_completed: false
        });

      if (dbError) throw dbError;

      // Reset and refresh
      setModalVisible(false);
      setTaskTitle('');
      setTaskTime('');
      setPendingImage(null);
      fetchRoutines();

    } catch (error: any) {
      Alert.alert("Save Failed", error.message);
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Routine",
      "Are you sure you want to remove this task from Mary's schedule?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => deleteRoutine(id) }
      ]
    );
  };

  const deleteRoutine = async (id: string) => {
    try {
      // Optimistic UI update
      setRoutines(prev => prev.filter(r => r.id !== id));
      
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error("Failed to delete routine", error);
      fetchRoutines(); // Revert on failure
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Routines</Text>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.addButton}>
          <Ionicons name="add" size={28} color="#8B5CF6" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
        ) : routines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={64} color="#374151" />
            <Text style={styles.emptyText}>No routines scheduled.</Text>
            <Text style={styles.emptySubtext}>Tap the + icon to create a task for Mary.</Text>
          </View>
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={[styles.routineCard, routine.is_completed && styles.routineCardCompleted]}>
              
              {routine.image_url ? (
                <Image source={{ uri: routine.image_url }} style={styles.routineImage} />
              ) : (
                <View style={styles.routineImagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color="#374151" />
                </View>
              )}
              
              <View style={styles.routineInfo}>
                <Text style={styles.routineTime}>{routine.time_string}</Text>
                <Text style={[styles.routineTitle, routine.is_completed && styles.textStrikethrough]}>
                  {routine.title}
                </Text>
                {routine.is_completed && (
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>Completed</Text>
                  </View>
                )}
              </View>

              <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(routine.id)}>
                <Ionicons name="trash" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* CREATE ROUTINE MODAL */}
      <Modal visible={isModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Routine Task</Text>

            <Text style={styles.inputLabel}>Task Title</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., Take Morning Medication"
              placeholderTextColor="#6B7280"
              value={taskTitle}
              onChangeText={setTaskTitle}
            />

            <Text style={styles.inputLabel}>Time</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g., 9:00 AM"
              placeholderTextColor="#6B7280"
              value={taskTime}
              onChangeText={setTaskTime}
            />

            <Text style={styles.inputLabel}>Visual Cue (Optional but recommended)</Text>
            <TouchableOpacity style={styles.imageUploadBtn} onPress={pickImage}>
              {pendingImage ? (
                <Image source={{ uri: pendingImage.uri }} style={styles.previewImage} />
              ) : (
                <>
                  <Ionicons name="camera" size={32} color="#8B5CF6" />
                  <Text style={styles.imageUploadText}>Tap to add a photo</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={styles.cancelButton} 
                disabled={uploading}
                onPress={() => {
                  setModalVisible(false);
                  setTaskTitle('');
                  setTaskTime('');
                  setPendingImage(null);
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButton, uploading && { opacity: 0.7 }]} 
                onPress={saveRoutine}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Task</Text>
                )}
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
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(139, 92, 246, 0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 10 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  emptySubtext: { color: '#9CA3AF', fontSize: 15, textAlign: 'center' },

  routineCard: { flexDirection: 'row', backgroundColor: '#110C1D', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#231A31', alignItems: 'center' },
  routineCardCompleted: { opacity: 0.6 },
  routineImage: { width: 70, height: 70, borderRadius: 16, marginRight: 15 },
  routineImagePlaceholder: { width: 70, height: 70, borderRadius: 16, backgroundColor: '#1F2937', marginRight: 15, alignItems: 'center', justifyContent: 'center' },
  routineInfo: { flex: 1 },
  routineTime: { color: '#8B5CF6', fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  routineTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  statusBadge: { backgroundColor: 'rgba(16, 185, 129, 0.2)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, marginTop: 8 },
  statusText: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { padding: 10, marginLeft: 5 },

  // MODAL
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#110C1D', borderRadius: 24, padding: 25, width: '100%', borderWidth: 1, borderColor: '#231A31' },
  modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  
  inputLabel: { color: '#D1D5DB', fontSize: 14, fontWeight: '600', marginBottom: 8, marginLeft: 2 },
  textInput: { backgroundColor: '#000000', color: '#FFFFFF', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#231A31', marginBottom: 20, fontSize: 16 },
  
  imageUploadBtn: { backgroundColor: '#000000', borderRadius: 16, borderWidth: 2, borderColor: '#231A31', borderStyle: 'dashed', height: 140, alignItems: 'center', justifyContent: 'center', marginBottom: 30, overflow: 'hidden' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  imageUploadText: { color: '#9CA3AF', fontSize: 14, marginTop: 10 },

  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center' },
  cancelButtonText: { color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#8B5CF6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});