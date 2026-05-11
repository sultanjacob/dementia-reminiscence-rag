import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { Alert, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const router = useRouter();
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you today?");
  const [greeting, setGreeting] = useState("Hello");
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // --- DYNAMIC GREETING ---
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  // --- TEXT-TO-SPEECH ---
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

  const navigateTo = (path: any) => {
    setIsMenuVisible(false); 
    router.push(path);       
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      
      <View style={styles.container}>
        
        {/* --- 1. TOP HEADER --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.subGreetingText}>I'm here to help.</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => setIsMenuVisible(true)}>
            <Ionicons name="menu-outline" size={32} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* --- 2. MAIN AI DISPLAY (Fills middle space) --- */}
        <View style={styles.mainContent}>
          <View style={styles.aiCard}>
            <View style={styles.avatarContainer}>
              <Ionicons name="sparkles" size={28} color="#2563EB" />
            </View>
            <Text style={styles.remiSpeechText}>{remiText}</Text>
          </View>
        </View>

        {/* --- 3. BOTTOM ACTION BAR (Anchored) --- */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.primaryButton} 
            activeOpacity={0.8}
            onPress={() => Alert.alert("Voice Mode", "Microphone activated.")}
          >
            <Ionicons name="mic" size={26} color="white" />
            <Text style={styles.primaryButtonText}>Tap to Talk</Text>
          </TouchableOpacity>
        </View>

      </View>

      {/* --- CAREGIVER PORTAL (HIDDEN MODAL) --- */}
      <Modal visible={isMenuVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setIsMenuVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuRow} onPress={() => navigateTo('/schedule')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="calendar" size={22} color="#4B5563" />
              </View>
              <Text style={styles.menuRowText}>Manage Schedule</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => navigateTo('/caregiver')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="person" size={22} color="#4B5563" />
              </View>
              <Text style={styles.menuRowText}>User Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.testButton} onPress={checkSchedule}>
              <Ionicons name="notifications-outline" size={20} color="#D97706" style={{marginRight: 8}}/>
              <Text style={styles.testButtonText}>Test Background Alarms</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Base Layout
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB', // Very clean off-white
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // 1. Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 20,
  },
  greetingText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    letterSpacing: -0.5,
  },
  subGreetingText: {
    fontSize: 18,
    color: '#6B7280',
    marginTop: 4,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // 2. Main Content (The Chat Bubble)
  mainContent: {
    flex: 1,
    justifyContent: 'center', // Centers the card vertically in available space
  },
  aiCard: {
    backgroundColor: 'white',
    borderRadius: 28,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // Very subtle, professional shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2, 
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EFF6FF', // Light blue background for the icon
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  remiSpeechText: {
    fontSize: 26,
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 38,
    fontWeight: '500',
  },

  // 3. Footer (Anchored to bottom)
  footer: {
    paddingBottom: Platform.OS === 'ios' ? 10 : 30, // Extra space for Android navigation bar
    paddingTop: 20,
  },
  primaryButton: {
    backgroundColor: '#2563EB', // Professional deep blue
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    borderRadius: 20,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 22,
    fontWeight: '600',
    marginLeft: 12,
  },

  // Modal (Settings Menu)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.4)', // Darker, sleeker overlay
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 12,
  },
  modalDragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#E5E7EB',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
  },
  closeButton: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuRowText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#374151',
  },
  testButton: {
    flexDirection: 'row',
    marginTop: 30,
    backgroundColor: '#FEF3C7',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  testButtonText: {
    color: '#D97706',
    fontWeight: '600',
    fontSize: 16,
  }
});