import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useNavigation, useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const [timeIcon, setTimeIcon] = useState("sunny");
  const [userName, setUserName] = useState("Peter");
  const [isEvening, setIsEvening] = useState(false);
  
  const [dayOfWeek, setDayOfWeek] = useState("MONDAY");
  const [timeOfDay, setTimeOfDay] = useState("MORNING");

  const [nextRoutine, setNextRoutine] = useState<any>(null);
  const [customDayMessage, setCustomDayMessage] = useState<string | null>(null);
  const [customNightMessage, setCustomNightMessage] = useState<string | null>(null);

  const [isNudgeActive, setIsNudgeActive] = useState(false);
  const [isGameActive, setIsGameActive] = useState(false);
  const [wellnessPrompt, setWellnessPrompt] = useState<{type: 'water' | 'meal', title: string, message: string} | null>(null);

  const [reassuranceNotes, setReassuranceNotes] = useState<{keywords: string[], audio_url: string, id: string}[]>([]);

  const [primaryContact, setPrimaryContact] = useState<string | null>(null);
  const [primaryContactName, setPrimaryContactName] = useState("Caregiver");
  const [primaryContactRole, setPrimaryContactRole] = useState("Primary");
  const [primaryContactAvatar, setPrimaryContactAvatar] = useState("https://i.pravatar.cc/150?u=primary");

  const [secondaryContact, setSecondaryContact] = useState<string | null>(null);
  const [secondaryContactName, setSecondaryContactName] = useState("Caregiver");
  const [secondaryContactRole, setSecondaryContactRole] = useState("Secondary");
  const [secondaryContactAvatar, setSecondaryContactAvatar] = useState("https://i.pravatar.cc/150?u=secondary");

  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isMemoryExpanded, setIsMemoryExpanded] = useState(false);
  
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

  const [announcedTasks, setAnnouncedTasks] = useState<string[]>([]);

  const flashAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const uiOpacity = useRef(new Animated.Value(1)).current;
  const attentionAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    return () => {
      Speech.stop();
      if (memorySound) memorySound.unloadAsync().catch(()=>{});
      if (bgMusic) bgMusic.unloadAsync().catch(()=>{});
    };
  }, [memorySound, bgMusic]);

  const speak = (text: string) => {
    if (!text) return;
    const cleanText = text.replace(/\*/g, ''); 
    const speechRate = isEvening ? 0.68 : 0.8; 
    Speech.speak(cleanText, { language: 'en-GB', pitch: 0.9, rate: speechRate });
  };

  const playCustomAudio = async (url: string) => {
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      console.warn("Invalid Audio URL blocked:", url);
      Alert.alert("Link Broken", "The family audio link in the database is broken. Please check the URL.");
      setRemiText("I tried to play a message, but the link is broken.");
      return;
    }

    try {
      if (memorySound) {
        await memorySound.unloadAsync().catch(()=>{});
      }
      const { sound } = await Audio.Sound.createAsync({ uri: url });
      setMemorySound(sound);
      await sound.playAsync();
    } catch (error) {
      console.error("Memory playback error:", error);
      Alert.alert("Playback Error", "The audio file could not be played. It might be an invalid format.");
      setRemiText("I had trouble playing that message.");
    }
  };

  const announceMemory = (text: string, memoryObj: any) => {
    if (memoryObj && memoryObj.audio_url) {
      playCustomAudio(memoryObj.audio_url);
    } else {
      speak(text);
    }
  };

  const startRelaxingMusic = async () => {
    try {
      if (isPlayingMusic) return;
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
    } catch (error) {
      console.error("Error starting music:", error);
    }
  };

  const toggleMusic = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlayingMusic && bgMusic) {
      await bgMusic.pauseAsync();
      setIsPlayingMusic(false);
    } else {
      await startRelaxingMusic();
    }
  };

  const triggerCalmMode = async (reasonText?: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsEvening(true);
    setTimeIcon("moon");
    await startRelaxingMusic();
    
    if (reasonText) {
      setRemiText(reasonText);
      speak(reasonText);
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
    if (memorySound) {
      await memorySound.stopAsync().catch(()=>{});
    }
    setIsImportantMusicPlaying(false);
    
    const musicToDowngrade = importantMusic;
    setImportantMusic(null);
    
    const text = "I hope you enjoyed the song.";
    setRemiText(text);
    speak(text);

    if (musicToDowngrade) {
      try {
        const newCaption = musicToDowngrade.caption.replace('[MUSIC-IMPORTANT]', '[MUSIC]');
        await supabase.from('memory_vault').update({ caption: newCaption }).eq('id', musicToDowngrade.id);
      } catch (error) {}
    }
  };

  const handleFamilyCall = (phoneNumber: string | null, name: string) => {
    if (!phoneNumber) {
      Alert.alert("No Number", `${name}'s phone number hasn't been set up yet.`);
      return;
    }
    Haptics.selectionAsync();
    Alert.alert(`Call ${name}?`, `Would you like to call ${name} now?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Yes, Call", onPress: () => Linking.openURL(`tel:${phoneNumber}`).catch(() => Alert.alert("Error", "Could not place the call.")) }
    ]);
  };

  const startMemoryGame = () => {
    setIsMenuVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (dailyMemory && dailyMemory.image_url) {
      const memoryCaption = dailyMemory.caption ? dailyMemory.caption : "this beautiful picture";
      const prompt = `Let's play a game! I am looking at a photo of ${memoryCaption}. Do you remember anything special about this day? Tap the purple microphone and tell me about it!`;
      if (isEvening) {
        setIsEvening(false);
        setTimeIcon("sunny");
      }
      setIsGameActive(true); 
      setIsNudgeActive(false);
      setRemiText(prompt);
      speak(prompt);
    } else {
      const text = "I would love to play a memory game, but your family hasn't added any photos to your vault yet. We can play once they add some!";
      setRemiText(text);
      speak(text);
    }
  };

  useEffect(() => {
    let reminderInterval: NodeJS.Timeout;
    if (wellnessPrompt !== null) {
      reminderInterval = setInterval(() => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        speak(wellnessPrompt.message);
        Animated.sequence([
          Animated.timing(attentionAnim, { toValue: 1.08, duration: 150, useNativeDriver: true }),
          Animated.timing(attentionAnim, { toValue: 0.95, duration: 150, useNativeDriver: true }),
          Animated.timing(attentionAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
          Animated.timing(attentionAnim, { toValue: 1, duration: 150, useNativeDriver: true })
        ]).start();
      }, 60000); 
    }
    return () => { if (reminderInterval) clearInterval(reminderInterval); };
  }, [wellnessPrompt]);


  useEffect(() => {
    Animated.timing(uiOpacity, {
      toValue: (isRecording || isProcessing || wellnessPrompt !== null) ? 0 : 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [isRecording, isProcessing, wellnessPrompt]);

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

  const updateClockLogic = () => {
    const now = new Date();
    const h = now.getHours();
    
    setDayOfWeek(now.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase());

    let tod = "MORNING";
    let icon = "sunny";
    if (h >= 12 && h < 17) {
      tod = "AFTERNOON";
      icon = "partly-sunny";
    } else if (h >= 17 && h < 20) {
      tod = "EVENING";
      icon = "moon";
    } else if (h >= 20 || h < 6) {
      tod = "NIGHT";
      icon = "moon";
    }
    setTimeOfDay(tod);
    setTimeIcon(icon);
    
    if (h === 16 && now.getMinutes() >= 30 && h < 20) {
        if (!isEvening) setIsEvening(true);
    } else if (h >= 20 || h < 6) {
        if (!isEvening) setIsEvening(true);
    }
  };

  // --- NEW: useFocusEffect ENSURES REMI ONLY SPEAKS WHEN THE SCREEN IS ACTIVE ---
  useFocusEffect(
    useCallback(() => {
      let isFocused = true;

      const initializeHome = async () => {
        updateClockLogic();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        let fetchedName = "John";
        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        
        if (profileData && isFocused) {
          if (profileData.nickname) {
            fetchedName = profileData.nickname;
            setUserName(fetchedName);
          }
          if (profileData.day_message) setCustomDayMessage(profileData.day_message);
          if (profileData.night_message) setCustomNightMessage(profileData.night_message);

          if (profileData.primary_contact) setPrimaryContact(profileData.primary_contact);
          if (profileData.primary_contact_name) setPrimaryContactName(profileData.primary_contact_name);
          if (profileData.primary_contact_role) setPrimaryContactRole(profileData.primary_contact_role);
          if (profileData.primary_contact_avatar) setPrimaryContactAvatar(profileData.primary_contact_avatar);

          if (profileData.secondary_contact) setSecondaryContact(profileData.secondary_contact);
          if (profileData.secondary_contact_name) setSecondaryContactName(profileData.secondary_contact_name);
          if (profileData.secondary_contact_role) setSecondaryContactRole(profileData.secondary_contact_role);
          if (profileData.secondary_contact_avatar) setSecondaryContactAvatar(profileData.secondary_contact_avatar);
        }

        const { data: memories } = await supabase.from('memory_vault').select('*');
        
        if (memories && memories.length > 0 && isFocused) {
          const impMusic = memories.find(m => m.caption?.includes('[MUSIC-IMPORTANT]'));
          if (impMusic) setImportantMusic(impMusic);

          const rNotes: any[] = [];
          const standardMemories: any[] = [];

          memories.forEach(m => {
            if (m.caption && m.caption.includes('[REASSURANCE:')) {
               const match = m.caption.match(/\[REASSURANCE:\s*(.+?)\]/i);
               if (match && m.audio_url) {
                  const keywords = match[1].split(',').map((k: string) => k.trim().toLowerCase());
                  rNotes.push({ keywords, audio_url: m.audio_url, id: m.id });
               }
            } else if (!m.caption?.includes('[MUSIC')) {
               standardMemories.push(m);
            }
          });

          setReassuranceNotes(rNotes);

          if (standardMemories.length > 0) {
            setDailyMemory(standardMemories[Math.floor(Math.random() * standardMemories.length)]); 
          }
        }

        if (isFocused) {
          const h = new Date().getHours();
          if (h >= 17 || h < 6) {
            const defaultGreeting = `Good evening, ${fetchedName}. It's getting late. I am here to help you relax.`;
            setRemiText(defaultGreeting);
            speak(defaultGreeting);
          } else {
            const defaultGreeting = `Hello ${fetchedName}! I am Remi. How can I help you today?`;
            setRemiText(defaultGreeting);
            speak(defaultGreeting);
          }
        }
      };
      
      initializeHome();

      return () => {
        isFocused = false;
        Speech.stop(); // Instantly kill the audio if the user navigates away or logs out
      };
    }, [])
  );

  useEffect(() => {
    const globalCheck = () => {
      updateClockLogic();
      
      if (isRecording || isProcessing || isImportantMusicPlaying || isDistressed || wellnessPrompt) return;
      
      const now = new Date();
      if (now.getHours() === 16 && now.getMinutes() === 30 && !isEvening) {
        triggerCalmMode(`Good evening ${userName}, it is getting a bit late, so I've turned on some relaxing music for you.`);
      }
    };
    const intervalId = setInterval(globalCheck, 60000); 
    return () => clearInterval(intervalId);
  }, [userName, isEvening, isRecording, isProcessing, isImportantMusicPlaying, isDistressed, wellnessPrompt]);

  useEffect(() => {
    const checkRoutines = async () => {
      if (isRecording || isProcessing || isImportantMusicPlaying || isDistressed || wellnessPrompt) return;
      try {
        const { data, error } = await supabase
          .from('routines')
          .select('*')
          .eq('is_completed', false)
          .order('created_at', { ascending: true });

        if (error || !data) return;

        if (data.length > 0) {
          setNextRoutine(data[0]); 
        } else {
          setNextRoutine(null);
        }

        const now = new Date();
        const h24 = now.getHours();
        const m = now.getMinutes();
        const h12 = h24 % 12 || 12;
        const ampm = h24 >= 12 ? 'pm' : 'am';
        const mm = m < 10 ? '0' + m : m;
        
        const possibleFormats = [
          `${h12}:${mm} ${ampm}`, `${h12}:${mm}${ampm}`, `${h12}:${mm}`, `${h24}:${mm}`          
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
            const rTitle = routine.title.toLowerCase();
            
            if (rTitle.includes('water') || rTitle.includes('drink') || rTitle.includes('hydrate')) {
              const msg = `Excuse me ${userName}, it's time for a refreshing glass of water.`;
              setWellnessPrompt({ type: 'water', title: "Hydration Time!", message: msg });
              speak(msg);
            } 
            else if (rTitle.includes('lunch') || rTitle.includes('dinner') || rTitle.includes('breakfast') || rTitle.includes('eat') || rTitle.includes('snack')) {
              const msg = `Excuse me ${userName}, it's time for your ${routine.title}.`;
              setWellnessPrompt({ type: 'meal', title: "Meal Time!", message: msg });
              speak(msg);
            } 
            else {
              const announcement = `Excuse me ${userName}, it is time for: ${routine.title}.`;
              setRemiText(announcement);
              speak(announcement);
            }
            
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
  }, [userName, announcedTasks, isRecording, isProcessing, isImportantMusicPlaying, isDistressed, wellnessPrompt]);

  const resetRemi = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsRecording(false);
    setIsProcessing(false);
    setIsNudgeActive(false);
    setIsGameActive(false); 
    setWellnessPrompt(null);
    updateClockLogic();
    
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
    if (!isEvening) {
      triggerCalmMode();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setIsEvening(false);
      updateClockLogic();
      resetRemi();
    }
  };

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
        let detectedVibe = 'Calm & Relaxed';
        const lowerText = aiText.toLowerCase();

        if (lowerText.includes("sorry") || lowerText.includes("safe") || lowerText.includes("worry") || lowerText.includes("help") || lowerText.includes("tough time")) {
            detectedVibe = 'Anxious';
        } else if (lowerText.includes("not sure") || lowerText.includes("don't know") || lowerText.includes("confused")) {
            detectedVibe = 'Confused';
        } else if (lowerText.includes("wonderful") || lowerText.includes("great") || lowerText.includes("excited") || lowerText.includes("happy")) {
            detectedVibe = 'Energetic';
        }

        let foundReassurance = null;
        for (const note of reassuranceNotes) {
           if (note.keywords.some(keyword => lowerText.includes(keyword))) {
              foundReassurance = note;
              break;
           }
        }

        if (foundReassurance) {
            const introMsg = "I actually have a message from your family about that. Let's listen.";
            setRemiText("Playing message from family...");
            
            setIsDistressed(false); 
            if (bgMusic) {
               await bgMusic.pauseAsync();
               setIsPlayingMusic(false);
            }

            speak(introMsg);
            
            setTimeout(() => {
                const safeUrl = foundReassurance.audio_url.trim();
                playCustomAudio(safeUrl);
            }, 4000);

        } else {
            if ((detectedVibe === 'Anxious' || detectedVibe === 'Confused') && !isEvening) {
                triggerCalmMode(); 
            }
            
            setRemiText(aiText);
            speak(aiText);
            
            if (lowerText.includes("call family") || lowerText.includes("contact family")) {
              setIsDistressed(true);
            } else {
              setIsDistressed(false); 
            }
        }

        if (user) {
          supabase.from('shift_logs').insert({
              patient_id: user.id, caregiver_name: 'Remi AI', vibe: detectedVibe,
              notes: `Automated interaction log. Remi recently discussed: "${aiText.substring(0, 80)}..."`
          }).then(({error}) => {
              if (error) console.error("Error saving AI log:", error);
          });
        }
        
      } else {
        throw new Error(`[HTTP ${response.status}]`);
      }
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const fallbackMessage = "I'm having a little trouble connecting to the internet right now. We can try again later.";
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
    
    // INSTANT AUDIO KILL SWITCH
    Speech.stop(); 
    if (memorySound) await memorySound.stopAsync().catch(()=>{});
    if (bgMusic) await bgMusic.stopAsync().catch(()=>{});
    
    setTimeout(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) Alert.alert("Sign Out Error", error.message);
      else router.replace('/login'); 
    }, 500);
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
  
  const verifyCaregiverPin = async (pinAttempt: string) => {
    setEnteredPin(pinAttempt);
    if (pinAttempt.length === 4) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData } = await supabase.from('profiles').select('caregiver_pin').eq('id', user.id).single();
        if (profileData && profileData.caregiver_pin === pinAttempt) {
          setShowPinModal(false);
          setEnteredPin('');
          router.push('/(caregiver)'); 
          return;
        }

        const { data: teamData } = await supabase.from('care_team').select('pin').eq('pin', pinAttempt).maybeSingle(); 
        if (teamData && teamData.pin === pinAttempt) {
          setShowPinModal(false);
          setEnteredPin('');
          router.push('/(caregiver)'); 
          return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Incorrect PIN", "The PIN entered is incorrect.");
        setEnteredPin('');

      } catch (error: any) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", "Could not verify PIN. Please check your internet connection.");
        setEnteredPin('');
      }
    }
  };

  const safeAreaBgColor = isEvening ? '#FDE68A' : '#F3F4F6'; 
  const appCapsuleBgColor = isEvening ? '#FEF3C7' : '#FFFFFF'; 
  const bubbleBgColor = isEvening ? '#FDE68A' : '#F9FAFB';
  const familyCardBgColor = isEvening ? '#FDE68A' : '#FFFFFF';
  const familyCardBorderColor = isEvening ? '#FCD34D' : '#E5E7EB';

  let dynamicSubtitle = "";
  if (nextRoutine && nextRoutine.title) {
    const timeDisplay = nextRoutine.time_string && nextRoutine.time_string !== 'Anytime' ? `at ${nextRoutine.time_string}` : "";
    dynamicSubtitle = `Next up: ${nextRoutine.title} ${timeDisplay}`;
  } else {
    if (isEvening) {
      dynamicSubtitle = customNightMessage || `Hello ${userName}. It is time to rest.`;
    } else {
      dynamicSubtitle = customDayMessage || `Hello ${userName}. You are safe at home.`;
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: safeAreaBgColor }]}>
      <StatusBar barStyle="dark-content" backgroundColor={safeAreaBgColor} />
      <View style={[styles.appCapsule, { backgroundColor: appCapsuleBgColor }]}>
        
        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.internalContent} showsVerticalScrollIndicator={false}>
          
          <Animated.View style={{ opacity: uiOpacity, zIndex: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 10, marginTop: 5 }}>
              <TouchableOpacity onPress={resetRemi} style={[styles.menuIconButton, { marginRight: 10 }]} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Ionicons name="refresh" size={26} color="#8B5CF6" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleMenuOpen} style={styles.menuIconButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Ionicons name="menu" size={32} color="#111827" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              activeOpacity={0.9} 
              onLongPress={toggleSundowningOverride} 
              delayLongPress={800}
              style={[styles.orientationBoard, isEvening ? { backgroundColor: '#1E3A8A', borderColor: '#1E40AF' } : { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' }]}
            >
              <View style={styles.orientationInner}>
                 <Ionicons name={timeIcon as any} size={48} color={isEvening ? '#FCD34D' : '#D97706'} style={{ marginRight: 18 }} />
                 <View style={{ flex: 1 }}>
                   <Text style={[styles.orientationDayText, isEvening ? { color: '#FFFFFF' } : { color: '#92400E' }]}>
                     IT IS {dayOfWeek}
                   </Text>
                   <Text style={[styles.orientationTimeText, isEvening ? { color: '#93C5FD' } : { color: '#B45309' }]}>
                     {timeOfDay}
                   </Text>
                   <Text style={[styles.orientationSubtitle, isEvening ? { color: '#BFDBFE' } : { color: '#D97706' }]}>
                     {dynamicSubtitle}
                   </Text>
                 </View>
              </View>
            </TouchableOpacity>
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
            
            {importantMusic && !isGameActive && !isNudgeActive && !isEvening && (
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

            {dailyMemory && (!importantMusic || isGameActive) && !isNudgeActive && !isEvening && dailyMemory.image_url && (
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

            {dailyMemory && (!importantMusic || isGameActive) && !isNudgeActive && !isEvening && !dailyMemory.image_url && dailyMemory.audio_url && !dailyMemory.caption?.includes('[REASSURANCE:') && (
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
                <Text style={[styles.nudgeTitle, isEvening && { color: '#92400E' }]}>
                  {isEvening ? "Relaxing suggestions:" : "Not sure what to say? Try asking:"}
                </Text>
                
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
              {isRecording ? "Tap to Stop!" : (isProcessing ? "Remi is thinking..." : "Tap to Talk")}
            </Text>
          </TouchableOpacity>

          <View style={styles.bottomStatus}>
            <View style={[styles.statusDot, isRecording && { backgroundColor: '#EF4444' }]} />
            <Text style={styles.statusText}>
              {isRecording ? "Please record your voice..." : "Remi is listening..."}
            </Text>
          </View>

          {(!isRecording && !isProcessing && !isDistressed && !isNudgeActive) && (
             <Animated.View style={[styles.familyRowContainer, { opacity: uiOpacity, marginTop: 25 }]}>
                <Text style={[styles.nudgeTitle, isEvening && { color: '#92400E' }]}>Connect with Family:</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 15, paddingHorizontal: 5 }}>
                  
                  {/* --- DYNAMIC PRIMARY CONTACT CARD --- */}
                  {primaryContact && (
                    <TouchableOpacity 
                      style={[styles.familyCard, { backgroundColor: familyCardBgColor, borderColor: familyCardBorderColor }]} 
                      activeOpacity={0.7}
                      onPress={() => handleFamilyCall(primaryContact, primaryContactName)}
                    >
                       <Image source={{uri: primaryContactAvatar}} style={styles.familyAvatar} />
                       <Text style={[styles.familyName, isEvening && { color: '#92400E' }]}>{primaryContactName}</Text>
                       <Text style={[styles.familyRole, isEvening && { color: '#B45309' }]}>{primaryContactRole}</Text>
                       <View style={styles.callIconBadge}>
                         <Ionicons name="call" size={12} color="#FFFFFF" />
                       </View>
                    </TouchableOpacity>
                  )}

                  {/* --- DYNAMIC SECONDARY CONTACT CARD --- */}
                  {secondaryContact && (
                    <TouchableOpacity 
                      style={[styles.familyCard, { backgroundColor: familyCardBgColor, borderColor: familyCardBorderColor }]} 
                      activeOpacity={0.7}
                      onPress={() => handleFamilyCall(secondaryContact, secondaryContactName)}
                    >
                       <Image source={{uri: secondaryContactAvatar}} style={styles.familyAvatar} />
                       <Text style={[styles.familyName, isEvening && { color: '#92400E' }]}>{secondaryContactName}</Text>
                       <Text style={[styles.familyRole, isEvening && { color: '#B45309' }]}>{secondaryContactRole}</Text>
                       <View style={styles.callIconBadge}>
                         <Ionicons name="call" size={12} color="#FFFFFF" />
                       </View>
                    </TouchableOpacity>
                  )}

                </ScrollView>
             </Animated.View>
          )}

        </ScrollView>
      </View>

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

      <Modal visible={wellnessPrompt !== null} transparent={true} animationType="slide">
        <View style={[styles.modalOverlay, { justifyContent: 'center', backgroundColor: 'rgba(17, 24, 39, 0.8)' }]}>
          <Animated.View style={[
              styles.wellnessModalContainer, 
              wellnessPrompt?.type === 'water' ? { backgroundColor: '#DBEAFE', borderColor: '#93C5FD' } : { backgroundColor: '#FFEDD5', borderColor: '#FDBA74' },
              { transform: [{ scale: attentionAnim }] }
            ]}
          >
            <View style={[
                styles.wellnessIconWrap, 
                wellnessPrompt?.type === 'water' ? { backgroundColor: '#BFDBFE' } : { backgroundColor: '#FED7AA' }
              ]}
            >
              <Ionicons 
                name={wellnessPrompt?.type === 'water' ? 'water' : 'restaurant'} 
                size={56} 
                color={wellnessPrompt?.type === 'water' ? '#1D4ED8' : '#C2410C'} 
              />
            </View>
            
            <Text style={[styles.wellnessTitle, wellnessPrompt?.type === 'water' ? { color: '#1E3A8A' } : { color: '#9A3412' }]}>
              {wellnessPrompt?.title}
            </Text>
            
            <Text style={[styles.wellnessMessage, wellnessPrompt?.type === 'water' ? { color: '#1E40AF' } : { color: '#9A3412' }]}>
              {wellnessPrompt?.message}
            </Text>

            <TouchableOpacity 
              style={[styles.wellnessButton, wellnessPrompt?.type === 'water' ? { backgroundColor: '#2563EB' } : { backgroundColor: '#EA580C' }]} 
              onPress={() => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setWellnessPrompt(null);
                resetRemi(); 
              }}
            >
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.wellnessButtonText}>Okay, I got it!</Text>
            </TouchableOpacity>
          </Animated.View>
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

            <TouchableOpacity style={styles.menuRow} onPress={startMemoryGame}>
              <View style={[styles.menuIconContainer, { backgroundColor: '#DBEAFE' }]}>
                <Ionicons name="extension-puzzle" size={24} color="#3B82F6" />
              </View>
              <Text style={styles.menuRowText}>Play Memory Game</Text>
              <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
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

            {primaryContact && (
              <TouchableOpacity 
                style={[styles.menuRow, { backgroundColor: '#FEE2E2', borderRadius: 16, marginBottom: 12, paddingHorizontal: 15, borderBottomWidth: 0 }]} 
                onPress={() => {
                  Linking.openURL(`tel:${primaryContact}`);
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#FECACA' }]}>
                  <Ionicons name="call" size={24} color="#DC2626" />
                </View>
                <Text style={[styles.menuRowText, { color: '#991B1B', fontWeight: 'bold' }]}>Call {primaryContactName}</Text>
              </TouchableOpacity>
            )}

            {secondaryContact && (
              <TouchableOpacity 
                style={[styles.menuRow, { backgroundColor: '#FEE2E2', borderRadius: 16, paddingHorizontal: 15, borderBottomWidth: 0 }]} 
                onPress={() => {
                  Linking.openURL(`tel:${secondaryContact}`);
                }}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: '#FECACA' }]}>
                  <Ionicons name="call" size={24} color="#DC2626" />
                </View>
                <Text style={[styles.menuRowText, { color: '#991B1B', fontWeight: 'bold' }]}>Call {secondaryContactName}</Text>
              </TouchableOpacity>
            )}
            
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
  
  menuIconButton: { padding: 8, backgroundColor: '#F3F4F6', borderRadius: 20 },
  orientationBoard: { width: '100%', borderRadius: 24, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 4 },
  orientationInner: { flexDirection: 'row', alignItems: 'center' },
  orientationDayText: { fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  orientationTimeText: { fontSize: 24, fontWeight: '800', marginTop: 2 },
  orientationSubtitle: { fontSize: 15, fontWeight: '700', marginTop: 6 },

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
  
  familyRowContainer: { marginBottom: 20, alignItems: 'center' },
  familyCard: { padding: 12, borderRadius: 24, alignItems: 'center', width: 100, borderWidth: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  familyAvatar: { width: 64, height: 64, borderRadius: 32, marginBottom: 8, backgroundColor: '#F3F4F6' },
  familyName: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 2 },
  familyRole: { fontSize: 12, color: '#6B7280', fontWeight: '500' },
  callIconBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#10B981', width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#FFFFFF' },

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

  wellnessModalContainer: { width: '85%', padding: 30, borderRadius: 30, alignItems: 'center', borderWidth: 2 },
  wellnessIconWrap: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  wellnessTitle: { fontSize: 26, fontWeight: '800', marginBottom: 10, textAlign: 'center' },
  wellnessMessage: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 30, lineHeight: 26 },
  wellnessButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 25, width: '100%', justifyContent: 'center' },
  wellnessButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' }
});