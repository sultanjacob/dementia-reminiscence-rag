import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import {
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export default function SettingsScreen() {
  const router = useRouter();

  // Local state for settings (we can connect these to Supabase later to save permanently)
  const [isLargeText, setIsLargeText] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState<'normal' | 'slow'>('normal');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);

  const handleHaptic = () => {
    if (hapticsEnabled) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const playVoicePreview = (speed: 'normal' | 'slow') => {
    handleHaptic();
    setVoiceSpeed(speed);
    Speech.stop();
    Speech.speak("This is how fast I will talk.", {
      language: 'en-GB',
      pitch: 0.9,
      rate: speed === 'slow' ? 0.6 : 0.8,
    });
  };

  const handleReassurance = () => {
    handleHaptic();
    Speech.stop();
    Speech.speak("You are using Remi, your personal assistant. Everything is okay, and you are completely safe.", {
      language: 'en-GB',
      pitch: 0.9,
      rate: voiceSpeed === 'slow' ? 0.6 : 0.8,
    });
  };

  // Dynamic font sizes so the user can see the text change instantly
  const dynamicBaseSize = isLargeText ? 22 : 18;
  const dynamicSubText = isLargeText ? 18 : 14;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            handleHaptic();
            router.back();
          }} 
          style={styles.backButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="arrow-back" size={28} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 44 }} /> 
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Reassurance Button */}
        <TouchableOpacity style={styles.reassuranceCard} onPress={handleReassurance}>
          <Ionicons name="heart" size={32} color="#EF4444" style={{ marginBottom: 8 }} />
          <Text style={[styles.reassuranceTitle, { fontSize: dynamicBaseSize }]}>Need Reassurance?</Text>
          <Text style={[styles.reassuranceSub, { fontSize: dynamicSubText }]}>Tap here to hear a comforting message about where you are.</Text>
        </TouchableOpacity>

        <Text style={styles.sectionHeader}>Display</Text>
        
        {/* Text Size Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { fontSize: dynamicBaseSize }]}>Extra Large Text</Text>
            <Text style={[styles.settingDescription, { fontSize: dynamicSubText }]}>Make all text in the app bigger.</Text>
          </View>
          <Switch 
            value={isLargeText} 
            onValueChange={(val) => {
              handleHaptic();
              setIsLargeText(val);
            }} 
            trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
            thumbColor={'#FFFFFF'}
          />
        </View>

        <Text style={styles.sectionHeader}>Remi's Voice</Text>
        
        {/* Voice Speed Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[styles.speedButton, voiceSpeed === 'normal' && styles.speedButtonActive]}
            onPress={() => playVoicePreview('normal')}
          >
            <Text style={[styles.speedButtonText, voiceSpeed === 'normal' && styles.speedButtonTextActive, { fontSize: dynamicSubText }]}>Normal Speed</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.speedButton, voiceSpeed === 'slow' && styles.speedButtonActive]}
            onPress={() => playVoicePreview('slow')}
          >
            <Text style={[styles.speedButtonText, voiceSpeed === 'slow' && styles.speedButtonTextActive, { fontSize: dynamicSubText }]}>Slow Speed</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Feedback</Text>
        
        {/* Haptics Toggle */}
        <View style={styles.settingRow}>
          <View style={styles.settingTextContainer}>
            <Text style={[styles.settingTitle, { fontSize: dynamicBaseSize }]}>Vibration Feedback</Text>
            <Text style={[styles.settingDescription, { fontSize: dynamicSubText }]}>Feel a soft buzz when you tap buttons.</Text>
          </View>
          <Switch 
            value={hapticsEnabled} 
            onValueChange={(val) => {
              setHapticsEnabled(val);
              if (val) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }} 
            trackColor={{ false: '#E5E7EB', true: '#8B5CF6' }}
            thumbColor={'#FFFFFF'}
          />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#F3F4F6' },
  backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111827' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  reassuranceCard: { backgroundColor: '#FEE2E2', borderRadius: 24, padding: 24, alignItems: 'center', marginVertical: 20, borderWidth: 1, borderColor: '#FECACA' },
  reassuranceTitle: { fontWeight: '800', color: '#991B1B', textAlign: 'center', marginBottom: 4 },
  reassuranceSub: { color: '#7F1D1D', textAlign: 'center', lineHeight: 22 },
  sectionHeader: { fontSize: 14, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 1, marginTop: 20, marginBottom: 10, marginLeft: 10 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  settingTextContainer: { flex: 1, paddingRight: 15 },
  settingTitle: { fontWeight: '700', color: '#1F2937', marginBottom: 4 },
  settingDescription: { color: '#6B7280', lineHeight: 20 },
  buttonRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  speedButton: { flex: 1, backgroundColor: '#FFFFFF', paddingVertical: 16, borderRadius: 20, alignItems: 'center', borderWidth: 2, borderColor: '#E5E7EB' },
  speedButtonActive: { borderColor: '#8B5CF6', backgroundColor: '#F5F3FF' },
  speedButtonText: { fontWeight: '700', color: '#6B7280' },
  speedButtonTextActive: { color: '#8B5CF6' },
});