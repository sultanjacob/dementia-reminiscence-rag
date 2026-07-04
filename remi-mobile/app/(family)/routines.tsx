import { Ionicons } from '@expo/vector-icons';
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
import { supabase } from '../../supabase'; // Adjust path if needed

export default function FamilyRoutinesScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      setIsLoading(true);
      // Fetch routines, ordering them by time
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

  const renderRoutine = ({ item }: { item: any }) => {
    const isDone = item.is_completed;

    return (
      <View style={[styles.routineCard, isDone && styles.routineCardDone]}>
        <View style={[styles.iconContainer, isDone && styles.iconContainerDone]}>
          <Ionicons 
            name={item.icon || 'checkmark-circle-outline'} 
            size={24} 
            color={isDone ? '#10B981' : '#8B5CF6'} 
          />
        </View>
        
        <View style={styles.routineInfo}>
          <Text style={[styles.activityText, isDone && styles.textDone]}>
            {item.activity}
          </Text>
          <Text style={styles.timeText}>
            <Ionicons name="time-outline" size={12} /> {item.time}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          {isDone ? (
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          ) : (
            <View style={styles.pendingCircle} />
          )}
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
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="calendar-outline" size={48} color="#374151" />
                <Text style={styles.emptyText}>No routines scheduled yet.</Text>
                <Text style={styles.emptySubtext}>
                  (If you added them as the patient, they might be hidden by RLS rules right now!)
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity 
          style={styles.addButton} 
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Routine</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#0B0F19', // Matches the dashboard dark theme
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  headerTitle: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#FFFFFF' 
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 4,
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 20,
  },
  listContainer: {
    paddingTop: 20,
    paddingBottom: 100, // Space for the floating button
  },
  routineCard: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  routineCardDone: {
    opacity: 0.7,
    backgroundColor: '#0B0F19',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  iconContainerDone: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  routineInfo: {
    flex: 1,
  },
  activityText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  textDone: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  timeText: {
    color: '#9CA3AF',
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    marginLeft: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 20,
  },
  addButton: { 
    flexDirection: 'row', 
    backgroundColor: '#8B5CF6', 
    position: 'absolute', 
    bottom: 30, 
    alignSelf: 'center', 
    paddingVertical: 16, 
    paddingHorizontal: 24, 
    borderRadius: 30, 
    alignItems: 'center', 
    shadowColor: '#8B5CF6', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 8, 
    elevation: 8 
  },
  addButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: 'bold', 
    marginLeft: 8 
  },
});