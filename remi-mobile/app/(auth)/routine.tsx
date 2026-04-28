import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function RoutineScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null); // Track user locally

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

  useEffect(() => { 
    fetchRoutines(); 
  }, []);

  const addRoutine = async () => {
    if (!time || !activity) return Alert.alert("Error", "Please fill in both time and activity.");
    if (!userId) return Alert.alert("Error", "User not authenticated.");

    setLoading(true);
    
    // Explicitly inserting the userId we got from fetchRoutines
    const { error } = await supabase
      .from('routines')
      .insert([{ 
        time, 
        activity, 
        user_id: userId  // This confirms the task is linked to YOU
      }]);
    
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setTime(""); 
      setActivity("");
      fetchRoutines(); // Refresh the list
    }
    setLoading(false);
  };

  const deleteRoutine = async (id: string) => {
    const { error } = await supabase.from('routines').delete().eq('id', id);
    if (error) Alert.alert("Error", "Could not delete task.");
    fetchRoutines();
  };

  return (
    <View style={styles.container}>
      <View style={styles.addCard}>
        <Text style={styles.title}>Add Daily Task 🕒</Text>
        <TextInput 
          style={styles.input} 
          placeholder="Time (e.g. 10:00 AM)" 
          value={time} 
          onChangeText={setTime} 
        />
        <TextInput 
          style={styles.input} 
          placeholder="Activity (e.g. Heart Meds)" 
          value={activity} 
          onChangeText={setActivity} 
        />
        <TouchableOpacity style={styles.button} onPress={addRoutine} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Add to Schedule</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {routines.length === 0 ? (
          <Text style={{ textAlign: 'center', color: '#666', marginTop: 20 }}>No tasks scheduled yet.</Text>
        ) : (
          routines.map((item) => (
            <View key={item.id} style={styles.routineRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.timeText}>{item.time}</Text>
                <Text style={styles.activityText}>{item.activity}</Text>
              </View>
              <TouchableOpacity onPress={() => deleteRoutine(item.id)}>
                <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 20 },
  addCard: { backgroundColor: 'white', padding: 20, borderRadius: 20, marginBottom: 20, elevation: 4 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#003366' },
  input: { borderBottomWidth: 1, borderColor: '#ddd', paddingVertical: 10, marginBottom: 15 },
  button: { backgroundColor: '#003366', padding: 15, borderRadius: 12 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  routineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1 },
  timeText: { fontWeight: 'bold', color: '#003366', fontSize: 14 },
  activityText: { fontSize: 18, color: '#444' }
});