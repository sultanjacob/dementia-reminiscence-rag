import { AudioModule, RecordingOptionsPresets, useAudioRecorder } from 'expo-audio'; // The new library
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [answer, setAnswer] = useState("Hello! I'm Remi. Hold the brain to talk.");
  const [loading, setLoading] = useState(false);
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const recorder = useAudioRecorder(RecordingOptionsPresets.HIGH_QUALITY);
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const speak = (text: string) => {
    if (!text) return;
    Speech.speak(text, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  // --- NEW VOICE LOGIC ---
  const handleStartRecording = async () => {
    const status = await AudioModule.requestPermissionsAsync();
    if (!status.granted) return Alert.alert("Permission", "Mic access needed");
    
    setAnswer("Listening... 👂");
    recorder.prepareToRecord();
    recorder.record();
  };

  const handleStopRecording = async () => {
    if (!recorder.isRecording) return;
    await recorder.stop();
    if (recorder.uri) {
      processVoiceChat(recorder.uri);
    }
  };

  const processVoiceChat = async (uri: string) => {
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', { uri, name: 'voice.m4a', type: 'audio/m4a' });
    formData.append('user_id', user.id);

    try {
      const res = await fetch(`${tunnelUrl}voice-chat`, { method: 'POST', body: formData });
      const data = await res.json();
      setAnswer(data.message);
      speak(data.message);
    } catch (e) {
      setAnswer("I'm having trouble thinking clearly.");
    } finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.modeRow}>
        <Text style={{color: isTeachingMode ? '#666' : '#007AFF', fontWeight: 'bold'}}>Ask</Text>
        <Switch value={isTeachingMode} onValueChange={(val) => {setIsTeachingMode(val); setSelectedImage(null);}} />
        <Text style={{color: isTeachingMode ? '#34C759' : '#666', fontWeight: 'bold'}}>Teach</Text>
      </View>

      <View style={styles.card}>
        {selectedImage && <Image source={{ uri: selectedImage }} style={styles.preview} />}
        <Text style={styles.aiText}>{answer}</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.sideButton} onPress={() => {/* Your camera logic here */}}>
          <Text style={{ fontSize: 30 }}>📸</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.micButton, { backgroundColor: recorder.isRecording ? '#FF3B30' : 'white' }]} 
          onLongPress={handleStartRecording}
          onPressOut={handleStopRecording}
        >
          {loading ? <ActivityIndicator color="#003366" /> : <Text style={{ fontSize: 50 }}>🧠</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.sideButton} 
          onPress={async () => {
            setLoading(true);
            const res = await fetch(`${tunnelUrl}check-routine?user_id=${user.id}`);
            const data = await res.json();
            setAnswer(data.message);
            speak(data.message);
            setLoading(false);
          }}
        >
          <Text style={{ fontSize: 30 }}>🕒</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

// ... (Styles stay the same as previous)