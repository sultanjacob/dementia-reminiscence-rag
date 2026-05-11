import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const router = useRouter();
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you?");
  const [greeting, setGreeting] = useState("Good evening");
  const [userName, setUserName] = useState("John");
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // --- ANIMATION: GLOWING ORB ---
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  // --- DYNAMIC GREETING & PROFILE FETCH ---
  useEffect(() => {
    const fetchUserData = async () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else setGreeting("Good evening");

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
    // SafeArea is now completely black to simulate the phone frame.
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      {/* --- THE NEW CONTAINER CURVE (THE CAPSULE) --- */}
      <View style={styles.appCapsule}>
        
        <View style={styles.internalContent}>
          
          {/* --- 1. HEADER --- */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.nameText}>{userName}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.menuIconButton}>
              <Ionicons name="menu" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* --- 2. GLOWING AI ORB --- */}
          <View style={styles.orbContainer}>
            <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]} />
          </View>

          {/* --- 3. SPEECH BUBBLE --- */}
          <View style={styles.speechBubble}>
            <Text style={styles.remiSpeechText}>{remiText}</Text>
          </View>

          {/* --- 4. TAP TO TALK BUTTON --- */}
          <TouchableOpacity 
            style={styles.primaryButton} 
            activeOpacity={0.8}
            onPress={() => Alert.alert("Microphone Offline", "Microphone activation goes here!")}
          >
            <Ionicons name="mic" size={22} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Tap to Talk</Text>
          </TouchableOpacity>

          {/* --- 5. BOTTOM LISTENING STATUS --- */}
          <View style={styles.bottomStatus}>
            <View style={styles.statusDot} />
            <Text style={styles.statusText}>Remi is listening</Text>
          </View>

          <View style={styles.dividerLine} />
        </View>

      </View>

      {/* --- CAREGIVER PORTAL (DARK MODAL) --- */}
      <Modal visible={isMenuVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.menuRow} onPress={() => navigateTo('/schedule')}>
              <Ionicons name="calendar" size={22} color="#A78BFA" style={styles.menuIcon} />
              <Text style={styles.menuRowText}>Manage Schedule</Text>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={() => navigateTo('/caregiver')}>
              <Ionicons name="person" size={22} color="#A78BFA" style={styles.menuIcon} />
              <Text style={styles.menuRowText}>User Profile</Text>
              <Ionicons name="chevron-forward" size={20} color="#6B7280" />
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
    backgroundColor: '#000000', // Set the Safe Area to total black, simulating the phone frame
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },

  // --- THE NEW VISUAL CONTAINER ---
  appCapsule: {
    flex: 1,
    backgroundColor: '#110C1D', // The main app deep purple-black is inside the curve
    borderRadius: 45, // Generous curve matching the visual picture
    overflow: 'hidden', // Ensures content respects the boundary
    marginHorizontal: 10, // Small gap to make the Safe Area "phone frame" visible
    marginBottom: 10, // Small gap at the bottom
    marginTop: 10, // Small gap at the top
    borderWidth: 1,
    borderColor: '#231A31', // Subtle border adds definition
  },

  // Content manager within the capsule
  internalContent: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'space-between', // Elements push apart within the capsule
    paddingTop: 10, // Space between capsule curve and top elements
  },

  // 1. Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  greetingText: {
    fontSize: 16,
    color: '#A396B5',
    fontWeight: '500',
  },
  nameText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 2,
  },
  menuIconButton: {
    padding: 5,
  },

  // 2. Glowing Orb
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 30, // Fits orb tightly inside new constraints
  },
  orb: {
    width: 120, // Slightly smaller to fit the capsule structure neatly
    height: 120,
    borderRadius: 60,
    backgroundColor: '#8B5CF6', 
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
  },

  // 3. Speech Bubble
  speechBubble: {
    backgroundColor: '#231A31', 
    padding: 25, // Adjusted padding for neatness
    borderRadius: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  remiSpeechText: {
    fontSize: 20,
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    fontWeight: '500',
  },

  // 4. Tap to Talk Button
  primaryButton: {
    backgroundColor: '#8B5CF6', 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 30,
    marginBottom: 30,
    marginHorizontal: 15, // Anchors the button within the capsule
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },

  // 5. Bottom Status
  bottomStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#A78BFA', 
    marginRight: 6,
  },
  statusText: {
    color: '#A396B5',
    fontSize: 14,
    fontWeight: '500',
  },
  dividerLine: {
    height: 1,
    backgroundColor: '#231A31',
    width: '100%',
    marginBottom: 10,
  },

  // Dark Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1325', 
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 50,
    paddingTop: 12,
  },
  modalDragIndicator: {
    width: 40,
    height: 5,
    backgroundColor: '#3D2F4F',
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
    color: '#FFFFFF',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#231A31',
  },
  menuIcon: {
    marginRight: 16,
  },
  menuRowText: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: '#E2D8F0',
  }
});