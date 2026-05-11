import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const router = useRouter();
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you today?");
  const [greeting, setGreeting] = useState("Good day");
  const [userName, setUserName] = useState("");
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // --- ANIMATION: BREATHING PULSE ---
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();
  }, []);

  // --- DYNAMIC GREETING & PROFILE FETCH ---
  useEffect(() => {
    const fetchUserData = async () => {
      // 1. Set Time of Day
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      // 2. Fetch Name from Supabase Profile
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
        if (data && data.nickname) setUserName(data.nickname);
      }
    };
    fetchUserData();
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
      const { data: routines } = await supabase.from('routines').select('*').eq('user_id', user.id);

      routines?.forEach(routine => {
        const dbTime = routine.time.toLowerCase().replace(/\s+/g, '');
        const phoneTime = now.toLowerCase().replace(/\s+/g, '');

        if (dbTime === phoneTime) {
          const announcement = `Excuse me ${userName}. It is ${now}, which means it is time to ${routine.activity}.`;
          setRemiText(announcement);
          speak(announcement);
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
      <StatusBar barStyle="dark-content" backgroundColor="#FDF8F5" />
      
      <View style={styles.container}>
        
        {/* --- 1. DISTINCT HEADER BOX --- */}
        <View style={styles.headerCard}>
          <View>
            <Text style={styles.greetingText}>{greeting},</Text>
            <Text style={styles.nameText}>{userName || "I'm here to help."}</Text>
          </View>
          <TouchableOpacity style={styles.iconButton} onPress={() => setIsMenuVisible(true)}>
            <Ionicons name="menu" size={28} color="#5C4D43" />
          </TouchableOpacity>
        </View>

        {/* --- 2. MAIN AI DISPLAY (Middle) --- */}
        <View style={styles.middleSection}>
          <View style={styles.aiCard}>
            <Text style={styles.remiSpeechText}>{remiText}</Text>
          </View>

          {/* --- 3. TAP TO TALK (Moved closer to middle) --- */}
          <TouchableOpacity 
            style={styles.primaryButton} 
            activeOpacity={0.8}
            onPress={() => Alert.alert("Microphone Offline", "We will wire up the Python voice recording here next!")}
          >
            <Ionicons name="mic" size={26} color="white" />
            <Text style={styles.primaryButtonText}>Tap to Talk</Text>
          </TouchableOpacity>
        </View>

        {/* --- 4. BREATHING REMI ICON (Bottom) --- */}
        <View style={styles.bottomSection}>
          <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="sparkles" size={32} color="#E07A5F" />
          </Animated.View>
          <Text style={styles.remiLabel}>Remi is listening</Text>
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
                <Ionicons name="close" size={24} color="#5C4D43" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuRow} onPress={() => navigateTo('/schedule')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="calendar" size={22} color="#5C4D43" />
              </View>
              <Text style={styles.menuRowText}>Manage Schedule</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => navigateTo('/caregiver')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="person" size={22} color="#5C4D43" />
              </View>
              <Text style={styles.menuRowText}>User Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#D1D5DB" />
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FDF8F5', // Warm cream background
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },

  // 1. Header Box
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 20,
    marginTop: 20,
    // Soft shadow
    shadowColor: '#5C4D43',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3, 
  },
  greetingText: {
    fontSize: 22,
    color: '#8A796D', // Softer brown/gray
    fontWeight: '500',
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4A3F35', // Deep warm brown
    marginTop: 4,
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: '#FDF8F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 2. Middle Section
  middleSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiCard: {
    backgroundColor: 'white',
    width: '100%',
    borderRadius: 24,
    padding: 35,
    minHeight: 200,
    justifyContent: 'center',
    marginBottom: 25,
    // Soft shadow
    shadowColor: '#5C4D43',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 4,
  },
  remiSpeechText: {
    fontSize: 24,
    color: '#4A3F35',
    textAlign: 'center',
    lineHeight: 36,
    fontWeight: '500',
  },

  // 3. Primary Button
  primaryButton: {
    backgroundColor: '#E07A5F', // Warm Terracotta/Peach
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    width: '85%',
    shadowColor: '#E07A5F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },

  // 4. Bottom Section (Animated)
  bottomSection: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  pulseCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FCEBE5', // Very light peach
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  remiLabel: {
    color: '#8A796D',
    fontSize: 16,
    fontWeight: '500',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(74, 63, 53, 0.5)', // Warm dark overlay
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
    fontWeight: 'bold',
    color: '#4A3F35',
  },
  closeButton: {
    backgroundColor: '#FDF8F5',
    padding: 8,
    borderRadius: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FDF8F5',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FDF8F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  menuRowText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#4A3F35',
  }
});