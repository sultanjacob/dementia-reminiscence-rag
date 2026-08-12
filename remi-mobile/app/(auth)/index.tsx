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
  
  // Vault States
  const [dailyMemory, setDailyMemory] = useState<any>(null);
  const [importantMusic, setImportantMusic] = useState<any>(null);
  const [isImportantMusicPlaying, setIsImportantMusicPlaying] = useState(false);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 

  const [isDistressed, setIsDistressed] = useState(false);
  const [showEmergencyMenu, setShowEmergencyMenu] = useState(false);

  const [tapCount, setTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [showPinModal, setShowPinModal] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  
  const [memorySound, setMemorySound] = useState<Audio.Sound | null>(null);
  
  const [bgMusic, setBgMusic] = useState<Audio.Sound | null>(null);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);

  // Auto-Announcer State
  const [announcedTasks, setAnnouncedTasks] = useState<string[]>([]);

  const flashAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      if (memorySound) memorySound.unloadAsync().catch(()=>{});
      if (bgMusic) bgMusic.unloadAsync().catch(()=>{});
    };
  }, [memorySound, bgMusic]);

  const speak = (text: string) => {
    if (!text) return;
    const cleanText = text.replace(/\*/g, ''); 
    Speech.speak(cleanText, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  const playCustomAudio = async (url: string) => {
    try {
      if (memorySound) {
        await memorySound.unloadAsync().catch(()=>{});
      }
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setMemorySound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error("Memory playback error:", error);
    }
  };

  const announceMemory = (text: string, memoryObj: any) => {
    if (memoryObj && memoryObj.audio_url) {
      playCustomAudio(memoryObj.audio_url);
    } else {
      speak(text);
    }
  };

  const toggleMusic = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (isPlayingMusic && bgMusic) {
        await bgMusic.pauseAsync();
        setIsPlayingMusic(false);
      } else {
        if (memorySound) await memorySound.stopAsync();

        if (bgMusic) {
          await bgMusic.playAsync();
          setIsPlayingMusic(true);
        } else {
          const musicUrl = 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=calm-piano-music-111826.mp3';
          const { sound } = await Audio.Sound.createAsync(
            { uri: musicUrl },
            { shouldPlay: true, isLooping: true }
          );
          setBgMusic(sound);
          setIsPlayingMusic(true);
        }
      }
    } catch (error) {
      Alert.alert("Music Error", "Could not play the relaxing music right now.");
    }
  };

  const playImportantMusic = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (isPlayingMusic && bgMusic) {
      await bgMusic.pauseAsync();
      setIsPlayingMusic(false);
    }

    if (importantMusic?.audio_url) {
      const cleanTitle = importantMusic.caption.replace('[MUSIC-IMPORTANT]', '').replace('[MUSIC]', '').trim();
      const message = `Playing ${cleanTitle}`;
      setRemiText(message);
      setIsImportantMusicPlaying(true);
      
      try {
        if (memorySound) {
          await memorySound.unloadAsync().catch(()=>{});
        }
        const { sound } = await Audio.Sound.createAsync(
          { uri: importantMusic.audio_url },
          { shouldPlay: true }
        );
        setMemorySound(sound);

        sound.setOnPlaybackStatusUpdate((status: any) => {
          if (status.didJustFinish) {
            setIsImportantMusicPlaying(false);
          }
        });
      } catch (error) {
        console.error("Error playing important music:", error);
      }
    }
  };

  const dismissImportantMusic = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Stop the music
    if (memorySound) {
      await memorySound.stopAsync().catch(()=>{});
    }
    setIsImportantMusicPlaying(false);
    
    // Clear the UI immediately
    const musicToDowngrade = importantMusic;
    setImportantMusic(null);
    
    const text = "I hope you enjoyed the song.";
    setRemiText(text);
    speak(text);

    // Update Database to remove the important flag
    if (musicToDowngrade) {
      try {
        const newCaption = musicToDowngrade.caption.replace('[MUSIC-IMPORTANT]', '[MUSIC]');
        await supabase
          .from('memory_vault')
          .update({ caption: newCaption })
          .eq('id', musicToDowngrade.id);
      } catch (error) {
        console.error("Failed to downgrade music tag", error);
      }
    }
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

      // SMART VAULT FILTERING
      const { data: memories } = await supabase.from('memory_vault').select('*');
      
      if (memories && memories.length > 0) {
        const impMusic = memories.find(m => m.caption?.includes('[MUSIC-IMPORTANT]'));
        if (impMusic) setImportantMusic(impMusic);

        const standardMemories = memories.filter(m => !m.caption?.includes('[MUSIC'));
        if (standardMemories.length > 0) {
          setDailyMemory(standardMemories[Math.floor(Math.random() * standardMemories.length)]); 
        }
      }

      if (evening) {
        const defaultGreeting = `Good evening, ${fetchedName}. It's getting late. I am here to help you relax.`;
        setRemiText(defaultGreeting);
        speak(defaultGreeting);
      } else {
        const defaultGreeting = `Hello ${fetchedName}! I am Remi. How can I help you today?`;
        setRemiText(defaultGreeting);
        speak(defaultGreeting);
      }
    };
    
    initializeHome();
  }, []);

  // --- SUPERCHARGED AUTO-ANNOUNCER ---
  useEffect(() => {
    const checkRoutines = async () => {
      if (isRecording || isProcessing || isImportantMusicPlaying || isDistressed) return;

      try {
        const { data, error } = await supabase
          .from('routines')
          .select('*')
          .eq('is_completed', false)
          .order('created_at', { ascending: true });

        if (error || !data) return;

        const now = new Date();
        const h24 = now.getHours();
        const m = now.getMinutes();
        
        const h12 = h24 % 12 || 12;
        const ampm = h24 >= 12 ? 'pm' : 'am';
        const mm = m < 10 ? '0' + m : m;
        
        const possibleFormats = [
          `${h12}:${mm} ${ampm}`, 
          `${h12}:${mm}${ampm}`,  
          `${h12}:${mm}`,         
          `${h24}:${mm}`          
        ];

        if (m === 0) {
          possibleFormats.push(`${h12} ${ampm}`);
          possibleFormats.push(`${h12}${ampm}`);
        }

        for (const routine of data) {
          if (announcedTasks.includes(routine.id)) continue;
          if (!routine.time_string || routine.time_string.toLowerCase() === 'anytime') continue;

          const routineTime = routine.time_string.toLowerCase().trim();
          const isMatch = possibleFormats.some(format => routineTime.includes(format));

          if (isMatch) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const announcement = `Excuse me ${userName}, it is time for: ${routine.title}.`;
            setRemiText(announcement);
            speak(announcement);
            setAnnouncedTasks(prev => [...prev, routine.id]);
            break; 
          }
        }
      } catch (err) {
        console.error("Auto-announcer error:", err);
      }
    };

    const intervalId = setInterval(checkRoutines, 10000); 
    checkRoutines(); 
    return () => clearInterval(intervalId);
  }, [userName, announcedTasks, isRecording, isProcessing, isImportantMusicPlaying, isDistressed]);

  const resetRemi = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(false);
    setIsProcessing(false);
    setIsNudgeActive(false);
    
    if (dailyMemory && !isEvening && !importantMusic) {
      const isPhoto = !!dailyMemory.image_url;
      const memoryCaption = dailyMemory.caption ? dailyMemory.caption : "";
      
      let memoryGreeting = "";
      if (isPhoto) {
        memoryGreeting = `I was just looking at this photo. ${memoryCaption}`.trim();
      } else {
        memoryGreeting = `Your family left you a new voice message!`.trim();
      }
      
      setRemiText(memoryGreeting);
      announceMemory(memoryGreeting, dailyMemory);
    } else {
      const text = isEvening ? `I am here to help you relax, ${userName}.` : `Hello ${userName}! I am Remi. How can I help you today?`;
      setRemiText(text);
      speak(text);
    }
  };

  const toggleSundowningOverride = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const newIsEvening = !isEvening;
    setIsEvening(newIsEvening);
    setTimeIcon(newIsEvening ? "moon" : "sunny");
    resetRemi();
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      resetRemi();
    });
    return unsubscribe;
  }, [navigation, dailyMemory, userName, isEvening, importantMusic]);

  const startRecording = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsNudgeActive(false); 

      Speech.stop();
      if (memorySound) await memorySound.stopAsync();

      if (isPlayingMusic && bgMusic) {
        await bgMusic.pauseAsync();
        setIsPlayingMusic(false);
      }

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
      await recording?.stopAndUnloadAsync().catch(()=>{});
      const uri = recording?.getURI();
      if (!uri) throw new Error("No audio file found.");
      await sendAudioToBackend(uri);
    } catch (err) {
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

        // --- 🤖 ZERO-COST AI SENTIMENT TRACKING ---
        // We analyze the context of the AI's response to determine Mary's state of mind
        if (user) {
          const lowerText = aiText.toLowerCase();
          let detectedVibe = 'Calm & Relaxed';

          // Basic Heuristic Analysis
          if (lowerText.includes("sorry") || lowerText.includes("safe") || lowerText.includes("worry") || lowerText.includes("help") || lowerText.includes("tough time")) {
              detectedVibe = 'Anxious';
          } else if (lowerText.includes("not sure") || lowerText.includes("don't know") || lowerText.includes("confused")) {
              detectedVibe = 'Confused';
          } else if (lowerText.includes("wonderful") || lowerText.includes("great") || lowerText.includes("excited") || lowerText.includes("happy")) {
              detectedVibe = 'Energetic';
          }

          // Silently log it to the database for the Family Dashboard
          supabase.from('shift_logs').insert({
              patient_id: user.id,
              caregiver_name: 'Remi AI', // This tells the family it was an automated insight!
              vibe: detectedVibe,
              notes: `Automated interaction log. Remi recently discussed: "${aiText.substring(0, 80)}..."`
          }).then(({error}) => {
              if (error) console.error("Error saving AI log:", error);
          });
        }
        
        // SOS Trigger Detection
        if (aiText.toLowerCase().includes("call family") || aiText.toLowerCase().includes("contact family")) {
          setIsDistressed(true);
        } else {
          setIsDistressed(false); 
        }
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

  const handleNudgePress = (suggestion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsNudgeActive(true); 
    const textPrompt = `Tap the microphone and: "${suggestion}"`;
    setRemiText(textPrompt);
    speak(`Tap the purple microphone and ask: ${suggestion}`);
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
  
  const verifyCaregiverPin = async (pinAttempt: string) => {
    setEnteredPin(pinAttempt);
    if (pinAttempt.length === 4) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase.from('profiles').select('caregiver_pin').eq('id', user.id).single();
        
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
                if (dailyMemory?.audio_url && remiText.includes("voice message")) {
                    playCustomAudio(dailyMemory.audio_url); 
                } else {
                    speak(remiText);
                }
              }}
            >
              <Ionicons name="volume-high" size={20} color={isEvening ? '#92400E' : '#8B5CF6'} />
              <Text style={[styles.repeatVoiceText, isEvening && { color: '#92400E' }]}>Hear again</Text>
            </TouchableOpacity>
            
            {/* IMPORTANT MUSIC BANNER */}
            {importantMusic && !isNudgeActive && !isEvening && (
              <Animated.View style={{ width: '100%', opacity: uiOpacity, marginTop: 15 }}>
                <View style={styles.musicBannerCard}>
                  <Ionicons name="musical-notes" size={36} color="#FFFFFF" style={{ marginBottom: 10 }} />
                  <Text style={styles.musicBannerTitle}>Your family sent you a song!</Text>
                  <Text style={styles.musicBannerSubtitle}>
                    {importantMusic.caption.replace('[MUSIC-IMPORTANT]', '').replace('[MUSIC]', '').trim()}
                  </Text>
                  
                  {!isImportantMusicPlaying ? (
                    <TouchableOpacity style={styles.musicBannerBtn} onPress={playImportantMusic}>
                      <Ionicons name="play" size={20} color="#8B5CF6" style={{ marginRight: 8 }} />
                      <Text style={styles.musicBannerBtnText}>Listen Now</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={[styles.musicBannerBtn, { backgroundColor: '#EF4444' }]} onPress={dismissImportantMusic}>
                      <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={[styles.musicBannerBtnText, { color: '#FFFFFF' }]}>Finished Listening</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            )}

            {/* PHOTO MEMORY CARD */}
            {dailyMemory && !importantMusic && !isNudgeActive && !isEvening && dailyMemory.image_url && (
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

            {/* VOICE NOTE ONLY CARD */}
            {dailyMemory && !importantMusic && !isNudgeActive && !isEvening && !dailyMemory.image_url && dailyMemory.audio_url && (
              <Animated.View style={{ width: '100%', opacity: uiOpacity, marginTop: 15 }}>
                <View style={styles.voiceNoteCard}>
                  <View style={styles.voiceNoteIconWrap}>
                    <Ionicons name="mic" size={28} color="#8B5CF6" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.voiceNoteTitle}>Family Voice Note</Text>
                    <Text style={styles.voiceNoteSubtitle}>Playing now...</Text>
                  </View>
                  <Ionicons name="radio-outline" size={24} color="#8B5CF6" />
                </View>
              </Animated.View>
            )}
          </View>

          {(!isRecording && !isProcessing && !isDistressed) && (
            <Animated.View style={{ opacity: uiOpacity, width: '100%' }}>
              <TouchableOpacity 
                style={[styles.musicButton, isPlayingMusic && styles.musicButtonActive]} 
                onPress={toggleMusic}
                activeOpacity={0.8}
              >
                <Ionicons name={isPlayingMusic ? "pause" : "musical-notes"} size={22} color={isPlayingMusic ? "#FFFFFF" : "#8B5CF6"} />
                <Text style={[styles.musicButtonText, isPlayingMusic && { color: '#FFFFFF' }]}>
                  {isPlayingMusic ? "Pause Music" : "Play Relaxing Music"}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* ----- FIXED ANDROID SOS BUTTON ----- */}
          {isDistressed && (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => setShowEmergencyMenu(true)}
              style={{ zIndex: 100, elevation: 10 }}
            >
              <Animated.View style={[styles.flashingEmergencyButton, { opacity: flashAnim }]}>
                <Ionicons name="warning" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.flashingEmergencyText}>TAP HERE FOR HELP</Text>
              </Animated.View>
            </TouchableOpacity>
          )}

          {(!isRecording && !isProcessing && !isDistressed && !isNudgeActive) && (
             <Animated.View style={[styles.nudgesContainer, { opacity: uiOpacity }]}>
                <Text style={styles.nudgeTitle}>{isEvening ? "Relaxing suggestions:" : "Not sure what to say? Try asking:"}</Text>
                
                <View style={styles.nudgeRow}>
                  {isEvening ? (
                    <>
                      <TouchableOpacity style={[styles.nudgePill, { backgroundColor: '#FDE68A', borderColor: '#F59E0B' }]} onPress={toggleMusic}>
                        <Text style={[styles.nudgeText, { color: '#92400E' }]}>{isPlayingMusic ? "Pause music" : "Play calming music"}</Text>
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

        </ScrollView>
      </View>

      {/* --- MEMORY IMAGE FULLSCREEN MODAL --- */}
      <Modal visible={isMemoryExpanded} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.imageCapsule}>
            <View style={styles.imageModalHeader}>
              <View style={{ flex: 1, paddingRight: 15 }}>
                <Text style={styles.imageModalTitle}>{dailyMemory?.caption || "A beautiful memory"}</Text>
              </View>
              <TouchableOpacity onPress={() => setIsMemoryExpanded(false)} style={styles.closeImageButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Ionicons name="close" size={28} color="#111827" />
              </TouchableOpacity>
            </View>
            <Image source={{ uri: dailyMemory?.image_url }} style={styles.largeExpandedImage} />
          </View>
        </View>
      </Modal>

      {/* --- REGULAR MENU MODAL --- */}
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
            
            <TouchableOpacity style={styles.menuRow} onPress={() => { setIsMenuVisible(false); router.push('/settings'); }}>
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

      {/* --- CAREGIVER PIN MODAL --- */}
      <Modal visible={showPinModal} transparent={true} animationType="fade">
        <View style={[styles.modalOverlay, { justifyContent: 'center', alignItems: 'center' }]}>
          <View style={styles.pinModalContent}>
            <Text style={styles.pinModalTitle}>Caregiver Access</Text>
            <Text style={styles.pinModalSubtitle}>Enter 4-digit PIN</Text>
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
            <TouchableOpacity style={{ paddingVertical: 15 }} onPress={() => { setShowPinModal(false); setEnteredPin(''); }}>
              <Text style={{ color: '#9CA3AF', fontSize: 18, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- EMERGENCY SOS MENU MODAL --- */}
      <Modal visible={showEmergencyMenu} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: '#FEF2F2' }]}>
            <View style={[styles.modalDragIndicator, { backgroundColor: '#FCA5A5' }]} />
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: '#DC2626' }]}>Emergency Contacts</Text>
              <TouchableOpacity 
                onPress={() => setShowEmergencyMenu(false)} 
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="close" size={32} color="#DC2626" />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 16, color: '#991B1B', marginBottom: 20, fontWeight: '600' }}>
              Who would you like to call?
            </Text>

            {/* Call Primary Contact */}
            <TouchableOpacity 
              style={[styles.menuRow, { backgroundColor: '#FEE2E2', borderRadius: 16, marginBottom: 12, paddingHorizontal: 15, borderBottomWidth: 0 }]} 
              onPress={() => {
                if (primaryContact) Linking.openURL(`tel:${primaryContact}`);
                else Alert.alert("No Number", "Primary contact number is not set.");
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#FECACA' }]}>
                <Ionicons name="call" size={24} color="#DC2626" />
              </View>
              <Text style={[styles.menuRowText, { color: '#991B1B', fontWeight: 'bold' }]}>Call Primary Contact</Text>
            </TouchableOpacity>

            {/* Call Secondary Contact */}
            <TouchableOpacity 
              style={[styles.menuRow, { backgroundColor: '#FEE2E2', borderRadius: 16, paddingHorizontal: 15, borderBottomWidth: 0 }]} 
              onPress={() => {
                if (secondaryContact) Linking.openURL(`tel:${secondaryContact}`);
                else Alert.alert("No Number", "Secondary contact number is not set.");
              }}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: '#FECACA' }]}>
                <Ionicons name="call" size={24} color="#DC2626" />
              </View>
              <Text style={[styles.menuRowText, { color: '#991B1B', fontWeight: 'bold' }]}>Call Secondary Contact</Text>
            </TouchableOpacity>
            
            {/* Dismiss and Reset Button */}
            <TouchableOpacity 
               style={{ marginTop: 25, alignSelf: 'center', padding: 15 }} 
               onPress={() => {
                 setShowEmergencyMenu(false);
                 setIsDistressed(false); 
               }}
            >
               <Text style={{ color: '#DC2626', fontSize: 16, fontWeight: '700' }}>I am safe, hide this menu</Text>
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
  
  musicBannerCard: { backgroundColor: '#8B5CF6', borderRadius: 20, padding: 25, alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
  musicBannerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  musicBannerSubtitle: { color: '#E0E7FF', fontSize: 14, marginBottom: 15, textAlign: 'center' },
  musicBannerBtn: { backgroundColor: '#FFFFFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20 },
  musicBannerBtnText: { color: '#8B5CF6', fontSize: 16, fontWeight: 'bold' },

  voiceNoteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  voiceNoteIconWrap: { backgroundColor: '#F5F3FF', padding: 10, borderRadius: 15, marginRight: 15 },
  voiceNoteTitle: { color: '#111827', fontSize: 16, fontWeight: 'bold' },
  voiceNoteSubtitle: { color: '#6B7280', fontSize: 13, marginTop: 2 },

  musicButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F3FF', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 25, marginBottom: 15, alignSelf: 'center', borderWidth: 1, borderColor: '#DDD6FE' },
  musicButtonActive: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  musicButtonText: { fontSize: 16, fontWeight: '700', color: '#8B5CF6', marginLeft: 8 },
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
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 36, borderTopRightRadius: 36, paddingHorizontal: 28, paddingBottom: 50, paddingTop: 16 },
  modalDragIndicator: { width: 50, height: 6, backgroundColor: '#E5E7EB', borderRadius: 3, alignSelf: 'center', marginBottom: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  modalTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  menuRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  menuIconContainer: { backgroundColor: '#F5F3FF', padding: 12, borderRadius: 16, marginRight: 16 },
  menuRowText: { flex: 1, fontSize: 18, fontWeight: '600', color: '#374151' },
  imageCapsule: { backgroundColor: '#FFFFFF', borderRadius: 35, padding: 24, alignSelf: 'center', width: '90%', marginBottom: '40%' },
  imageModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
  imageModalTitle: { fontSize: 20, fontWeight: '800', color: '#111827' },
  closeImageButton: { backgroundColor: '#F3F4F6', padding: 10, borderRadius: 20 },
  largeExpandedImage: { width: '100%', height: 350, borderRadius: 24 },
  flashingEmergencyButton: { backgroundColor: '#EF4444', flexDirection: 'row', paddingVertical: 16, paddingHorizontal: 20, borderRadius: 30, marginVertical: 10, alignItems: 'center', justifyContent: 'center' },
  flashingEmergencyText: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  
  pinModalContent: { backgroundColor: '#1F2937', borderRadius: 24, padding: 30, width: '85%', alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  pinModalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  pinModalSubtitle: { color: '#9CA3AF', fontSize: 14, textAlign: 'center', marginBottom: 25 },
  pinInputDisplay: { backgroundColor: '#111827', width: '100%', borderWidth: 1, borderColor: '#374151', borderRadius: 16, paddingVertical: 20, color: '#FFFFFF', fontSize: 32, fontWeight: 'bold', textAlign: 'center', letterSpacing: 12, marginBottom: 20 },
});