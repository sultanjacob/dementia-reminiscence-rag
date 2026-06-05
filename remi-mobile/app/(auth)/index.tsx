import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
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
  
  const API_URL = "https://dementia-reminiscence-rag.onrender.com"; 
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you?");
  const [greeting, setGreeting] = useState("Good morning");
  const [userName, setUserName] = useState("John");
  const [currentDate, setCurrentDate] = useState("");

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
  const uiOpacity = useRef(new Animated.Value(1)).current;

  const speak = (text: string) => {
    if (!text) return;
    const cleanText = text.replace(/\*/g, ''); 
    Speech.speak(cleanText, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  useEffect(() => {
    Animated.timing(uiOpacity, {
      toValue: (isRecording || isProcessing) ? 0 : 1,
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

      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      setCurrentDate(formattedDate);

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
    Haptics.selectionAsync();
    setIsMenuVisible(true);
  };

  const resetRemi = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(false);
    setIsProcessing(false);
    
    if (dailyMemory) {
      setRemiText(`I was just admiring this photo of ${dailyMemory.title}.`);
    } else {
      setRemiText(`Hello ${userName}! I am Remi. How can I help you today?`);
    }
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
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" />
      <View style={styles.appCapsule}>
        <View style={styles.internalContent}>
          
          <Animated.View style={[styles.header, { opacity: uiOpacity }]}>
            <View>
              <Text style={styles.greetingText}>{greeting},</Text>
              <Text style={styles.nameText}>{userName}</Text>
              <Text style={styles.dateText}>{currentDate}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity 
                onPress={resetRemi} 
                style={[styles.menuIconButton, { marginRight: 10 }]}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="refresh" size={26} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleMenuOpen} 
                style={styles.menuIconButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="menu" size={32} color="#111827" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <View style={styles.orbContainer}>
            <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]} />
          </View>

          <View style={styles.speechBubble}>
            <Text style={styles.remiSpeechText}>{remiText}</Text>
            
            <TouchableOpacity 
              style={styles.repeatVoiceButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                speak(remiText);
              }}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="volume-high" size={20} color="#8B5CF6" />
              <Text style={styles.repeatVoiceText}>Hear again</Text>
            </TouchableOpacity>
            
            {dailyMemory && (
              <Animated.View style={{ width: '100%', opacity: uiOpacity, marginTop: 15 }}>
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
              <TouchableOpacity 
                onPress={() => setIsMemoryExpanded(false)} 
                style={styles.closeImageButton}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="close" size={28} color="#111827" />
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
              <TouchableOpacity 
                onPress={() => setIsMenuVisible(false)}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 45, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  internalContent: { flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingTop: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 10, marginBottom: 5 },
  greetingText: { fontSize: 18, color: '#6B7280', fontWeight: '500' },
  nameText: { fontSize: 32, fontWeight: '800', color: '#111827', marginTop: 4, letterSpacing: -0.5 },
  dateText: { fontSize: 14, color: '#8B5CF6', fontWeight: '700', marginTop: 6, textTransform: 'uppercase', letterSpacing: 1 },
  menuIconButton: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  orbContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 20 },
  orb: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 25, elevation: 15 },
  speechBubble: { backgroundColor: '#F9FAFB', padding: 24, borderRadius: 28, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#F3F4F6' },
  remiSpeechText: { fontSize: 20, color: '#1F2937', textAlign: 'center', lineHeight: 30, fontWeight: '600', marginBottom: 5 },
  repeatVoiceButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginBottom: 5 },
  repeatVoiceText: { color: '#8B5CF6', fontSize: 15, fontWeight: '700', marginLeft: 6 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(17, 24, 39, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 28, paddingBottom: 50, paddingTop: 16, shadowColor: '#000', shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20 },
  modalDragIndicator: { width: 50, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuIconContainer: { backgroundColor: '#F5F3FF', padding: 12, borderRadius: 16, marginRight: 16 },
  menuRowText: { flex: 1, fontSize: 18, fontWeight: '600', color: '#374151' },
  imageCapsule: { backgroundColor: '#FFFFFF', borderRadius: 35, padding: 24, alignSelf: 'center', width: '90%', marginBottom: '40%', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.15, shadowRadius: 30, elevation: 20 },
  imageModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  imageModalTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  imageModalDate: { fontSize: 16, color: '#8B5CF6', marginTop: 4, fontWeight: '600' },
  closeImageButton: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 20 },
  largeExpandedImage: { width: '100%', height: 350, borderRadius: 24 },
  flashingEmergencyButton: { backgroundColor: '#EF4444', flexDirection: 'row', paddingVertical: 20, paddingHorizontal: 20, borderRadius: 35, marginVertical: 15, alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 12 },
  flashingEmergencyText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', letterSpacing: 1 },
  emergencyModalContent: { backgroundColor: '#1F2937', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 28, paddingBottom: 50, paddingTop: 30 },
  emergencyModalTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 30 },
  contactRow: { backgroundColor: '#374151', flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 16 },
  contactText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  numberText: { color: '#9CA3AF', fontSize: 15, marginTop: 4 },
  policeRow: { backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 30 },
  policeText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginLeft: 15 },
  cancelEmergencyButton: { paddingVertical: 15, alignItems: 'center' },
  cancelEmergencyText: { color: '#9CA3AF', fontSize: 18, fontWeight: '700' },
});