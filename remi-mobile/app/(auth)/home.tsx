import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase'; // Adjust this path if your supabase.ts is located elsewhere

export default function HomeScreen() {
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you today?");

  // --- TEXT-TO-SPEECH (WITH ASTERISK SCRUBBER) ---
  const speak = (text: string) => {
    if (!text) return;
    
    // Remove all asterisks before speaking
    const cleanText = text.replace(/\*/g, ''); 
    
    Speech.speak(cleanText, { 
      language: 'en-GB', // British accent
      pitch: 0.9, 
      rate: 0.8 
    });
  };

  // --- PROACTIVE ALARM (THE WATCHMAN) ---
  const checkSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get exact current time (e.g., "11:20 PM")
      const now = new Date().toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      console.log(`🕒 Phone says it is: [${now}]`);

      // Fetch routines from Supabase
      const { data: routines, error } = await supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      // Loop through routines to find a match
      routines?.forEach(routine => {
        // Bulletproof match: Convert both to lowercase and remove hidden spaces
        const dbTime = routine.time.trim().toLowerCase();
        const phoneTime = now.trim().toLowerCase();

        console.log(`Comparing DB: [${dbTime}] with Phone: [${phoneTime}]`);

        if (dbTime === phoneTime) {
          console.log("🔔 MATCH FOUND! Triggering Alarm...");
          
          const announcement = `Excuse me. It is ${now}, which means it is time to ${routine.activity}.`;
          
          // Update the screen and speak out loud
          setRemiText(announcement);
          speak(announcement);
          
          // Pop up a visual alert
          Alert.alert("Routine Reminder", announcement);
        }
      });
    } catch (error) {
      console.error("Watchman Error:", error);
    }
  };

  // Start the background timer when the app opens
  useEffect(() => {
    checkSchedule(); // Check immediately on load
    const intervalId = setInterval(checkSchedule, 60000); // Check every 60 seconds
    return () => clearInterval(intervalId); // Cleanup if screen closes
  }, []);

  return (
    <ScrollView style={styles.container}>
      
      {/* AI Response Card */}
      <View style={styles.responseCard}>
        <Text style={styles.responseText}>{remiText}</Text>
      </View>

      {/* TEMPORARY TEST BUTTON: Tap this to test the Watchman instantly */}
      <TouchableOpacity style={styles.testButton} onPress={checkSchedule}>
        <Text style={styles.testButtonText}>Test Watchman Now 🔔</Text>
      </TouchableOpacity>

      {/* Note: If you had camera/microphone buttons here before, 
        you can safely paste them back below this line! 
      */}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#f0f4f8', 
    padding: 20 
  },
  responseCard: { 
    backgroundColor: 'white', 
    padding: 30, 
    borderRadius: 20, 
    marginTop: 40,
    marginBottom: 30,
    elevation: 4, // Shadow for Android
    shadowColor: '#000', // Shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  responseText: { 
    fontSize: 20, 
    color: '#1a202c', 
    textAlign: 'center',
    lineHeight: 28,
  },
  testButton: { 
    backgroundColor: '#ED8936', // Orange color to stand out
    padding: 15, 
    borderRadius: 12, 
    alignItems: 'center',
    elevation: 2,
  },
  testButtonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  }
});