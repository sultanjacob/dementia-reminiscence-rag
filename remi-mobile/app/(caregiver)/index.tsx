import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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

export default function CaregiverRoutinesScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      // We removed the strict .eq('patient_id') filter here so it pulls everything!
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

  const pendingRoutines = routines.filter(r => !r.is_completed);
  const completedRoutines = routines.filter(r => r.is_completed);

  // Safety fallbacks to prevent "null" from showing up on screen
  const safeTitle = (title: any) => (title && title !== 'null') ? String(title) : "Scheduled Task";
  const safeTime = (time: any) => (time && time !== 'null') ? String(time) : "Anytime";

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
                    <Image source={{ uri: routine.image_url }} style={styles.taskImage} />
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
                      <Image source={{ uri: routine.image_url }} style={[styles.taskImage, { opacity: 0.5 }]} />
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
});