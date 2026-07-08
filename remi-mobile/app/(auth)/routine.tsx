import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

const formatTime12Hour = (time24: string) => {
  if (!time24 || !time24.includes(':')) return time24;
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  if (isNaN(h)) return time24;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${mStr.substring(0, 2)} ${ampm}`;
};

export default function PatientRoutineScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeReminder, setActiveReminder] = useState<any | null>(null);

  // --- THE POLLING & REMINDER ENGINE ---
  useEffect(() => {
    // 1. Fetch immediately when screen opens
    fetchRoutines();

    // 2. Silently fetch and check time every 30 seconds
    const interval = setInterval(async () => {
      try {
        // Silently pull the freshest data so we never miss family updates
        const { data, error } = await supabase
          .from('routines')
          .select('*')
          .order('time', { ascending: true });

        if (error || !data) return;
        
        // Quietly update the UI list
        setRoutines(data);

        // Calculate current time exactly matching database format
        const now = new Date();
        const hours = now.getHours().toString().padStart(2, '0');
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const currentTimeString = `${hours}:${minutes}`;

        // Check if any task in this fresh data needs to ring right now
        data.forEach(routine => {
          if (!routine.is_completed && routine.time === currentTimeString) {
            triggerReminder(routine);
          }
        });
      } catch (err) {
        console.error("Polling error:", err);
      }
    }, 30000); // Runs every 30 seconds

    return () => clearInterval(interval);
  }, []); // Empty array so the timer sets up exactly once

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
      console.error("Error fetching routines!:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerReminder = (routine: any) => {
    // We use a functional state update to guarantee we have the latest activeReminder state
    setActiveReminder(currentActive => {
      // If this exact alarm is already ringing, don't trigger it again
      if (currentActive?.id === routine.id) return currentActive;
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Speech.speak(`Hello! It is time to ${routine.activity}.`, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
      
      return routine; // Set the new active reminder
    });
  };

  const handleAcknowledgeTask = async () => {
    if (!activeReminder) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Speech.stop();
    
    const { error } = await supabase
      .from('routines')
      .update({ is_completed: true })
      .eq('id', activeReminder.id);

    if (error) {
      console.error("Failed to update status!:", error);
    } else {
      setRoutines(current => 
        current.map(r => r.id === activeReminder.id ? { ...r, is_completed: true } : r)
      );
    }
    
    setActiveReminder(null);
  };

  const renderRoutine = ({ item }: { item: any }) => {
    const isDone = item.is_completed;
    const displayTime = formatTime12Hour(item.time);

    return (
      <View style={[styles.taskCard, isDone && styles.taskCardDone]}>
        <View style={[styles.iconBox, isDone ? styles.iconBoxDone : styles.iconBoxPending]}>
          <Ionicons name={item.icon || 'star-outline'} size={32} color={isDone ? '#FFFFFF' : '#8B5CF6'} />
        </View>
        <View style={styles.taskInfo}>
          <Text style={[styles.timeText, isDone && styles.textDone]}>{displayTime}</Text>
          <Text style={[styles.activityText, isDone && styles.textDone]}>{item.activity}</Text>
        </View>
        <View style={styles.statusIndicator}>
          {isDone ? <Text style={styles.doneText}>Finished</Text> : <Text style={styles.waitingText}>Waiting...</Text>}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Today's Schedule</Text>
        <Text style={styles.headerSubtitle}>Remi will let you know when it's time!</Text>
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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="sunny-outline" size={60} color="#9CA3AF" />
                <Text style={styles.emptyText}>Nothing scheduled yet.</Text>
                <Text style={styles.emptySubtext}>Enjoy your day!</Text>
              </View>
            }
          />
        )}
      </View>

      <Modal visible={!!activeReminder} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.reminderCapsule}>
            <View style={styles.orbContainer}>
               <View style={styles.orb} />
            </View>
            
            <Text style={styles.reminderTime}>{formatTime12Hour(activeReminder?.time)}</Text>
            <Text style={styles.reminderTitle}>Time to</Text>
            <Text style={styles.reminderActivity}>{activeReminder?.activity}</Text>
            
            <TouchableOpacity 
              style={styles.repeatVoiceButton}
              onPress={() => Speech.speak(`It is time to ${activeReminder?.activity}.`, { language: 'en-GB', pitch: 0.9, rate: 0.8 })}
            >
              <Ionicons name="volume-high" size={24} color="#8B5CF6" />
              <Text style={styles.repeatVoiceText}>Hear again</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.acknowledgeButton} onPress={handleAcknowledgeTask}>
              <Ionicons name="checkmark-circle" size={28} color="#FFFFFF" style={{ marginRight: 10 }} />
              <Text style={styles.acknowledgeButtonText}>Okay, I'll do it now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { paddingHorizontal: 24, paddingVertical: 20, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#111827' },
  headerSubtitle: { fontSize: 16, color: '#8B5CF6', marginTop: 6, fontWeight: '700' },
  container: { flex: 1, paddingHorizontal: 16 },
  listContainer: { paddingTop: 16, paddingBottom: 40 },
  taskCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 3 },
  taskCardDone: { backgroundColor: '#F9FAFB', shadowOpacity: 0, elevation: 0 },
  iconBox: { width: 60, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconBoxPending: { backgroundColor: '#F5F3FF' },
  iconBoxDone: { backgroundColor: '#10B981' },
  taskInfo: { flex: 1 },
  timeText: { color: '#8B5CF6', fontSize: 16, fontWeight: '700', marginBottom: 4, textTransform: 'uppercase' },
  activityText: { color: '#111827', fontSize: 22, fontWeight: '700' },
  textDone: { color: '#9CA3AF', textDecorationLine: 'line-through' },
  statusIndicator: { marginLeft: 10, backgroundColor: '#F3F4F6', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  waitingText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
  doneText: { color: '#10B981', fontSize: 14, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: '#374151', fontSize: 24, fontWeight: '700', marginTop: 20 },
  emptySubtext: { color: '#6B7280', fontSize: 18, marginTop: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  reminderCapsule: { backgroundColor: '#FFFFFF', width: '100%', borderRadius: 40, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 15 },
  orbContainer: { marginBottom: 20 },
  orb: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20, elevation: 10 },
  reminderTime: { color: '#8B5CF6', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  reminderTitle: { color: '#6B7280', fontSize: 24, fontWeight: '600' },
  reminderActivity: { color: '#111827', fontSize: 36, fontWeight: '800', textAlign: 'center', marginTop: 10, marginBottom: 30 },
  repeatVoiceButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, marginBottom: 20 },
  repeatVoiceText: { color: '#8B5CF6', fontSize: 18, fontWeight: '700', marginLeft: 8 },
  acknowledgeButton: { flexDirection: 'row', backgroundColor: '#10B981', width: '100%', paddingVertical: 20, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  acknowledgeButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' }
});