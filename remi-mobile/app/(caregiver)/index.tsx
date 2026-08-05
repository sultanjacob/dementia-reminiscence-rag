import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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

export default function CaregiverRoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Refresh every time the caregiver opens this tab
  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('routines')
        .select('*')
        // Using patient_id to pull the tasks the family created
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

  const toggleRoutineStatus = async (id: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    
    if (newStatus) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Instantly update the Caregiver's screen
    setRoutines(prev => prev.map(r => r.id === id ? { ...r, is_completed: newStatus } : r));

    try {
      // Update the database so Mary's screen syncs automatically!
      await supabase
        .from('routines')
        .update({ is_completed: newStatus })
        .eq('id', id);
    } catch (error) {
      console.error("Failed to update routine status", error);
      fetchRoutines(); // Revert on failure
    }
  };

  const pendingRoutines = routines.filter(r => !r.is_completed);
  const completedRoutines = routines.filter(r => r.is_completed);

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
                  <View style={styles.taskInfo}>
                    <Text style={styles.taskTime}>{routine.time_string}</Text>
                    <Text style={styles.taskTitle}>{routine.title}</Text>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.completeButton}
                    onPress={() => toggleRoutineStatus(routine.id, routine.is_completed)}
                  >
                    <Ionicons name="ellipse-outline" size={24} color="#8B5CF6" />
                    <Text style={styles.completeButtonText}>Mark Done</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            {completedRoutines.length > 0 && (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 30 }]}>COMPLETED TASKS</Text>
                {completedRoutines.map((routine) => (
                  <View key={routine.id} style={[styles.taskCard, styles.taskCardCompleted]}>
                    <View style={styles.taskInfo}>
                      <Text style={[styles.taskTime, styles.textStrikethrough]}>{routine.time_string}</Text>
                      <Text style={[styles.taskTitle, styles.textStrikethrough]}>{routine.title}</Text>
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
          </View>
        )}
      </ScrollView>
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
  
  taskCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, marginBottom: 15, borderWidth: 1, borderColor: '#E5E7EB', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 3 },
  taskCardCompleted: { backgroundColor: '#F9FAFB', shadowOpacity: 0, elevation: 0 },
  
  taskInfo: { flex: 1, paddingRight: 15 },
  taskTime: { color: '#8B5CF6', fontSize: 15, fontWeight: '800', marginBottom: 4 },
  taskTitle: { color: '#111827', fontSize: 18, fontWeight: '700' },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  
  completeButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, borderColor: '#DDD6FE' },
  completeButtonText: { color: '#8B5CF6', fontSize: 15, fontWeight: 'bold', marginLeft: 6 },
  
  undoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12 },
  undoButtonText: { color: '#6B7280', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },

  allDoneBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ECFDF5', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#A7F3D0' },
  allDoneText: { color: '#065F46', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
});