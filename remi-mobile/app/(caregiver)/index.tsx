import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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

export default function CaregiverDashboard() {
  const router = useRouter();

  // --- PROTOTYPE STATE ---
  // In a real setup, we will fetch these from Supabase
  const [routines, setRoutines] = useState([
    { id: '1', time: '1:00 PM', title: 'Afternoon Medication', isCompleted: false },
    { id: '2', time: '2:30 PM', title: 'Lunch (High Protein)', isCompleted: true },
    { id: '3', time: '4:00 PM', title: 'Short Walk outside', isCompleted: false },
  ]);

  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleRoutine = (id: string) => {
    setRoutines(routines.map(r => 
      r.id === id ? { ...r, isCompleted: !r.isCompleted } : r
    ));
  };

  const handleEndShift = () => {
    if (!selectedVibe) {
      Alert.alert("Missing Vibe", "Please select Mary's overall mood for this shift.");
      return;
    }

    setIsSubmitting(true);
    
    // Simulate network delay for saving to Supabase
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        "Shift Logged", 
        "Your update has been beamed to the Family Dashboard.",
        [{ text: "OK", onPress: lockToPatientMode }]
      );
    }, 800);
  };

  // Instantly unmounts this dashboard and returns to the patient view
  const lockToPatientMode = () => {
    router.replace('/(auth)');
  };

  const vibes = [
    { label: 'Calm', emoji: '🙂', color: '#10B981', bgColor: 'rgba(16, 185, 129, 0.15)' },
    { label: 'Confused', emoji: '😕', color: '#F59E0B', bgColor: 'rgba(245, 158, 11, 0.15)' },
    { label: 'Agitated', emoji: '😟', color: '#EF4444', bgColor: 'rgba(239, 68, 68, 0.15)' }
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Caregiver Actions</Text>
          <Text style={styles.headerSubtitle}>Logged in securely</Text>
        </View>
        <TouchableOpacity style={styles.lockIconButton} onPress={lockToPatientMode}>
          <Ionicons name="lock-closed" size={24} color="#EF4444" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          
          {/* --- 1. ROUTINE CHECKLIST --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Today's Routines</Text>
            {routines.map((routine) => (
              <TouchableOpacity 
                key={routine.id} 
                style={[styles.routineCard, routine.isCompleted && styles.routineCompleted]}
                onPress={() => toggleRoutine(routine.id)}
                activeOpacity={0.7}
              >
                <View style={styles.routineInfo}>
                  <Text style={[styles.routineTime, routine.isCompleted && styles.textCompleted]}>
                    {routine.time}
                  </Text>
                  <Text style={[styles.routineTitle, routine.isCompleted && styles.textCompleted]}>
                    {routine.title}
                  </Text>
                </View>
                <View style={[styles.checkbox, routine.isCompleted && styles.checkboxCompleted]}>
                  {routine.isCompleted && <Ionicons name="checkmark" size={18} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* --- 2. END OF SHIFT LOG --- */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Shift Report</Text>
            
            <Text style={styles.label}>Overall Vibe</Text>
            <View style={styles.vibeRow}>
              {vibes.map((v) => {
                const isSelected = selectedVibe === v.label;
                return (
                  <TouchableOpacity
                    key={v.label}
                    style={[
                      styles.vibeButton,
                      isSelected ? { backgroundColor: v.bgColor, borderColor: v.color } : {}
                    ]}
                    onPress={() => setSelectedVibe(v.label)}
                  >
                    <Text style={styles.vibeEmoji}>{v.emoji}</Text>
                    <Text style={[styles.vibeLabel, isSelected ? { color: v.color, fontWeight: 'bold' } : {}]}>
                      {v.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>Shift Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="e.g., Mary had a great lunch, but asked about her old dog a few times."
              placeholderTextColor="#6B7280"
              multiline
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* --- 3. LOCK BUTTON --- */}
      <View style={styles.footer}>
        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleEndShift}
          disabled={isSubmitting}
        >
          <Text style={styles.submitButtonText}>
            {isSubmitting ? "Sending to Family..." : "Submit Log & Lock Device"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0F19', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF' },
  headerSubtitle: { fontSize: 14, color: '#10B981', marginTop: 4, fontWeight: '600' },
  lockIconButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: 12, borderRadius: 16 },
  
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 35 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 15, textTransform: 'uppercase', letterSpacing: 1 },
  
  // Routines
  routineCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111827', padding: 18, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1F2937' },
  routineCompleted: { backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.3)' },
  routineInfo: { flex: 1 },
  routineTime: { color: '#8B5CF6', fontSize: 13, fontWeight: '700', marginBottom: 4 },
  routineTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  textCompleted: { color: '#6B7280', textDecorationLine: 'line-through' },
  checkbox: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: '#4B5563', alignItems: 'center', justifyContent: 'center' },
  checkboxCompleted: { backgroundColor: '#10B981', borderColor: '#10B981' },
  
  // Vibe Check
  label: { color: '#9CA3AF', fontSize: 14, fontWeight: '600', marginBottom: 10, marginTop: 5 },
  vibeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  vibeButton: { flex: 1, alignItems: 'center', backgroundColor: '#111827', paddingVertical: 16, borderRadius: 16, borderWidth: 1, borderColor: '#1F2937', marginHorizontal: 4 },
  vibeEmoji: { fontSize: 28, marginBottom: 8 },
  vibeLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '500' },
  
  notesInput: { backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2937', borderRadius: 16, padding: 16, color: '#FFFFFF', fontSize: 16, minHeight: 120 },
  
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#1F2937', backgroundColor: '#0B0F19' },
  submitButton: { backgroundColor: '#8B5CF6', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});