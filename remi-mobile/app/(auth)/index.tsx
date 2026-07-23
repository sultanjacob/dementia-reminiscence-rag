import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useNavigation, useRouter } from 'expo-router';
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
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const router = useRouter();
  const navigation = useNavigation(); 
  
  const API_URL = "https://dementia-reminiscence-rag.onrender.com"; 
  
  const [remiText, setRemiText] = useState("Hello! I am Remi. How can I help you?");
  const [greeting, setGreeting] = useState("Good morning");
  const [timeIcon, setTimeIcon] = useState("sunny");
  const [userName, setUserName] = useState("Peter");
  const [currentDate, setCurrentDate] = useState("");
  const [isEvening, setIsEvening] = useState(false);
  const [isNudgeActive, setIsNudgeActive] = useState(false);

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

  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  
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
      
      const evening = hour >= 17 || hour < 6;
      setIsEvening(evening);
      setTimeIcon(evening ? "moon" : "sunny");

      if (hour < 12) setGreeting("Good morning");
      else if (hour < 17) setGreeting("Good afternoon");
      else setGreeting("Good evening");

      const today = new Date();
      const formattedDate = today.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      });
      setCurrentDate(formattedDate);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let fetchedName = "John";
      
      const { data: profileData } = await supabase.from('profiles').select('nickname, primary_contact, secondary_contact').eq('id', user.id).single();
      
      if (profileData) {
        if (profileData.nickname) {
          fetchedName = profileData.nickname;
          setUserName(fetchedName);
        }
        if (profileData.primary_contact) setPrimaryContact(profileData.primary_contact);
        if (profileData.secondary_contact) setSecondaryContact(profileData.secondary_contact);
      }

      const { data: memories } = await supabase.from('memory_vault').select('*');
      
      if (memories && memories.length > 0) {
        const randomMem = memories[Math.floor(Math.random() * memories.length)];
        setDailyMemory(randomMem);
        
        if (!evening) {
          const memoryCaption = randomMem.caption ? randomMem.caption : "";
          const memoryGreeting = `I was just admiring this photo. ${memoryCaption}`.trim();
          setRemiText(memoryGreeting);
          speak(memoryGreeting); 
        } else {
          const defaultGreeting = `Good evening, ${fetchedName}. It's getting late. I am here to help you relax.`;
          setRemiText(defaultGreeting);
          speak(defaultGreeting);
        }
      } else {
        const defaultGreeting = evening 
          ? `Good evening, ${fetchedName}. It's getting late. I am here to help you relax.`
          : `Hello ${fetchedName}! I am Remi. How can I help you today?`;
        setRemiText(defaultGreeting);
        speak(defaultGreeting);
      }
    };
    
    initializeHome();
  }, []);

  const resetRemi = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(false);
    setIsProcessing(false);
    setIsNudgeActive(false);
    
    if (dailyMemory && !isEvening) {
      const memoryCaption = dailyMemory.caption ? dailyMemory.caption : "";
      setRemiText(`I was just admiring this photo. ${memoryCaption}`.trim());
    } else {
      setRemiText(isEvening ? `I am here to help you relax, ${userName}.` : `Hello ${userName}! I am Remi. How can I help you today?`);
    }
  };

  // --- MANUAL OVERRIDE LOGIC ---
  const toggleSundowningOverride = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newIsEvening = !isEvening;
    setIsEvening(newIsEvening);
    setTimeIcon(newIsEvening ? "moon" : "sunny");

    if (newIsEvening) {
      const calmGreeting = `Good evening, ${userName}. It's getting late. I am here to help you relax.`;
      setRemiText(calmGreeting);
      speak(calmGreeting);
    } else {
      if (dailyMemory) {
        const memoryCaption = dailyMemory.caption ? dailyMemory.caption : "";
        const memoryGreeting = `I was just admiring this photo. ${memoryCaption}`.trim();
        setRemiText(memoryGreeting);
        speak(memoryGreeting);
      } else {
        const defaultGreeting = `Hello ${userName}! I am Remi. How can I help you today?`;
        setRemiText(defaultGreeting);
        speak(defaultGreeting);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      resetRemi();
    });
    return unsubscribe;
  }, [navigation, dailyMemory, userName, isEvening]);

  const startRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsNudgeActive(false); 

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
        headers: { 'Content-Type': 'multipart/form-data', 'Accept': 'application/json' },
      });

      const responseText = await response.text();
      let responseData;
      try { responseData = JSON.parse(responseText); } 
      catch (parseError) { throw new Error(`Server returned invalid JSON`); }

      if (response.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const aiText = responseData.message || "I didn't quite catch that.";
        setRemiText(aiText);
        speak(aiText);
        if (aiText.toLowerCase().includes("call family")) setIsDistressed(true);
        else setIsDistressed(false); 
      } else {
        throw new Error(`[HTTP ${response.status}]`);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const fallbackMessage = "I'm having a little trouble connecting to the internet right now. Let's try again in a minute.";
      setRemiText(fallbackMessage);
      speak(fallbackMessage); 
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMenuOpen = () => {
    Haptics.selectionAsync();
    setIsMenuVisible(true);
  };

  const handleSignOut = async () => {
    setIsMenuVisible(false);
    setTimeout(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) Alert.alert("Sign Out Error", error.message);
      else router.replace('/login'); 
    }, 500);
  };

  const handlePrimaryCall = () => {
    if (primaryContact) Linking.openURL(`tel:${primaryContact}`);
    else Alert.alert("Not Setup", "Please ask your family to add a Primary Contact in settings.");
  };

  const handleSecondaryCall = () => {
    if (secondaryContact) Linking.openURL(`tel:${secondaryContact}`);
    else Alert.alert("Not Setup", "Please ask your family to add a Secondary Contact in settings.");
  };

  const handleNudgePress = (suggestion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsNudgeActive(true); 
    const textPrompt = `Tap the microphone and ask me: "${suggestion}"`;
    setRemiText(textPrompt);
    speak(`Tap the purple microphone and ask me: ${suggestion}`);
  };

  const handleSecretTap = () => {
    const now = Date.now();
    if (now - lastTapTime < 800) {
      if (tapCount + 1 >= 3) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setShowPinModal(true);
        setTapCount(0); 
      } else {
        setTapCount(tapCount + 1);
      }
    } else {
      setTapCount(1);
    }
    setLastTapTime(now);
  };
  
  const handlePatientSOS = () => {
    Alert.alert(
      "🚨 EMERGENCY 🚨",
      "Do you need help right now?",
      [
        { text: "I'm Okay (Cancel)", style: "cancel" },
        { 
          text: "Yes, Call Family", 
          style: "destructive",
          onPress: () => {
            if (primaryContact) {
              Linking.openURL(`tel:${primaryContact}`).catch(() => Alert.alert("Error", "Could not open the phone dialer."));
            } else {
              Alert.alert("Alert Sent Digitally", "No Primary Contact is set, but an alert has been logged.");
            }
          }
        }
      ]
    );
  };

  const verifyCaregiverPin = async (pinAttempt: string) => {
    setEnteredPin(pinAttempt);
    if (pinAttempt.length === 4) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase.from('profiles').select('caregiver_pin').eq('id', user.id).single();
        
        if (data && data.caregiver_pin === pinAttempt) {
          setShowPinModal(false);
          setEnteredPin('');
          router.push('/(caregiver)'); 
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Incorrect PIN", "The PIN entered is incorrect.");
          setEnteredPin('');
        }
      } catch (error: any) {
        setEnteredPin('');
      }
    }
  };

  const safeAreaBgColor = isEvening ? '#FDE68A' : '#F3F4F6'; 
  const appCapsuleBgColor = isEvening ? '#FEF3C7' : '#FFFFFF'; 
  const bubbleBgColor = isEvening ? '#FDE68A' : '#F9FAFB';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: safeAreaBgColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={safeAreaBgColor} />
      <View style={[styles.appCapsule, { backgroundColor: appCapsuleBgColor }]}>
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.internalContent} showsVerticalScrollIndicator={false}>
          
          <Animated.View style={[styles.header, { opacity: uiOpacity }]}>
            <View>
              {/* INTERACTIVE OVERRIDE: Long press toggles daytime/evening */}
              <TouchableOpacity 
                activeOpacity={0.7} 
                onLongPress={toggleSundowningOverride} 
                delayLongPress={800}
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <Ionicons name={timeIcon as any} size={20} color={isEvening ? '#D97706' : '#F59E0B'} style={{ marginRight: 6 }} />
                <Text style={styles.greetingText}>{greeting},</Text>
              </TouchableOpacity>
              <Text style={styles.nameText}>{userName}</Text>
              <Text style={styles.dateText}>{currentDate}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={resetRemi} style={[styles.menuIconButton, { marginRight: 10 }]} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Ionicons name="refresh" size={26} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleMenuOpen} style={styles.menuIconButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Ionicons name="menu" size={32} color="#111827" />
              </TouchableOpacity>
            </View>
          </Animated.View>

          <TouchableOpacity activeOpacity={1} onPress={handleSecretTap} style={styles.orbContainer}>
            <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]} />
          </TouchableOpacity>

          <View style={[styles.speechBubble, { backgroundColor: bubbleBgColor }]}>
            <Text style={styles.remiSpeechText}>{remiText}</Text>
            
            <TouchableOpacity 
              style={[styles.repeatVoiceButton, { backgroundColor: isEvening ? '#FBBF24' : '#F5F3FF' }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                speak(remiText);
              }}
            >
              <Ionicons name="volume-high" size={20} color={isEvening ? '#92400E' : '#8B5CF6'} />
              <Text style={[styles.repeatVoiceText, isEvening && { color: '#92400E' }]}>Hear again</Text>
            </TouchableOpacity>
            
            {dailyMemory && !isNudgeActive && !isEvening && (
              <Animated.View style={{ width: '100%', opacity: uiOpacity, marginTop: 15 }}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => setIsMemoryExpanded(true)} style={styles.memoryDropContainer}>
                  <Image source={{ uri: dailyMemory.image_url }} style={styles.memoryImage} resizeMode="cover" />
                  <View style={styles.memoryOverlay}>
                    <Ionicons name="scan-circle-outline" size={18} color="#FFFFFF" style={{marginRight: 6}} />
                    <Text style={styles.memoryTitleText}>
                      Tap to view {dailyMemory.caption ? (dailyMemory.caption.length > 20 ? dailyMemory.caption.substring(0, 20) + '...' : dailyMemory.caption) : "photo"}
                    </Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>

          {isDistressed && (
            <Animated.View style={{ opacity: flashAnim }}>
              <TouchableOpacity style={styles.flashingEmergencyButton} onPress={() => setShowEmergencyMenu(true)}>
                <Ionicons name="warning" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.flashingEmergencyText}>TAP HERE FOR HELP</Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {(!isRecording && !isProcessing && !isDistressed && !isNudgeActive) && (
             <Animated.View style={[styles.nudgesContainer, { opacity: uiOpacity }]}>
                <Text style={styles.nudgeTitle}>{isEvening ? "Relaxing suggestions:" : "Not sure what to say? Try asking:"}</Text>
                
                <View style={styles.nudgeRow}>
                  {isEvening ? (
                    <>
                      <TouchableOpacity style={[styles.nudgePill, { backgroundColor: '#FDE68A', borderColor: '#F59E0B' }]} onPress={() => handleNudgePress("Play some calming music for me.")}>
                        <Text style={[styles.nudgeText, { color: '#92400E' }]}>Play calming music</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.nudgePill, { backgroundColor: '#FDE68A', borderColor: '#F59E0B' }]} onPress={() => handleNudgePress("Remind me what time it is and that I am safe.")}>
                        <Text style={[styles.nudgeText, { color: '#92400E' }]}>What time is it?</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity style={styles.nudgePill} onPress={() => handleNudgePress("What are your plans today?")}>
                        <Text style={styles.nudgeText}>My plans today</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.nudgePill} onPress={() => handleNudgePress("Tell me a story about your past.")}>
                        <Text style={styles.nudgeText}>Tell me a story</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
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
              {isRecording ? "Recording your voice..." : "Remi is listening..."}
            </Text>
          </View>

          <TouchableOpacity onPress={handlePatientSOS} style={styles.patientSosButton}>
            <Ionicons name="warning" size={28} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.patientSosText}>HELP / SOS</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      <Modal visible={showEmergencyMenu} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.emergencyModalContent}>
            <Text style={styles.emergencyModalTitle}>Who do you want to call?</Text>
            
            <TouchableOpacity style={styles.contactRow} onPress={handlePrimaryCall}>
              <Ionicons name="person" size={24} color="#8B5CF6" />
              <View style={{ marginLeft: 15 }}>
                <Text style={styles.contactText}>Primary Contact</Text>
                <Text style={styles.numberText}>{primaryContact || "Not Setup!"}</Text>
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
              <View style={{ flex: 1, paddingRight: 15 }}>
                <Text style={styles.imageModalTitle}>{dailyMemory?.caption || "A beautiful memory"}</Text>
                <Text style={styles.imageModalDate}>
                  {dailyMemory?.created_at ? new Date(dailyMemory.created_at).toLocaleDateString() : "Shared by family"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIsMemoryExpanded(false)} style={styles.closeImageButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
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
              <TouchableOpacity onPress={() => setIsMenuVisible(false)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Ionicons name="close" size={32} color="#111827" />
              </TouchableOpacity>
            </View>
            
            <TouchableOpacity style={styles.menuRow} onPress={() => {
              setIsMenuVisible(false);
              router.push('/settings');
              }}>
              <View style={styles.menuIconContainer}>
                <Ionicons name="settings" size={24} color="#8B5CF6" />
              </View>
              <Text style={styles.menuRowText}>App Settings</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuRow} onPress={handleSignOut}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="log-out" size={24} color="#EF4444" />
              </View>
              <Text style={[styles.menuRowText, { color: '#EF4444' }]}>Sign Out</Text>
            </TouchableOpacity>
            
          </View>
        </View>
      </Modal>

      <Modal visible={showPinModal} transparent={true} animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={styles.pinModalContent}>
            <Text style={styles.pinModalTitle}>Caregiver Access</Text>
            <Text style={styles.pinModalSubtitle}>Enter 4-digit PIN to unlock Action Dashboard</Text>
            
            <TextInput
              style={styles.pinInputDisplay}
              value={enteredPin}
              onChangeText={verifyCaregiverPin}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={4}
              autoFocus={true}
              placeholder="••••"
              placeholderTextColor="#6B7280"
            />

            <TouchableOpacity style={styles.cancelEmergencyButton} onPress={() => {
              setShowPinModal(false);
              setEnteredPin('');
            }}>
              <Text style={styles.cancelEmergencyText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, borderRadius: 35, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  internalContent: { flexGrow: 1, paddingHorizontal: 20, justifyContent: 'space-between', paddingTop: 10, paddingBottom: 30 }, 
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 5, marginBottom: 0 }, 
  greetingText: { fontSize: 16, color: '#6B7280', fontWeight: '600' }, 
  nameText: { fontSize: 28, fontWeight: '800', color: '#111827', marginTop: 2, letterSpacing: -0.5 },
  dateText: { fontSize: 12, color: '#8B5CF6', fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 1 },
  menuIconButton: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  orbContainer: { alignItems: 'center', justifyContent: 'center', marginVertical: 10 }, 
  orb: { width: 86, height: 86, borderRadius: 43, backgroundColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 25, elevation: 15 }, 
  speechBubble: { padding: 18, borderRadius: 24, alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: '#E5E7EB' }, 
  remiSpeechText: { fontSize: 18, color: '#1F2937', textAlign: 'center', lineHeight: 26, fontWeight: '600', marginBottom: 5 }, 
  repeatVoiceButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, marginBottom: 5 },
  repeatVoiceText: { fontSize: 14, fontWeight: '700', marginLeft: 6 },
  nudgesContainer: { alignItems: 'center', marginBottom: 10 },
  nudgeTitle: { fontSize: 13, color: '#6B7280', marginBottom: 6, fontWeight: '600' },
  nudgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  nudgePill: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#F3F4F6' },
  nudgeText: { color: '#4B5563', fontSize: 14, fontWeight: '700' },
  memoryDropContainer: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#E5E7EB', backgroundColor: '#FFF' },
  memoryImage: { width: '100%', height: 110 }, 
  memoryOverlay: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(17, 24, 39, 0.75)', flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  memoryTitleText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  primaryButton: { backgroundColor: '#8B5CF6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 30, marginBottom: 10, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 }, 
  recordingButton: { backgroundColor: '#EF4444', shadowColor: '#EF4444' }, 
  processingButton: { backgroundColor: '#9CA3AF', shadowColor: 'transparent', elevation: 0 }, 
  primaryButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginLeft: 12 },
  bottomStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#8B5CF6', marginRight: 6 },
  statusText: { color: '#6B7280', fontSize: 14, fontWeight: '600' },
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
  imageModalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  imageModalDate: { fontSize: 16, color: '#8B5CF6', marginTop: 4, fontWeight: '600' },
  closeImageButton: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 20 },
  largeExpandedImage: { width: '100%', height: 350, borderRadius: 24 },
  flashingEmergencyButton: { backgroundColor: '#EF4444', flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 30, marginVertical: 10, alignItems: 'center', justifyContent: 'center', shadowColor: '#EF4444', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 15, elevation: 12 },
  flashingEmergencyText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  emergencyModalContent: { backgroundColor: '#1F2937', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 28, paddingBottom: 50, paddingTop: 30 },
  emergencyModalTitle: { fontSize: 24, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 30 },
  contactRow: { backgroundColor: '#374151', flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 20, marginBottom: 16 },
  contactText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  numberText: { color: '#9CA3AF', fontSize: 15, marginTop: 4 },
  policeRow: { backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 20, marginBottom: 30 },
  policeText: { color: '#FFFFFF', fontSize: 20, fontWeight: '800', marginLeft: 15 },
  cancelEmergencyButton: { paddingVertical: 15, alignItems: 'center' },
  cancelEmergencyText: { color: '#9CA3AF', fontSize: 18, fontWeight: '700' },
  
  pinModalContent: { backgroundColor: '#1F2937', borderRadius: 24, padding: 30, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  pinModalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  pinModalSubtitle: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 25 },
  pinInputDisplay: { backgroundColor: '#111827', width: '100%', borderWidth: 1, borderColor: '#374151', borderRadius: 16, paddingVertical: 20, color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', textAlign: 'center', letterSpacing: 12, marginBottom: 20 },

  patientSosButton: { backgroundColor: '#EF4444', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 15, marginBottom: 10, shadowColor: '#EF4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 },
  patientSosText: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold' }
});