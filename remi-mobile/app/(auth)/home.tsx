import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Image, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

// --- TEMPORARY DUMMY DATA ---
const DUMMY_MEMORIES = [
  {
    id: '1',
    title: 'Sarah\'s Wedding',
    imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '2',
    title: 'Trip to the Lake',
    imageUrl: 'https://images.unsplash.com/photo-1506744626753-eba7bc336e9a?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: '3',
    title: 'Baking Cookies',
    imageUrl: 'https://images.unsplash.com/photo-1556910103-1c02745a872f?q=80&w=600&auto=format&fit=crop',
  }
];

export default function HomeScreen() {
  const router = useRouter();
  
  // 🛑 PASTE YOUR ACTIVE PYTHON URL HERE 🛑
  const API_URL = "http://192.168.1.235:8000"; 
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you?");
  const [greeting, setGreeting] = useState("Good evening");
  const [userName, setUserName] = useState("John");
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  
  // --- NEW: DAILY MEMORY STATE ---
  const [dailyMemory, setDailyMemory] = useState<any>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  const pulseAnim = useRef(new Animated.Value(1)).current;

  // --- GLOWING ORB ANIMATION ---
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  // --- FETCH USER DATA & SET MEMORY DROP ---
  useEffect(() => {
    const initializeHome = async () => {
      // 1. Set Greeting Time
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      // 2. Fetch User Name
      const { data: { user } } = await supabase.auth.getUser();
      let fetchedName = "John";
      if (user) {
        const { data } = await supabase.from('profiles').select('nickname').eq('id', user.id).single();
        if (data && data.nickname) {
          fetchedName = data.nickname;
          setUserName(fetchedName);
        }
      }

      // 3. Trigger Memory Drop (50% chance to show a memory on load, or always for testing)
      const randomMem = DUMMY_MEMORIES[Math.floor(Math.random() * DUMMY_MEMORIES.length)];
      setDailyMemory(randomMem);
      
      const memoryGreeting = `I was just admiring this photo of ${randomMem.title}.`;
      setRemiText(memoryGreeting);
      
      // Optional: Have Remi speak it immediately on load
      // speak(memoryGreeting); 
    };
    
    initializeHome();
  }, []);

  const speak = (text: string) => {
    if (!text) return;
    const cleanText = text.replace(/\*/g, ''); 
    Speech.speak(cleanText, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  const checkSchedule = async () => {
    // ... (Your existing Watchman logic remains identical)
  };

  useEffect(() => {
    checkSchedule(); 
    const intervalId = setInterval(checkSchedule, 60000); 
    return () => clearInterval(intervalId); 
  }, []);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        return Alert.alert("Permission Denied", "Remi needs microphone access.");
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setIsRecording(true);
      setRemiText("I'm listening...");
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const stopRecording = async () => {
    setRecording(null);
    setIsRecording(false);
    setIsProcessing(true);
    setRemiText("Thinking...");
    try {
      await recording?.stopAndUnloadAsync();
      const uri = recording?.getURI();
      if (!uri) throw new Error("No audio file found.");
      await sendAudioToBackend(uri);
    } catch (err) {
      console.error("Failed to stop", err);
      setIsProcessing(false);
    }
  };

  const sendAudioToBackend = async (fileUri: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const formData = new FormData();
      formData.append('file', { uri: fileUri, name: 'recording.m4a', type: 'audio/m4a' } as any);
      if (user) formData.append('user_id', user.id);

      const response = await fetch(`${API_URL}/voice-chat`, {
        method: 'POST',
        body: formData,
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const responseData = await response.json();
      if (response.ok) {
        const aiText = responseData.message || "I didn't quite catch that.";
        setRemiText(aiText);
        speak(aiText);
      } else {
        throw new Error(responseData.message || "Server error");
      }
    } catch (error) {
      console.error("Backend Error:", error);
      setRemiText("Sorry, I had trouble connecting to my brain.");
    } finally {
      setIsProcessing(false);
    }
  };

  const navigateTo = (path: any) => {
    setIsMenuVisible(false); 
    router.push(path);       
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <View style={styles.appCapsule}>
        <View style={styles.internalContent}>
          
          {/* HEADER */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.nameText}>{userName}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.menuIconButton}>
              <Ionicons name="menu" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* ORB */}
          <View style={styles.orbContainer}>
            <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]} />
          </View>

          {/* SPEECH BUBBLE & MEMORY DROP */}
          <View style={styles.speechBubble}>
            <Text style={styles.remiSpeechText}>{remiText}</Text>
            
            {/* The Image fades in if a memory is active */}
            {dailyMemory && (
              <View style={styles.memoryDropContainer}>
                <Image source={{ uri: dailyMemory.imageUrl }} style={styles.memoryImage} />
                <View style={styles.memoryOverlay}>
                  <Ionicons name="image" size={16} color="#FFFFFF" style={{marginRight: 6}} />
                  <Text style={styles.memoryTitleText}>{dailyMemory.title}</Text>
                </View>
              </View>
            )}
          </View>

          {/* RECORD BUTTON */}
          <TouchableOpacity 
            style={[styles.primaryButton, isRecording && styles.recordingButton, isProcessing && styles.processingButton]} 
            activeOpacity={0.8}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing} 
          >
            <Ionicons name={isRecording ? "stop-circle" : (isProcessing ? "hourglass" : "mic")} size={22} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>
              {isRecording ? "Tap to Stop" : (isProcessing ? "Remi is thinking..." : "Tap to Talk")}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomStatus}>
            <View style={[styles.statusDot, isRecording && { backgroundColor: '#EF4444' }]} />
            <Text style={styles.statusText}>
              {isRecording ? "Recording your voice..." : "Remi is listening"}
            </Text>
          </View>
          <View style={styles.dividerLine} />
        </View>
      </View>

      {/* MODAL */}
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
  safeArea: { flex: 1, backgroundColor: '#000000', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, backgroundColor: '#110C1D', borderRadius: 45, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#231A31' },
  internalContent: { flex: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingTop: 10 },
  
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 5 },
  greetingText: { fontSize: 16, color: '#A396B5', fontWeight: '500' },
  nameText: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginTop: 2 },
  menuIconButton: { padding: 5 },
  
  // Slightly shrunk orb to make room for the photo
  orbContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 15 },
  orb: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 20 },
  
  speechBubble: { backgroundColor: '#231A31', padding: 25, borderRadius: 24, alignItems: 'center', marginBottom: 20 },
  remiSpeechText: { fontSize: 18, color: '#FFFFFF', textAlign: 'center', lineHeight: 28, fontWeight: '500' },
  
  // Memory Drop Styles
  memoryDropContainer: { marginTop: 20, width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#3D2F4F' },
  memoryImage: { width: '100%', height: 130 },
  memoryOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(17, 12, 29, 0.7)', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  memoryTitleText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  primaryButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 30, marginBottom: 20, marginHorizontal: 15 },
  recordingButton: { backgroundColor: '#EF4444' }, 
  processingButton: { backgroundColor: '#4B5563' }, 
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
  
  bottomStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 15 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#A78BFA', marginRight: 6 },
  statusText: { color: '#A396B5', fontSize: 14, fontWeight: '500' },
  dividerLine: { height: 1, backgroundColor: '#231A31', width: '100%', marginBottom: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1325', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingBottom: 50, paddingTop: 12 },
  modalDragIndicator: { width: 40, height: 5, backgroundColor: '#3D2F4F', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#231A31' },
  menuIcon: { marginRight: 16 },
  menuRowText: { flex: 1, fontSize: 18, fontWeight: '500', color: '#E2D8F0' }
});