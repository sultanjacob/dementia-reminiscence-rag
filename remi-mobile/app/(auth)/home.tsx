import { Audio } from 'expo-av'; // New: Audio recording
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  const [user, setUser] = useState<any>(null);
  const [answer, setAnswer] = useState("Hello! I'm Remi. Hold the brain to speak or tap for a photo.");
  const [loading, setLoading] = useState(false);
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const speak = (text: string) => {
    Speech.speak(text, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  // --- VOICE LOGIC ---
  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') return Alert.alert("Permission", "Need microphone access");

      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
      setAnswer("Listening... 👂");
    } catch (err) { console.error('Failed to start recording', err); }
  }

  async function stopRecording() {
    if (!recording) return;
    setRecording(null);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) processVoiceChat(uri);
  }

  const processVoiceChat = async (audioUri: string) => {
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', { uri: audioUri, name: 'voice.m4a', type: 'audio/m4a' });
    formData.append('user_id', user.id);

    try {
      // Note: We'll need to create a /voice-chat endpoint in your Python script next!
      const res = await fetch(`${tunnelUrl}voice-chat`, { method: 'POST', body: formData });
      const data = await res.json();
      setAnswer(data.message);
      speak(data.message);
    } catch (e) {
      setAnswer("I heard you, but I couldn't understand. Is the cloud server on?");
    } finally { setLoading(false); }
  };

  // --- CAMERA LOGIC ---
  const handleCameraAction = async () => {
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.2 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      if (!isTeachingMode) processImageAsk(uri);
      else setAnswer("I see it! Now describe this memory.");
    }
  };

  const processImageAsk = async (uri: string) => {
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('image', { uri, name: 'photo.jpg', type: 'image/jpeg' });
    formData.append('user_id', user.id);
    try {
      const res = await fetch(`${tunnelUrl}describe-image`, { method: 'POST', body: formData });
      const data = await res.json();
      setAnswer(data.message);
      speak(data.message);
    } finally { setLoading(false); }
  };

  const saveToCloud = async () => {
    if (!selectedImage || !description) return;
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('image', { uri: selectedImage, name: 'photo.jpg', type: 'image/jpeg' });
    formData.append('description', description);
    formData.append('user_id', user.id);
    try {
      await fetch(`${tunnelUrl}teach-remi`, { method: 'POST', body: formData });
      setAnswer("I've remembered that for you. 🖼️");
      speak("I've remembered that for you.");
      setSelectedImage(null);
      setDescription("");
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

      {isTeachingMode && selectedImage && (
        <View style={styles.inputArea}>
          <TextInput style={styles.input} placeholder="Who or what is this?" value={description} onChangeText={setDescription} />
          <TouchableOpacity style={styles.saveBtn} onPress={saveToCloud}><Text style={styles.saveBtnText}>Save Memory</Text></TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonRow}>
        {/* CAMERA BUTTON */}
        <TouchableOpacity style={styles.sideButton} onPress={handleCameraAction}>
          <Text style={{ fontSize: 30 }}>📸</Text>
        </TouchableOpacity>

        {/* VOICE BUTTON (Hold to talk) */}
        <TouchableOpacity 
          style={[styles.micButton, { backgroundColor: recording ? '#FF3B30' : 'white' }]} 
          onLongPress={startRecording}
          onPressOut={stopRecording}
          onPress={() => speak("Hold the brain to talk to me.")}
        >
          {loading ? <ActivityIndicator color="#003366" /> : <Text style={{ fontSize: 50 }}>🧠</Text>}
        </TouchableOpacity>

        {/* ROUTINE QUICK CHECK */}
       <TouchableOpacity 
  style={styles.sideButton} 
  onPress={async () => {
    setLoading(true);
    try {
      const res = await fetch(`${tunnelUrl}check-routine?user_id=${user.id}`);
      const data = await res.json();
      setAnswer(data.message);
      speak(data.message);
    } finally { setLoading(false); }
  }}
>
  <Text style={{ fontSize: 30 }}>🕒</Text>
</TouchableOpacity>
      </View>
      
      <Text style={styles.hint}>Hold 🧠 to talk • Tap 📸 for eyes</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f4f8', alignItems: 'center', padding: 20, paddingTop: 40 },
  modeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 30, marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 25, borderRadius: 30, width: '100%', marginBottom: 20, elevation: 5, minHeight: 150, justifyContent: 'center' },
  preview: { width: '100%', height: 200, borderRadius: 20, marginBottom: 15 },
  aiText: { fontSize: 20, color: '#003366', textAlign: 'center', lineHeight: 30, fontWeight: '500' },
  inputArea: { width: '100%', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  saveBtn: { backgroundColor: '#34C759', padding: 15, borderRadius: 15 },
  saveBtnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', width: '100%', marginTop: 20 },
  micButton: { width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 4, borderColor: '#003366' },
  sideButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  hint: { marginTop: 20, color: '#666', fontStyle: 'italic' }
});