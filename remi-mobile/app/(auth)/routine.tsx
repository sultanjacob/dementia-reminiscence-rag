import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function RoutineScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchRoutines = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from('routines').select('*').eq('user_id', user.id).order('time', { ascending: true });
    setRoutines(data || []);
  };

  useEffect(() => { fetchRoutines(); }, []);

  const addRoutine = async () => {
    if (!time || !activity) return Alert.alert("Error", "Please fill in both time and activity.");
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('routines').insert([{ time, activity, user_id: user?.id }]);
    
    if (error) Alert.alert("Error", error.message);
    else {
      setTime(""); setActivity("");
      fetchRoutines();
    }
    setLoading(false);
  };

  const deleteRoutine = async (id: string) => {
    await supabase.from('routines').delete().eq('id', id);
    fetchRoutines();
  };

  return (
    <View style={styles.container}>
      <View style={styles.addCard}>
        <Text style={styles.title}>Add Daily Task 🕒</Text>
        <TextInput style={styles.input} placeholder="Time (e.g. 10:00 AM)" value={time} onChangeText={setTime} />
        <TextInput style={styles.input} placeholder="Activity (e.g. Heart Meds)" value={activity} onChangeText={setActivity} />
        <TouchableOpacity style={styles.button} onPress={addRoutine}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Add to Schedule</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView>
        {routines.map((item) => (
          <View key={item.id} style={styles.routineRow}>
            <View>
              <Text style={styles.timeText}>{item.time}</Text>
              <Text style={styles.activityText}>{item.activity}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteRoutine(item.id)}>
              <Text style={{ color: '#FF3B30' }}>Remove</Text>
            </TouchableOpacity>
          </View>
        ))}
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
  routineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10 },
  timeText: { fontWeight: 'bold', color: '#003366' },
  activityText: { fontSize: 16, color: '#444' }
});