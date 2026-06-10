import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

// Tell the phone how to handle notifications when the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export default function RoutineScreen() {
  const router = useRouter();
  const [routines, setRoutines] = useState<any[]>([]);
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => { 
    fetchRoutines(); 
    requestNotificationPermissions();
  }, []);

  const requestNotificationPermissions = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow notifications so Remi can remind you of your routine.');
    }
  };

  const fetchRoutines = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('user_id', user.id)
      .order('time', { ascending: true });
    
    if (error) console.error("Fetch Error:", error);
    setRoutines(data || []);
  };

  // Helper function to schedule the alarm on the physical phone
  const scheduleLocalNotification = async (taskTime: string, taskActivity: string) => {
    try {
      // Very basic parser: assumes format like "10:00" or "14:30" for 24hr reliability
      const [hourStr, minuteStr] = taskTime.replace(/[^0-9:]/g, '').split(':');
      const hour = parseInt(hourStr, 10);
      const minute = parseInt(minuteStr, 10);

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Remi Reminder 🔔",
          body: `It is time for: ${taskActivity}`,
          sound: true,
        },
        trigger: {
          hour: hour,
          minute: minute,
          repeats: true, // Reminds them every single day!
        },
      });
    } catch (error) {
      console.log("Could not schedule exact time notification:", error);
    }
  };

  const addRoutine = async () => {
    if (!time || !activity) return Alert.alert("Error", "Please fill in both time and activity.");
    if (!userId) return Alert.alert("Error", "User not authenticated.");

    setLoading(true);
    
    const { error } = await supabase
      .from('routines')
      .insert([{ 
        time, 
        activity, 
        user_id: userId  
      }]);
    
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      // 💡 NEW: Schedule the native phone notification!
      await scheduleLocalNotification(time, activity);

      setTime(""); 
      setActivity("");
      fetchRoutines(); 
    }
    setLoading(false);
  };

  const deleteRoutine = async (id: string) => {
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) Alert.alert("Error", "Could not delete task.");
    fetchRoutines();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.appCapsule}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Routine Manager</Text>
          <View style={{ width: 40 }} /> 
        </View>

        <View style={styles.content}>
          <View style={styles.addCard}>
            <View style={styles.cardHeader}>
              <Ionicons name="time" size={24} color="#A78BFA" />
              <Text style={styles.title}>Add Daily Task</Text>
            </View>
            <Text style={styles.subtitle}>Set a time to automatically trigger a phone notification.</Text>
            
            <Text style={styles.inputLabel}>Time (24-hour format)</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. 14:30" 
              placeholderTextColor="#6B7280"
              value={time} 
              onChangeText={setTime} 
              keyboardType="numbers-and-punctuation"
            />
            
            <Text style={styles.inputLabel}>Activity</Text>
            <TextInput 
              style={styles.input} 
              placeholder="e.g. Heart Meds" 
              placeholderTextColor="#6B7280"
              value={activity} 
              onChangeText={setActivity} 
            />
            
            <TouchableOpacity style={styles.button} onPress={addRoutine} disabled={loading}>
              {loading ? <ActivityIndicator color="#110C1D" /> : <Text style={styles.buttonText}>Add to Schedule</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {routines.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="calendar-clear-outline" size={48} color="#3D2F4F" />
                <Text style={styles.emptyText}>No tasks scheduled yet.</Text>
              </View>
            ) : (
              routines.map((item) => (
                <View key={item.id} style={styles.routineRow}>
                  <View style={styles.routineInfo}>
                    <View style={styles.timePill}>
                      <Text style={styles.timeText}>{item.time}</Text>
                    </View>
                    <Text style={styles.activityText}>{item.activity}</Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteRoutine(item.id)} style={styles.deleteButton}>
                    <Ionicons name="trash" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, backgroundColor: '#110C1D', borderRadius: 45, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#231A31' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#231A31' },
  backButton: { padding: 8, backgroundColor: '#1A1325', borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  content: { flex: 1, padding: 20 },
  addCard: { backgroundColor: '#1A1325', padding: 24, borderRadius: 24, marginBottom: 24, borderWidth: 1, borderColor: '#231A31' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginLeft: 10 },
  subtitle: { color: '#A396B5', fontSize: 14, marginBottom: 20 },
  inputLabel: { color: '#E2D8F0', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { backgroundColor: '#110C1D', borderWidth: 1, borderColor: '#231A31', color: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, fontSize: 16, marginBottom: 16 },
  button: { backgroundColor: '#A78BFA', padding: 16, borderRadius: 20, marginTop: 10, alignItems: 'center' },
  buttonText: { color: '#110C1D', fontWeight: 'bold', fontSize: 16 },
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { color: '#A396B5', marginTop: 10, fontSize: 16 },
  routineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1A1325', padding: 16, borderRadius: 20, marginBottom: 12, borderWidth: 1, borderColor: '#231A31' },
  routineInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  timePill: { backgroundColor: '#3D2F4F', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, marginRight: 15 },
  timeText: { fontWeight: 'bold', color: '#E2D8F0', fontSize: 14 },
  activityText: { fontSize: 16, color: '#FFFFFF', flex: 1, fontWeight: '500' },
  deleteButton: { padding: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)', borderRadius: 15 }
});