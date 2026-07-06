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

  const handleAddRoutine = async () => {
    if (!newActivity.trim()) {
      Alert.alert("Missing Info", "Please enter an activity name.");
      return;
    }

    try {
      setIsSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Force strict 24-hour "HH:MM" format for the database
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const formattedTime = `${hours}:${minutes}`; 

      const { error } = await supabase
        .from('routines')
        .insert([
          { 
            activity: newActivity, 
            time: formattedTime, 
            is_completed: false,
            icon: 'calendar-outline', 
            user_id: user?.id 
          }
        ]);

      if (error) throw error;

      // Reset form and close modal
      setNewActivity('');
      setSelectedTime(new Date());
      setIsModalVisible(false);
      
      fetchRoutines();
      
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to add routine.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderRoutine = ({ item }: { item: any }) => {
    const isDone = item.is_completed;
    
    // Safer manual AM/PM conversion that works perfectly on Android
    let displayTime = item.time;
    if (item.time && item.time.includes(':')) {
      const parts = item.time.split(':');
      const h = parseInt(parts[0], 10);
      const m = parts[1].substring(0, 2); // Grab exactly the minutes
      
      if (!isNaN(h)) {
        const ampm = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12; // Converts 0 to 12, 13 to 1, etc.
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
        <View style={styles.statusBadge}>
          {isDone ? <Ionicons name="checkmark-circle" size={24} color="#10B981" /> : <View style={styles.pendingCircle} />}
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
        <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => setIsModalVisible(true)}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Routine</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Routine</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
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

            <TouchableOpacity style={[styles.saveButton, isSubmitting && { opacity: 0.7 }]} onPress={handleAddRoutine} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save Routine</Text>}
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
  statusBadge: { marginLeft: 10, justifyContent: 'center', alignItems: 'center' },
  pendingCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#374151' },
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