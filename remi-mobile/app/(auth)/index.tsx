import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
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
    }