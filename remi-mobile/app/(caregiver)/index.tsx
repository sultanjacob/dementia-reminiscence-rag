import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
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

export default function CaregiverRoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Image expansion state
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Shift Log state
  const [isLogModalVisible, setLogModalVisible] = useState(false);
  const [logName, setLogName] = useState('');
  const [logVibe, setLogVibe] = useState('Calm & Relaxed');
  const [logNotes, setLogNotes] = useState('');
  const [savingLog, setSavingLog] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setRoutines(data);
    } catch (error) {
      console.error("Error fetching routines:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoutineStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    if (newStatus) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    setRoutines(prev => prev.map(r => r.id === id ? { ...r, is_completed: newStatus } : r));

    try {
      await supabase
        .from('routines')
        .update({ is_completed: newStatus })
        .eq('id', id);
    } catch (error) {
      console.error("Failed to update routine status", error);
      fetchRoutines();
    }
  };

  const submitShiftLog = async () => {
    if (!logNotes.trim()) {
      Alert.alert("Missing Info", "Please add some notes about the shift.");
      return;
    }
    
    setSavingLog(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from('shift_logs').insert({
        patient_id: user.id, // Linking it to Mary's account
        caregiver_name: logName || 'Caregiver',
        vibe: logVibe,
        notes: logNotes.trim()
      });

      if (error) throw error;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setLogModalVisible(false);
      setLogNotes('');
      Alert.alert("Log Saved", "The family dashboard has been updated with your insights!");
    } catch (error) {
      console.error("Error saving log:", error);
      Alert.alert("Error", "Could not save the shift log.");
    } finally {
      setSavingLog(false);
    }
  };

  const pendingRoutines = routines.filter(r => !r.is_completed);
  const completedRoutines = routines.filter(r => r.is_completed);

  const safeTitle = (title: any) => (title && title !== 'null') ? String(title) : "Scheduled Task";
  const safeTime = (time: any) => (time && time !== 'null') ? String(time) : "Anytime";

  const handleImageTap = (url: string) => {
    Haptics.selectionAsync();
    setExpandedImage(url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Caregiver Shift</Text>
          <Text style={styles.headerSubtitle}>Task Execution Board</Text>
        </View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
        ) : routines.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyText}>No tasks assigned.</Text>
            <Text style={styles.emptySubtext}>The family has not scheduled any routines for today.</Text>
          </View>
        ) : (
          <View>
            <Text style={styles.sectionLabel}>PENDING TASKS</Text>
            
            {pendingRoutines.length === 0 ? (
              <View style={styles.allDoneBadge}>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                <Text style={styles.allDoneText}>All tasks completed for now!</Text>
              </View>
            ) : (
              pendingRoutines.map((routine) => (
                <View key={routine.id} style={styles.taskCard}>
                  {routine.image_url ? (
                    <TouchableOpacity activeOpacity={0.8} onPress={() => handleImageTap(routine.image_url)}>
                      <Image source={{ uri: routine.image_url }} style={styles.taskImage} />
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.taskImagePlaceholder}>
                      <Ionicons name="image-outline" size={24} color="#9CA3AF" />
                    </View>
                  )}

                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTime}>{safeTime(routine.time_string)}</Text>
                    <Text style={styles.taskTitle}>{safeTitle(routine.title)}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.completeButton}
                    onPress={() => toggleRoutineStatus(routine.id, routine.is_completed)}
                  >
                    <Ionicons name="ellipse-outline" size={24} color="#8B5CF6" />
                    <Text style={styles.completeButtonText}>Done</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {completedRoutines.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 30 }]}>COMPLETED TASKS</Text>
                {completedRoutines.map((routine) => (
                  <View key={routine.id} style={[styles.taskCard, styles.taskCardCompleted]}>
                    {routine.image_url ? (
                      <TouchableOpacity activeOpacity={0.8} onPress={() => handleImageTap(routine.image_url)}>
                        <Image source={{ uri: routine.image_url }} style={[styles.taskImage, { opacity: 0.5 }]} />
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.taskImagePlaceholder}>
                        <Ionicons name="checkmark" size={24} color="#9CA3AF" />
                      </View>
                    )}

                    <View style={styles.taskInfo}>
                      <Text style={[styles.taskTime, styles.textStrikethrough]}>{safeTime(routine.time_string)}</Text>
                      <Text style={[styles.taskTitle, styles.textStrikethrough]}>{safeTitle(routine.title)}</Text>
                    </View>
                    
                    <TouchableOpacity 
                      style={styles.undoButton}
                      onPress={() => toggleRoutineStatus(routine.id, routine.is_completed)}
                    >
                      <Ionicons name="refresh" size={20} color="#6B7280" />
                      <Text style={styles.undoButtonText}>Undo</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {/* END OF SHIFT LOG BUTTON */}
            <TouchableOpacity 
              style={styles.shiftLogButton}
              onPress={() => setLogModalVisible(true)}
            >
              <Ionicons name="journal" size={24} color="#FFFFFF" />
              <Text style={styles.shiftLogButtonText}>Write End of Shift Log</Text>
            </TouchableOpacity>

          </View>
        )}
      </ScrollView>

      {/* MODAL TO POP-UP THE IMAGE */}
      <Modal visible={!!expandedImage} transparent={true} animationType="fade">
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageCapsule}>
            <TouchableOpacity onPress={() => setExpandedImage(null)} style={styles.closeImageButton} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
            {expandedImage && (
              <Image source={{ uri: expandedImage }} style={styles.largeExpandedImage} />
            )}
          </View>
        </View>
      </Modal>

      {/* SHIFT LOG MODAL */}
      <Modal visible={isLogModalVisible} transparent={true} animationType="slide">
        <View style={styles.logModalOverlay}>
          <View style={styles.logModalContent}>
            <Text style={styles.modalTitle}>Daily Insights Log</Text>

            <Text style={styles.inputLabel}>Caregiver Name (Optional)</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="e.g. Sarah" 
              placeholderTextColor="#6B7280" 
              value={logName} 
              onChangeText={setLogName} 
            />

            <Text style={styles.inputLabel}>Patient's Vibe Today</Text>
            <View style={styles.vibeRow}>
              {['Calm & Relaxed', 'Anxious', 'Energetic', 'Tired'].map((v) => (
                <TouchableOpacity 
                  key={v} 
                  style={[styles.vibeChip, logVibe === v && styles.vibeChipActive]} 
                  onPress={() => setLogVibe(v)}
                >
                  <Text style={[styles.vibeText, logVibe === v && { color: '#FFFFFF' }]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Notes for Family</Text>
            <TextInput 
              style={[styles.textInput, { height: 100, textAlignVertical: 'top' }]} 
              placeholder="How did Mary do today? Did she eat well? Did she talk about any memories?" 
              placeholderTextColor="#6B7280" 
              value={logNotes} 
              onChangeText={setLogNotes} 
              multiline 
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setLogModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={submitShiftLog} disabled={savingLog}>
                {savingLog ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Log</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#111827', textAlign: 'center' },
  headerSubtitle: { fontSize: 14, fontWeight: '600', color: '#8B5CF6', textAlign: 'center' },
  
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50, paddingTop: 20 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: '#111827', fontSize: 20, fontWeight: 'bold', marginTop: 15, marginBottom: 8 },
  emptySubtext: { color: '#6B7280', fontSize: 15, textAlign: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 15 },
  
  taskCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  taskCardCompleted: { backgroundColor: '#F9FAFB', shadowOpacity: 0, elevation: 0 },
  taskImage: { width: 56, height: 56, borderRadius: 14, marginRight: 15, backgroundColor: '#F3F4F6' },
  taskImagePlaceholder: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  taskInfo: { flex: 1, paddingRight: 10 },
  taskTime: { color: '#8B5CF6', fontSize: 14, fontWeight: '800', marginBottom: 2 },
  taskTitle: { color: '#111827', fontSize: 17, fontWeight: '700' },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  completeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DDD6FE' },
  completeButtonText: { color: '#8B5CF6', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  undoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  undoButtonText: { color: '#6B7280', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
  allDoneBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  allDoneText: { color: '#065F46', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },

  // Shift Log Button
  shiftLogButton: { backgroundColor: '#111827', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 20, marginTop: 25, marginBottom: 20 },
  shiftLogButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },

  // Image Modal
  imageModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center' },
  imageCapsule: { width: '90%', height: '70%', alignItems: 'center', justifyContent: 'center' },
  closeImageButton: { position: 'absolute', top: -15, right: -15, zIndex: 10 },
  largeExpandedImage: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 24 },

  // Log Modal
  logModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  logModalContent: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 25, width: '100%', borderWidth: 1, borderColor: '#E5E7EB' },
  modalTitle: { color: '#111827', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  inputLabel: { color: '#4B5563', fontSize: 14, fontWeight: '700', marginBottom: 8, marginLeft: 2 },
  textInput: { backgroundColor: '#F9FAFB', color: '#111827', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#E5E7EB', marginBottom: 20, fontSize: 16 },
  vibeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 25 },
  vibeChip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 20, backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E5E7EB' },
  vibeChipActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  vibeText: { color: '#6B7280', fontWeight: 'bold', fontSize: 14 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center' },
  cancelButtonText: { color: '#6B7280', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#10B981', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});