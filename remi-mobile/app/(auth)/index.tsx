import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics'; // 💡 NEW: Haptic Engine
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
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
  
  // 🛑 Keep your Render URL here for later!
  const API_URL = "https://dementia-reminiscence-rag.onrender.com"; 
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you?");
  const [greeting, setGreeting] = useState("Good morning");
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
  const uiOpacity = useRef(new Animated.Value(1)).current; // 💡 NEW: Focus Mode Animator

  const speak = (text: string) => {
    if (!text) return;
    const cleanText = text.replace(/\*/g, ''); 
    Speech.speak(cleanText, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  // 💡 NEW: Focus Mode Trigger
  useEffect(() => {
    Animated.timing(uiOpacity, {
      toValue: (isRecording || isProcessing) ? 0 : 1, // Fades to 0 when busy, back to 1 when done
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [isRecording, isProcessing]);

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
          if (profileData.secondaryContact) setSecondaryContact(profileData.secondary_contact);
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

  const startRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // 💡 NEW: Physical click when tapped
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert("Permission Denied", "Remi needs microphone access.");
      
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // 💡 NEW: Soft click when stopped
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
        headers: { 
          'Content-Type': 'multipart/form-data'
        },
      });

      const responseData = await response.json();
      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); // 💡 NEW: Success vibration when brain replies
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); // 💡 NEW: Error vibration
      setRemiText("Sorry, I had trouble connecting to my brain.");
    } finally {
      setIsProcessing(false);
    }
  };

  const navigateTo = (path: any) => {
    setIsMenuVisible(false); 
    router.push(path);       
  };

  const handleMenuOpen = () => {
    Haptics.selectionAsync(); // Soft tick when opening menu
    setIsMenuVisible(true);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.appCapsule}>
        <View style={styles.internalContent}>
          
          {/* 💡 NEW: Header wrapped in Animated.View to fade out */}
          <Animated.View style={[styles.header, { opacity: uiOpacity }]}>
            <View>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.nameText}>{userName}</Text>
            </View>
            <TouchableOpacity onPress={handleMenuOpen} style={styles.menuIconButton}>
              <Ionicons name="menu" size={32} color="#111827" />
            </TouchableOpacity>
          </Animated.View>

          <View style={styles.orbContainer}>
            <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]} />
          </View>

          <View style={styles.speechBubble}>
            <Text style={styles.remiSpeechText}>{remiText}</Text>
            
            {/* 💡 NEW: Memory image wrapped in Animated.View to fade out */}
            {dailyMemory && (
              <Animated.View style={{ width: '100%', opacity: uiOpacity }}>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  onPress={() => {
                    Haptics.selectionAsync();
                    setIsMemoryExpanded(true);
                  }}
                  style={styles.memoryDropContainer}
                >
                  <Image source={{ uri: dailyMemory.image_url }} style={styles.memoryImage} resizeMode="cover" />
                  <View style={styles.memoryOverlay}>
                    <Ionicons name="scan-circle-outline" size={18} color="#FFFFFF" style={{marginRight: 6}} />
                    <Text style={styles.memoryTitleText}>Tap to view {dailyMemory.title}</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
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
            <Ionicons name={isRecording ? "stop-circle" : (isProcessing ? "hourglass" : "mic")} size={28} color="#FFFFFF" />
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

      {/* Modals remain the same... */}
      <Modal visible={showEmergencyMenu} transparent={true} animationType="slide">
        {/* Modal Content Hidden for brevity, use your existing ones! */}
      </Modal>
    </SafeAreaView>
  );
}
{/* Memory Modal - Light Theme */}
      <Modal visible={isMemoryExpanded} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.imageCapsule}>
            <View style={styles.imageModalHeader}>
              <View>
                <Text style={styles.imageModalTitle}>{dailyMemory?.title}</Text>
                <Text style={styles.imageModalDate}>{dailyMemory?.date || "A beautiful memory"}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMemoryExpanded(false)} style={styles.closeImageButton}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: dailyMemory?.image_url }} style={styles.largeExpandedImage} />
          </View>
        </View>
      </Modal>

      {/* Settings Menu Modal - Light Theme */}
      <Modal visible={isMenuVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalDragIndicator} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setIsMenuVisible(false)}>
                <Ionicons name="close" size={32} color="#111827" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.menuRow} onPress={() => navigateTo('/routine')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="calendar" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.menuRowText}>Manage Routine</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuRow} onPress={() => navigateTo('/caregiver')}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="person" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.menuRowText}>Caregiver Portal</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
// Keep your existing styles array exactly as it is!
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 45, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  internalContent: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, marginBottom: 5 },
  greetingText: { fontSize: 18, color: '#6B7280', fontWeight: '500' },
  nameText: { fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 4, letterSpacing: -0.5 },
  menuIconButton: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  orbContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  orb: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 25, elevation: 15 },
  speechBubble: { backgroundColor: '#F9FAFB', padding: 24, borderRadius: 28, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  remiSpeechText: { fontSize: 20, color: '#1F2937', textAlign: 'center', lineHeight: 30, fontWeight: '600', marginBottom: 15 },
  memoryDropContainer: { width: '100%', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  memoryImage: { width: '100%', height: 140 },
  memoryOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(17, 24, 39, 0.75)', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 16 },
  memoryTitleText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  primaryButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 35, marginBottom: 20, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 15, elevation: 10 },
  recordingButton: { backgroundColor: '#EF4444', shadowColor: '#EF4444' }, 
  processingButton: { backgroundColor: '#9CA3AF', shadowColor: 'transparent', elevation: 0 }, 
  primaryButtonText: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginLeft: 12 },
  bottomStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  statusDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#8B5CF6', marginRight: 8 },
  statusText: { color: '#6B7280', fontSize: 16, fontWeight: '600' },
  dividerLine: { height: 4, backgroundColor: '#E5E7EB', width: 40, borderRadius: 2, alignSelf: 'center', marginBottom: 10 },
  flashingEmergencyButton: { backgroundColor: '#EF4444', flexDirection: 'row', paddingVertical: 20, paddingHorizontal: 20, borderRadius: 35, marginVertical: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 12 },
  flashingEmergencyText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
});