import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const [answer, setAnswer] = useState("Hello! I'm Remi. Tap the brain to talk to me.");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const speak = (text: string) => {
    Speech.speak(text, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.aiText}>{answer}</Text>
      </View>

      <TouchableOpacity 
        style={styles.micButton}
        onPress={() => speak("I am listening. What is on your mind?")}
      >
        <Text style={{ fontSize: 60 }}>🧠</Text>
      </TouchableOpacity>
      
      <Text style={styles.hint}>Tap Remi to talk</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f8', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: 'white', padding: 30, borderRadius: 30, width: '100%', marginBottom: 40, elevation: 5 },
  aiText: { fontSize: 22, color: '#003366', textAlign: 'center', lineHeight: 30 },
  micButton: { backgroundColor: 'white', width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', elevation: 10, borderWidth: 4, borderColor: '#003366' },
  hint: { marginTop: 20, color: '#666', fontWeight: 'bold' }
});