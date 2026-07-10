import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function FamilyRoutinesScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal & Form State
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [newActivity, setNewActivity] = useState('');
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showAndroidPicker, setShowAndroidPicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('time', { ascending: true });

      if (error) throw error;
      if (data) setRoutines(data);
    } catch (error) {
      console.error("Error fetching routines:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const onTimeChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowAndroidPicker(false);
    }
    if (date) {
      setSelectedTime(date);
    }
  };

  // --- NEW: Open Modal for Editing ---
  const openEditModal = (routine: any) => {
    setEditingRoutineId(routine.id);
    setNewActivity(routine.activity);
    
    // Convert the "HH:MM" database string back into a JavaScript Date object for the picker
    if (routine.time && routine.time.includes(':')) {
      const [h, m] = routine.time.split(':');
      const d = new Date();
      d.setHours(parseInt(h, 10), parseInt(m, 10), 0, 0);
      setSelectedTime(d);
    }
    setIsModalVisible(true);
  };

  // --- NEW: Open Modal for Adding ---
  const openAddModal = () => {
    setEditingRoutineId(null);
    setNewActivity('');
    setSelectedTime(new Date());
    setIsModalVisible(true);
  };

  // --- UPDATED: Handles both Insert and Update ---
  const handleSaveRoutine = async () => {
    if (!newActivity.trim()) {
      Alert.alert("Missing Info", "Please enter an activity name.");
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`; 

      if (editingRoutineId) {
        // Update existing routine
        const { error } = await supabase
          .from('routines')
          .update({ activity: newActivity, time: formattedTime })
          .eq('id', editingRoutineId);
        
        if (error) throw error;
      } else {
        // Insert new routine
        const { error } = await supabase
          .from('routines')
          .insert([{ 
            activity: newActivity, 
            time: formattedTime, 
            is_completed: false,
            icon: 'calendar-outline', 
            user_id: user?.id 
          }]);
          
        if (error) throw error;
      }

      setNewActivity('');
      setSelectedTime(new Date());
      setIsModalVisible(false);
      setEditingRoutineId(null);
      
      fetchRoutines();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to save routine.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- NEW: Safe Delete with Confirmation ---
  const confirmDelete = (id: string) => {
    Alert.alert(
      "Delete Routine",
      "Are you sure you want to remove this task from the schedule?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            setIsLoading(true);
            const { error } = await supabase.from('routines').delete().eq('id', id);
            if (error) {
              Alert.alert("Error", "Could not delete routine.");
            }
            fetchRoutines();
          } 
        }
      ]
    );
  };

  const renderRoutine = ({ item }: { item: any }) => {
    const isDone = item.is_completed;
    
    // Safer manual AM/PM conversion for Android
    let displayTime = item.time;
    if (item.time && item.time.includes(':')) {
      const parts = item.time.split(':');
      const h = parseInt(parts[0], 10);
      const m = parts[1].substring(0, 2); 
      
      if (!isNaN(h)) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12; 
        displayTime = `${displayH}:${m} ${ampm}`;
      }
    }

    return (
      <View style={[styles.routineCard, isDone && styles.routineCardDone]}>
        <View style={[styles.iconContainer, isDone && styles.iconContainerDone]}>
          <Ionicons name={item.icon || 'checkmark-circle-outline'} size={24} color={isDone ? '#10B981' : '#8B5CF6'} />
        </View>
        
        <View style={styles.routineInfo}>
          <Text style={[styles.activityText, isDone && styles.textDone]}>{item.activity}</Text>
          <Text style={styles.timeText}><Ionicons name="time-outline" size={12} /> {displayTime}</Text>
        </View>

        {/* --- NEW: Action Buttons --- */}
        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity onPress={() => openEditModal(item)} style={styles.actionIcon} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Ionicons name="pencil" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => confirmDelete(item.id)} style={styles.actionIcon} hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}>
            <Ionicons name="trash" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Routines</Text>
        <Text style={styles.headerSubtitle}>Manage the patient's daily schedule</Text>
      </View>

      <View style={styles.container}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={routines}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderRoutine}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Routine</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              {/* Dynamic Title based on Editing State */}
              <Text style={styles.modalTitle}>{editingRoutineId ? 'Edit Routine' : 'New Routine'}</Text>
              <TouchableOpacity onPress={() => { setIsModalVisible(false); setEditingRoutineId(null); }}>
                <Ionicons name="close" size={28} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Activity Name</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Take morning medication"
                placeholderTextColor="#6B7280"
                value={newActivity}
                onChangeText={setNewActivity}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Time</Text>
              {Platform.OS === 'ios' ? (
                <View style={{ alignItems: 'flex-start' }}>
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="default"
                    onChange={onTimeChange}
                    themeVariant="dark" 
                  />
                </View>
              ) : (
                <TouchableOpacity style={styles.textInput} onPress={() => setShowAndroidPicker(true)}>
                  <Text style={{ color: '#FFFFFF', fontSize: 16 }}>
                    {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              )}
              
              {Platform.OS === 'android' && showAndroidPicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display="default"
                  onChange={onTimeChange}
                />
              )}
            </View>

            <TouchableOpacity style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]} onPress={handleSaveRoutine} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0F19', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 4 },
  container: { flex: 1, paddingHorizontal: 20 },
  listContainer: { paddingTop: 20, paddingBottom: 100 },
  routineCard: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 20, padding: 16, marginBottom: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1F2937' },
  routineCardDone: { opacity: 0.7, backgroundColor: '#0B0F19' },
  iconContainer: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(139, 92, 246, 0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  iconContainerDone: { backgroundColor: 'rgba(16, 185, 129, 0.1)' },
  routineInfo: { flex: 1 },
  activityText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  textDone: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  timeText: { color: '#9CA3AF', fontSize: 14, fontWeight: '500' },
  
  // NEW: Action Button Styles
  actionButtonsContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  actionIcon: { padding: 8, marginLeft: 5, backgroundColor: '#1F2937', borderRadius: 12 },
  
  addButton: { flexDirection: 'row', backgroundColor: '#8B5CF6', position: 'absolute', bottom: 30, alignSelf: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#111827', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, borderWidth: 1, borderColor: '#1F2937' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  inputGroup: { marginBottom: 20 },
  inputLabel: { color: '#9CA3AF', fontSize: 14, marginBottom: 8, fontWeight: '500' },
  textInput: { backgroundColor: '#1F2937', borderRadius: 15, padding: 16, color: '#FFFFFF', fontSize: 16, borderWidth: 1, borderColor: '#374151' },
  saveButton: { backgroundColor: '#8B5CF6', padding: 18, borderRadius: 20, alignItems: 'center', marginTop: 10 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});