import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const router = useRouter();
  
  // 🛑 PASTE YOUR ACTIVE PYTHON URL HERE 🛑
  const API_URL = "http://192.168.1.235:8000"; 
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you?");
  const [greeting, setGreeting] = useState("Good evening");
  const [userName, setUserName] = useState("John");
  
  const [primaryContact, setPrimaryContact] = useState<string | null>(null);
  const [secondaryContact, setSecondaryContact] = useState<string | null>(null);

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isMemoryExpanded, setIsMemoryExpanded] = useState(false);
  const [dailyMemory, setDailyMemory] = useState<any>(null);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  const [isDistressed, setIsDistressed] = useState(false);
  const [showEmergencyMenu, setShowEmergencyMenu] = useState(false);
  
  const flashAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const speak = (text: string) => {
    if (!text) return;
    const cleanText = text.replace(/\*/g, ''); 
    Speech.speak(cleanText, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  useEffect(() => {
    if (isDistressed) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(flashAnim, { toValue: 0.4, duration: 600, useNativeDriver: true }),
          Animated.timing(flashAnim, { toValue: 1, duration: 600, useNativeDriver: true })
        ])
      ).start();
    } else {
      flashAnim.setValue(1); 
    }
  }, [isDistressed]);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
      ])
    ).start();
  }, []);

  useEffect(() => {
    const initializeHome = async () => {
      const hour = new Date().getHours();
      if (hour < 12) setGreeting("Good morning");
      else if (hour < 18) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      const { data: { user } } = await supabase.auth.getUser();
      let fetchedName = "John";
      
      if (user) {
        const { data: profileData } = await supabase.from('profiles').select('nickname, primary_contact, secondary_contact').eq('id', user.id).single();
        
        if (profileData) {
          if (profileData.nickname) {
            fetchedName = profileData.nickname;
            setUserName(fetchedName);
          }
          if (profileData.primary_contact) setPrimaryContact(profileData.primary_contact);
          if (profileData.secondary_contact) setSecondaryContact(profileData.secondary_contact);
        }

        const { data: memories } = await supabase.from('memories').select('*').eq('user_id', user.id);
        
        if (memories && memories.length > 0) {
          const randomMem = memories[Math.floor(Math.random() * memories.length)];
          setDailyMemory(randomMem);
          
          const memoryGreeting = `I was just admiring this photo of ${randomMem.title}.`;
          setRemiText(memoryGreeting);
          speak(memoryGreeting); 
        } else {
          const defaultGreeting = `Hello ${fetchedName}! I am Remi. How can I help you today?`;
          setRemiText(defaultGreeting);
          speak(defaultGreeting);
        }
      }
    };
    
    initializeHome();
  }, []);

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

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert("Permission Denied", "Remi needs microphone access.");
      
      // RESTORED: Standard audio configuration
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });

      // RESTORED: High quality recording for better voice recognition
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

      // RESTORED: Standard fetch request
      const response = await fetch(`${API_URL}/voice-chat`, {
        method: 'POST',
        body: formData,
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
      });

      const responseData = await response.json();
      if (response.ok) {
        const aiText = responseData.message || "I didn't quite catch that.";
        setRemiText(aiText);
        speak(aiText);

        if (aiText.toLowerCase().includes("call family")) {
          setIsDistressed(true);
        } else {
          setIsDistressed(false); 
        }

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

  const handlePrimaryCall = () => {
    if (primaryContact) Linking.openURL(`tel:${primaryContact}`);
    else Alert.alert("Not Setup", "Please ask your family to add a Primary Contact in settings.");
  };

  const handleSecondaryCall = () => {
    if (secondaryContact) Linking.openURL(`tel:${secondaryContact}`);
    else Alert.alert("Not Setup", "Please ask your family to add a Secondary Contact in settings.");
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
            
            {dailyMemory && (
              <TouchableOpacity 
                activeOpacity={0.8} 
                onPress={() => setIsMemoryExpanded(true)}
                style={styles.memoryDropContainer}
              >
                <Image source={{ uri: dailyMemory.image_url }} style={styles.memoryImage} resizeMode="cover" />
                <View style={styles.memoryOverlay}>
                  <Ionicons name="scan-circle-outline" size={18} color="#FFFFFF" style={{marginRight: 6}} />
                  <Text style={styles.memoryTitleText}>Tap to view {dailyMemory.title}</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>

          {isDistressed && (
            <Animated.View style={{ opacity: flashAnim }}>
              <TouchableOpacity 
                style={styles.flashingEmergencyButton} 
                onPress={() => setShowEmergencyMenu(true)}
              >
                <Ionicons name="warning" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.flashingEmergencyText}>TAP HERE FOR HELP</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

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

      <Modal visible={showEmergencyMenu} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.emergencyModalContent}>
            <Text style={styles.emergencyModalTitle}>Who do you want to call?</Text>
            
            <TouchableOpacity style={styles.contactRow} onPress={handlePrimaryCall}>
              <Ionicons name="person" size={24} color="#8B5CF6" />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.contactText}>Primary Contact</Text>
                <Text style={styles.numberText}>{primaryContact || "Not Setup"}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.contactRow} onPress={handleSecondaryCall}>
              <Ionicons name="person" size={24} color="#8B5CF6" />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.contactText}>Secondary Contact</Text>
                <Text style={styles.numberText}>{secondaryContact || "Not Setup"}</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.policeRow} onPress={() => Linking.openURL('tel:999')}>
              <Ionicons name="medical" size={24} color="#FFFFFF" />
              <Text style={styles.policeText}>Call Emergency (999)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelEmergencyButton} onPress={() => setShowEmergencyMenu(false)}>
              <Text style={styles.cancelEmergencyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={isMemoryExpanded} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.imageCapsule}>
            <View style={styles.imageModalHeader}>
              <View>
                <Text style={styles.imageModalTitle}>{dailyMemory?.title}</Text>
                <Text style={styles.imageModalDate}>{dailyMemory?.date || "A beautiful memory"}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMemoryExpanded(false)} style={styles.closeImageButton}>
                <Ionicons name="close" size={28} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: dailyMemory?.image_url }} style={styles.largeExpandedImage} />
          </View>
        </View>
      </Modal>

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
              <Text style={styles.menuRowText}>Caregiver Portal</Text>
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
  orbContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  orb: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 30, elevation: 20 },
  speechBubble: { backgroundColor: '#231A31', padding: 20, borderRadius: 24, alignItems: 'center', marginBottom: 20 },
  remiSpeechText: { fontSize: 18, color: '#FFFFFF', textAlign: 'center', lineHeight: 28, fontWeight: '500', marginBottom: 10 },
  memoryDropContainer: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#3D2F4F' },
  memoryImage: { width: '100%', height: 120 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1A1325', borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 24, paddingBottom: 50, paddingTop: 12 },
  modalDragIndicator: { width: 40, height: 5, backgroundColor: '#3D2F4F', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#231A31' },
  menuIcon: { marginRight: 16 },
  menuRowText: { flex: 1, fontSize: 18, fontWeight: '500', color: '#E2D8F0' },
  imageCapsule: { backgroundColor: '#110C1D', borderRadius: 35, padding: 20, borderWidth: 1, borderColor: '#3D2F4F', elevation: 10, shadowColor: '#8B5CF6', shadowOpacity: 0.2, shadowRadius: 20, alignSelf: 'center', width: '95%', marginBottom: '50%' },
  imageModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  imageModalTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  imageModalDate: { fontSize: 16, color: '#A78BFA', marginTop: 4 },
  closeImageButton: { backgroundColor: '#231A31', padding: 8, borderRadius: 20 },
  largeExpandedImage: { width: '100%', height: 300, borderRadius: 20 },
  
  flashingEmergencyButton: {
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 30,
    marginVertical: 10,
    marginHorizontal: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  flashingEmergencyText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  emergencyModalContent: {
    backgroundColor: '#1A1325',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 30,
  },
  emergencyModalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 30,
  },
  contactRow: {
    backgroundColor: '#231A31',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 16,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#3D2F4F',
  },
  contactText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  numberText: {
    color: '#A396B5',
    fontSize: 14,
    marginTop: 2,
  },
  policeRow: {
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    marginBottom: 25,
  },
  policeText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 15,
  },
  cancelEmergencyButton: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  cancelEmergencyText: {
    color: '#A396B5',
    fontSize: 18,
    fontWeight: '600',
  },
});