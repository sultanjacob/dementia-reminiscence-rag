import { Ionicons } from '@expo/vector-icons'; // Standard Expo icons
import { useRouter } from 'expo-router'; // Allows us to jump to hidden tabs
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const router = useRouter();
  
  // State Variables
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you today?");
  const [greeting, setGreeting] = useState("Hello");
  const [isMenuVisible, setIsMenuVisible] = useState(false); // Controls the hidden caregiver portal

  // --- DYNAMIC GREETING ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good Morning");
    else if (hour < 18) setGreeting("Good Afternoon");
    else setGreeting("Good Evening");
  }, []);

  // --- TEXT-TO-SPEECH (WITH ASTERISK SCRUBBER) ---
  const speak = (text: string) => {
    if (!text) return;
    const cleanText = text.replace(/\*/g, ''); 
    Speech.speak(cleanText, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  // --- PROACTIVE ALARM (THE WATCHMAN) ---
  const checkSchedule = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const { data: routines, error } = await supabase.from('routines').select('*').eq('user_id', user.id);
      if (error) throw error;

      routines?.forEach(routine => {
        const dbTime = routine.time.toLowerCase().replace(/\s+/g, '');
        const phoneTime = now.toLowerCase().replace(/\s+/g, '');

        if (dbTime === phoneTime) {
          const announcement = `Excuse me. It is ${now}, which means it is time to ${routine.activity}.`;
          setRemiText(announcement);
          speak(announcement);
          Alert.alert("Routine Reminder", announcement);
        }
      });
    } catch (error) {
      console.error("Watchman Error:", error);
    }
  };

  useEffect(() => {
    checkSchedule(); 
    const intervalId = setInterval(checkSchedule, 60000); 
    return () => clearInterval(intervalId); 
  }, []);

  // --- NAVIGATION HELPERS FOR THE HIDDEN MENU ---
  const navigateTo = (path: any) => {
    setIsMenuVisible(false); // Close the menu
    router.push(path);       // Jump to the hidden screen
  };

  return (
    <View style={styles.container}>
      
      {/* --- TOP HEADER NAVIGATION --- */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingText}>{greeting},</Text>
          <Text style={styles.subGreetingText}>I'm here to help.</Text>
        </View>
        
        {/* Hidden Portal Button */}
        <TouchableOpacity style={styles.gearButton} onPress={() => setIsMenuVisible(true)}>
          <Ionicons name="settings-outline" size={28} color="#4A5568" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* --- BEAUTIFUL AI DISPLAY CARD --- */}
        <View style={styles.aiCard}>
          <Ionicons name="sparkles" size={32} color="#4299E1" style={styles.aiIcon} />
          <Text style={styles.remiSpeechText}>{remiText}</Text>
        </View>

      </ScrollView>

      {/* --- TAP TO TALK BUTTON (Bottom Fixed) --- */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.talkButton} onPress={() => Alert.alert("Voice Mode", "This is where your microphone recording will start!")}>
          <Ionicons name="mic" size={32} color="white" />
          <Text style={styles.talkButtonText}>Tap to Talk</Text>
        </TouchableOpacity>
      </View>

      {/* --- THE CAREGIVER PORTAL (HIDDEN MODAL) --- */}
      <Modal visible={isMenuVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Caregiver Portal 🎛️</Text>
              <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                <Ionicons name="close-circle" size={32} color="#A0AEC0" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/schedule')}>
              <Ionicons name="calendar-outline" size={24} color="#2D3748" />
              <Text style={styles.menuItemText}>Manage Schedule</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={() => navigateTo('/caregiver')}>
              <Ionicons name="person-outline" size={24} color="#2D3748" />
              <Text style={styles.menuItemText}>User Profile Settings</Text>
            </TouchableOpacity>

            {/* Optional: Put your orange test button inside the hidden menu! */}
            <TouchableOpacity style={styles.testButton} onPress={checkSchedule}>
              <Text style={styles.testButtonText}>Test Background Alarms</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F7FAFC', // Much softer, premium off-white background
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 60,
    paddingBottom: 20,
  },
  greetingText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D3748',
  },
  subGreetingText: {
    fontSize: 18,
    color: '#718096',
    marginTop: 4,
  },
  gearButton: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 50,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100, // Space for the bottom button
  },
  
  // Premium Card Styling
  aiCard: {
    backgroundColor: 'white',
    borderRadius: 24,
    padding: 30,
    marginTop: 20,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#4299E1', // Slight blue shadow for a modern look
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    minHeight: 250,
    justifyContent: 'center',
  },
  aiIcon: {
    marginBottom: 20,
  },
  remiSpeechText: {
    fontSize: 24,
    color: '#1A202C',
    textAlign: 'center',
    lineHeight: 34,
    fontWeight: '500',
  },

  // Action Button Styling
  bottomContainer: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  talkButton: {
    flexDirection: 'row',
    backgroundColor: '#4299E1',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 40,
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#4299E1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  talkButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },

  // Hidden Modal Styling
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end', // Menu slides up from the bottom
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    minHeight: 350,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#EDF2F7',
  },
  menuItemText: {
    fontSize: 18,
    color: '#2D3748',
    marginLeft: 15,
    fontWeight: '500',
  },
  testButton: {
    marginTop: 30,
    backgroundColor: '#ED8936',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  }
});