import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function PatientRoutineScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      setIsLoading(true);
      // We are fetching all routines. (RLS will handle the filtering on the backend)
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('time', { ascending: true });

      if (error) throw error;
      if (data) setRoutines(data);
    } catch (error) {
      console.error("Error fetching routines:!!", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRoutine = async (id: string, currentStatus: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Optimistic UI update for instant feedback
    setRoutines(currentRoutines => 
      currentRoutines.map(r => r.id === id ? { ...r, is_completed: !currentStatus } : r)
    );

    // Update the database
    const { error } = await supabase
      .from('routines')
      .update({ is_completed: !currentStatus })
      .eq('id', id);

    if (error) {
      console.error("Error updating routine:", error);
      // Revert if it fails
      fetchRoutines(); 
    }
  };

  const renderRoutine = ({ item }: { item: any }) => {
    const isDone = item.is_completed;

    return (
      <TouchableOpacity 
        style={[styles.taskCard, isDone && styles.taskCardDone]}
        activeOpacity={0.7}
        onPress={() => toggleRoutine(item.id, isDone)}
      >
        <View style={[styles.iconBox, isDone ? styles.iconBoxDone : styles.iconBoxPending]}>
          <Ionicons 
            name={item.icon || 'star-outline'} 
            size={32} 
            color={isDone ? '#FFFFFF' : '#8B5CF6'} 
          />
        </View>

        <View style={styles.taskInfo}>
          <Text style={[styles.timeText, isDone && styles.textDone]}>{item.time}</Text>
          <Text style={[styles.activityText, isDone && styles.textDone]}>{item.activity}</Text>
        </View>

        <View style={styles.checkbox}>
          {isDone ? (
            <Ionicons name="checkmark-circle" size={40} color="#10B981" />
          ) : (
            <Ionicons name="ellipse-outline" size={40} color="#D1D5DB" />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Daily Plan</Text>
        <Text style={styles.headerSubtitle}>Tap a task when you finish it</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#F3F4F6', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: '#111827',
  },
  headerSubtitle: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 6,
    fontWeight: '500',
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 16,
  },
  listContainer: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  taskCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  taskCardDone: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
    shadowOpacity: 0,
    elevation: 0,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  iconBoxPending: {
    backgroundColor: '#F5F3FF',
  },
  iconBoxDone: {
    backgroundColor: '#10B981',
  },
  taskInfo: {
    flex: 1,
  },
  timeText: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  activityText: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '700',
  },
  textDone: {
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
  },
  checkbox: {
    marginLeft: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    color: '#374151',
    fontSize: 24,
    fontWeight: '700',
    marginTop: 20,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 18,
    marginTop: 8,
  }
});