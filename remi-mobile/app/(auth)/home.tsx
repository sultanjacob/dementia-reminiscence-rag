import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av'; // NEW: The Microphone Library!
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Modal, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const router = useRouter();
  
  // ⚠️ IMPORTANT: Put your active Python Server URL here!
  const API_URL = "http://192.168.1.235:8000";; 
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you?");
  const [greeting, setGreeting] = useState("Good evening");
  const [userName, setUserName] = useState("John");
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // --- AUDIO RECORDING STATE ---
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); // Used when waiting for Python

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

  // --- MICROPHONE: START RECORDING ---
  const startRecording = async () => {
    try {
      // 1. Request Permission
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        return Alert.alert("Permission Denied", "Remi needs microphone access to hear you.");
      }

      // 2. Prepare the phone for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 3. Start Recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(recording);
      setIsRecording(true);
      setRemiText("I'm listening...");
      
    } catch (err) {
      console.error("Failed to start recording", err);
      Alert.alert("Error", "Could not start the microphone.");
    }
  };

  // --- MICROPHONE: STOP & SEND TO PYTHON ---
  const stopRecording = async () => {
    setRecording(null);
    setIsRecording(false);
    setIsProcessing(true); // Show the loading state
    setRemiText("Thinking...");

    try {
      await recording?.stopAndUnloadAsync();
      const uri = recording?.getURI();
      
      if (!uri) throw new Error("No audio file found.");

      // Send to Python
      await sendAudioToBackend(uri);

    } catch (err) {
      console.error("Failed to stop/send recording", err);
      setIsProcessing(false);
    }
  };

  // --- SEND AUDIO TO PYTHON BACKEND ---
 const sendAudioToBackend = async (fileUri: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const formData = new FormData();
      
      // FIX 1: Changed 'audio' to 'file' to match Python
      formData.append('file', {
        uri: fileUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      if (user) formData.append('user_id', user.id);

      // FIX 2: Changed /chat to /voice-chat
      const response = await fetch(`${API_URL}/voice-chat`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const responseData = await response.json();
      
      if (response.ok) {
        // FIX 3: Changed responseData.response to responseData.message
        const aiText = responseData.message || "I didn't quite catch that.";
        setRemiText(aiText);
        speak(aiText);
      } else {
        throw new Error(responseData.message || "Server error");
      }
    } catch (error) {
      console.error("Backend Error:", error);
      Alert.alert("Connection Error", "Could not reach the Python brain.");
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
          
          <View style={styles.header}>
            <View>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.nameText}>{userName}</Text>
            </View>
            <TouchableOpacity onPress={() => setIsMenuVisible(true)} style={styles.menuIconButton}>
              <Ionicons name="menu" size={28} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.orbContainer}>
            <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]} />
          </View>

          <View style={styles.speechBubble}>
            <Text style={styles.remiSpeechText}>{remiText}</Text>
          </View>

          {/* --- DYNAMIC RECORD BUTTON --- */}
          <TouchableOpacity 
            style={[
              styles.primaryButton, 
              isRecording && styles.recordingButton, // Turns red when recording
              isProcessing && styles.processingButton // Turns gray when thinking
            ]} 
            activeOpacity={0.8}
            onPress={isRecording ? stopRecording : startRecording}
            disabled={isProcessing} // Prevent tapping while waiting for Python
          >
            <Ionicons 
              name={isRecording ? "stop-circle" : (isProcessing ? "hourglass" : "mic")} 
              size={22} 
              color="#FFFFFF" 
            />
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

      {/* CAREGIVER PORTAL (DARK MODAL) */}
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  greetingText: { fontSize: 16, color: '#A396B5', fontWeight: '500' },
  nameText: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', marginTop: 2 },
  menuIconButton: { padding: 5 },
  orbContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 30 },
  orb: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 20 },
  speechBubble: { backgroundColor: '#231A31', padding: 25, borderRadius: 24, alignItems: 'center', marginBottom: 20 },
  remiSpeechText: { fontSize: 20, color: '#FFFFFF', textAlign: 'center', lineHeight: 30, fontWeight: '500' },
  
  // Button States
  primaryButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 30, marginBottom: 30, marginHorizontal: 15 },
  recordingButton: { backgroundColor: '#EF4444' }, // Red when recording
  processingButton: { backgroundColor: '#4B5563' }, // Gray when thinking
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