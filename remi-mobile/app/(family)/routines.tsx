import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
  const [patientId, setPatientId] = useState<string | null>(null);

  // Modal State for Add & Edit
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPatientAndRoutines();
  }, []);

  const fetchPatientAndRoutines = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('linked_patient_id')
        .eq('id', user.id)
        .single();

      if (profile?.linked_patient_id) {
        setPatientId(profile.linked_patient_id);
        
        const { data, error } = await supabase
          .from('routines')
          .select('*')
          .eq('patient_id', profile.linked_patient_id)
          .order('time', { ascending: true });

        if (error) throw error;
        setRoutines(data || []);
      }
    } catch (error) {
      console.error("Error fetching routines:", error);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingRoutineId(null);
    setNewTitle('');
    setNewTime('');
    setIsModalVisible(true);
  };

  const openEditModal = (routine: any) => {
    setEditingRoutineId(routine.id);
    setNewTitle(routine.title || ''); // Load existing title
    setNewTime(routine.time || '');   // Load existing time
    setIsModalVisible(true);
  };

  const handleSaveRoutine = async () => {
    if (!newTime.trim() || !newTitle.trim()) {
      Alert.alert("Missing Info", "Please provide both a time and a description.");
      return;
    }
    if (!patientId) {
      Alert.alert("Error", "No linked patient found. Please set up the care team first.");
      return;
    }

    setIsSaving(true);

    try {
      if (editingRoutineId) {
        // UPDATE EXISTING ROUTINE
        const { error } = await supabase
          .from('routines')
          .update({
            title: newTitle.trim(),
            time: newTime.trim()
          })
          .eq('id', editingRoutineId);

        if (error) throw error;
      } else {
        // CREATE NEW ROUTINE
        const { error } = await supabase.from('routines').insert({
          patient_id: patientId,
          title: newTitle.trim(),
          time: newTime.trim(),
          is_completed: false 
        });

        if (error) throw error;
      }

      setIsModalVisible(false);
      fetchPatientAndRoutines(); 
      
    } catch (error: any) {
      Alert.alert("Error saving routine", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    Alert.alert(
      "Delete Routine",
      "Are you sure you want to remove this from the schedule?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.from('routines').delete().eq('id', id);
              if (error) throw error;
              setRoutines(routines.filter(r => r.id !== id));
            } catch (error: any) {
              Alert.alert("Error deleting", error.message);
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Schedule</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#8B5CF6" />
          <Text style={styles.infoText}>
            These routines sync instantly to the Caregiver Dashboard. When the caregiver checks them off, they will reset the next day.
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
        ) : routines.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={48} color="#D1D5DB" />
            <Text style={styles.emptyStateTitle}>No routines set</Text>
            <Text style={styles.emptyStateText}>Tap the button below to add medications, meals, or activities.</Text>
          </View>
        ) : (
          routines.map((routine) => (
            <View key={routine.id} style={styles.routineCard}>
              
              {/* LEFT SIDE: Icon + Info */}
              <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                  <Ionicons name="time-outline" size={24} color="#8B5CF6" />
                </View>
                <View style={styles.routineInfo}>
                  <Text style={styles.routineTime}>{routine.time}</Text>
                  <Text style={styles.routineTitle}>
                    {routine.title ? routine.title : "No description provided"}
                  </Text>
                </View>
              </View>

              {/* RIGHT SIDE: Action Buttons */}
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={styles.editButton} 
                  onPress={() => openEditModal(routine)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="pencil-outline" size={20} color="#3B82F6" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.deleteButton} 
                  onPress={() => handleDeleteRoutine(routine.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                </TouchableOpacity>
              </View>

            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add New Routine</Text>
        </TouchableOpacity>
      </View>

      {/* --- ADD/EDIT ROUTINE MODAL --- */}
      <Modal visible={isModalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingRoutineId ? "Edit Routine" : "New Routine"}
              </Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={28} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Time (e.g., 9:00 AM)</Text>
            <TextInput
              style={styles.input}
              placeholder="12:30 PM"
              value={newTime}
              onChangeText={setNewTime}
              placeholderTextColor="#9CA3AF"
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={styles.input}
              placeholder="Take with food: 1x Aspirin"
              value={newTitle}
              onChangeText={setNewTitle}
              placeholderTextColor="#9CA3AF"
            />

            <TouchableOpacity 
              style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
              onPress={handleSaveRoutine}
              disabled={isSaving}
            >
              <Text style={styles.saveButtonText}>
                {isSaving ? "Saving..." : "Save Routine"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  backButton: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  
  container: { flex: 1 },
  scrollContent: { padding: 20 },
  
  infoCard: { flexDirection: 'row', backgroundColor: '#EDE9FE', padding: 16, borderRadius: 16, marginBottom: 25, alignItems: 'flex-start' },
  infoText: { flex: 1, color: '#5B21B6', fontSize: 14, lineHeight: 20, marginLeft: 12, fontWeight: '500' },
  
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyStateTitle: { fontSize: 18, fontWeight: 'bold', color: '#374151', marginTop: 15 },
  emptyStateText: { fontSize: 14, color: '#6B7280', textAlign: 'center', marginTop: 8, paddingHorizontal: 20 },

  routineCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', padding: 18, borderRadius: 16, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { backgroundColor: '#F5F3FF', padding: 12, borderRadius: 12, marginRight: 15 },
  routineInfo: { flex: 1 },
  routineTime: { fontSize: 14, fontWeight: '700', color: '#8B5CF6', marginBottom: 4 },
  routineTitle: { fontSize: 16, fontWeight: '600', color: '#111827', flexWrap: 'wrap' },
  
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editButton: { padding: 10, backgroundColor: '#EFF6FF', borderRadius: 12 },
  deleteButton: { padding: 10, backgroundColor: '#FEE2E2', borderRadius: 12 },

  footer: { padding: 20, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  addButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16 },
  addButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 16, padding: 16, fontSize: 16, color: '#111827', marginBottom: 20 },
  saveButton: { backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});