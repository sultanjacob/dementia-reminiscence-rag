import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function CaregiverScreen() {
  // Profile State
  const [nickname, setNickname] = useState('');
  const [profession, setProfession] = useState('');
  const [family, setFamily] = useState('');

  // Routine State
  const [time, setTime] = useState('');
  const [activity, setActivity] = useState('');

  const handleUpdateProfile = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return Alert.alert("Error", "No user logged in.");

      // Save directly to Supabase
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        nickname: nickname,
        former_profession: profession,
        family_details: family
      });

      if (error) throw error;

      Alert.alert("Success", "Profile updated successfully!");
      setNickname(''); setProfession(''); setFamily(''); // Clear form
    } catch (error: any) {
      console.error("Profile Error:", error);
      Alert.alert("Database Error", error.message);
    }
  };

  const handleAddRoutine = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) return Alert.alert("Error", "No user logged in.");
      if (!time || !activity) return Alert.alert("Wait!", "Please enter both a time and an activity.");

      // Save directly to Supabase
      const { error } = await supabase.from('routines').insert({
        user_id: user.id,
        time: time,
        activity: activity
      });

      if (error) throw error;

      Alert.alert("Success", "Routine added to the schedule!");
      setTime(''); setActivity(''); // Clear form
    } catch (error: any) {
      console.error("Routine Error:", error);
      Alert.alert("Database Error", error.message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Caregiver Settings 🎛️</Text>

      {/* --- SECTION 1: IDENTITY ANCHORING --- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Update User Profile</Text>
        <Text style={styles.subText}>Help Remi know who she is talking to.</Text>

        <TextInput 
          style={styles.input} placeholder="Nickname (e.g., Jacob)" 
          value={nickname} onChangeText={setNickname} 
        />
        <TextInput 
          style={styles.input} placeholder="Former Profession (e.g., Engineer)" 
          value={profession} onChangeText={setProfession} 
        />
        <TextInput 
          style={styles.input} placeholder="Family Details (e.g., Wife Jane)" 
          value={family} onChangeText={setFamily} 
        />

        <TouchableOpacity style={styles.buttonPrimary} onPress={handleUpdateProfile}>
          <Text style={styles.buttonText}>Save Profile Info</Text>
        </TouchableOpacity>
      </View>

      {/* --- SECTION 2: SCHEDULE MANAGEMENT --- */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Add Daily Routine</Text>
        <Text style={styles.subText}>What should Remi remind them to do?</Text>

        <TextInput 
          style={styles.input} placeholder="Time (e.g., 08:00 AM)" 
          value={time} onChangeText={setTime} 
        />
        <TextInput 
          style={styles.input} placeholder="Activity (e.g., Take morning pills)" 
          value={activity} onChangeText={setActivity} 
        />

        <TouchableOpacity style={styles.buttonSecondary} onPress={handleAddRoutine}>
          <Text style={styles.buttonText}>Add to Schedule</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', padding: 15 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a202c', marginBottom: 20, textAlign: 'center' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 2 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#2d3748', marginBottom: 5 },
  subText: { fontSize: 14, color: '#718096', marginBottom: 15 },
  input: { backgroundColor: '#edf2f7', padding: 12, borderRadius: 8, marginBottom: 10, fontSize: 16 },
  buttonPrimary: { backgroundColor: '#4299E1', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonSecondary: { backgroundColor: '#48BB78', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 5 },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});