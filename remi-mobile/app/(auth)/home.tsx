import * as AudioModule from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  // --- 1. STATES ---
  const [user, setUser] = useState<any>(null);
  const [answer, setAnswer] = useState("Hello! I'm Remi. Hold the brain to talk.");
  const [loading, setLoading] = useState(false);
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  // --- 2. AUDIO & PERMISSION HOOKS ---
  const recorder = AudioModule.useAudioRecorder(
    AudioModule.RecordingOptionsPresets?.HIGH_QUALITY || {}
  );

  // This is the most stable way to handle permissions in Expo 3
  const [permissionResponse, requestPermission] = AudioModule.useMicrophonePermissions();

  // ⚠️ Ensure this matches your active VS Code tunnel!
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  // --- 3. INITIALIZATION ---
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const speak = (text: string) => {
    if (!text) return;
    Speech.speak(text, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  // --- 4. VOICE LOGIC ---
  const handleStartRecording = async () => {
    try {
      // Check and request permissions using the hook status
      if (permissionResponse?.status !== 'granted') {
        const result = await requestPermission();
        if (result.status !== 'granted') {
          Alert.alert("Permission", "Microphone access is needed to talk to Remi.");
          return;
        }
      }
      
      setAnswer("Listening... 👂");
      recorder.prepareToRecord();
      recorder.record();
    } catch (err) {
      console.error("Recording Start Error:", err);
      setAnswer("I had trouble starting the microphone.");
    }
  };

  const handleStopRecording = async () => {
    if (!recorder.isRecording) return;
    try {
      await recorder.stop();
      if (recorder.uri) {
        processVoiceChat(recorder.uri);
      }
    } catch (error) {
      console.error("Recording Stop Error:", error);
      setAnswer("I couldn't hear that clearly.");
    }
  };

  const processVoiceChat = async (uri: string) => {
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('file', { 
      uri, 
      name: 'voice.m4a', 
      type: 'audio/x-m4a' 
    });
    formData.append('user_id', user?.id || "anonymous");

    try {
      const res = await fetch(`${tunnelUrl}voice-chat`, { method: 'POST', body: formData });
      const data = await res.json();
      setAnswer(data.message);
      speak(data.message);
    } catch (e) {
      setAnswer("I'm having trouble thinking clearly.");
    } finally { setLoading(false); }
  };

  // --- 5. CAMERA & TEACHING LOGIC ---
  const handleCameraAction = async () => {
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.2 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      if (!isTeachingMode) {
        setLoading(true);
        const formData = new FormData();
        // @ts-ignore
        formData.append('image', { uri, name: 'photo.jpg', type: 'image/jpeg' });
        formData.append('user_id', user?.id);
        try {
          const res = await fetch(`${tunnelUrl}describe-image`, { method: 'POST', body: formData });
          const data = await res.json();
          setAnswer(data.message);
          speak(data.message);
        } catch (e) {
          setAnswer("I can't see right now.");
        } finally { setLoading(false); }
      } else {
        setAnswer("I see it! Now describe this memory and tap Save.");
      }
    }
  };

  const saveToCloud = async () => {
    if (!selectedImage || !description) return;
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('image', { uri: selectedImage, name: 'photo.jpg', type: 'image/jpeg' });
    formData.append('description', description);
    formData.append('user_id', user?.id);
    try {
      const res = await fetch(`${tunnelUrl}teach-remi`, { method: 'POST', body: formData });
      const data = await res.json();
      setAnswer(data.message);
      speak(data.message);
      setSelectedImage(null);
      setDescription("");
    } catch (e) {
      setAnswer("I couldn't save that memory.");
    } finally { setLoading(false); }
  };

  // --- 6. RENDER UI ---
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.modeRow}>
        <Text style={{color: isTeachingMode ? '#666' : '#007AFF', fontWeight: 'bold', marginRight: 10}}>Ask</Text>
        <Switch 
            value={isTeachingMode} 
            onValueChange={(val) => {setIsTeachingMode(val); setSelectedImage(null);}} 
            trackColor={{ false: "#767577", true: "#34C759" }}
        />
        <Text style={{color: isTeachingMode ? '#34C759' : '#666', fontWeight: 'bold', marginLeft: 10}}>Teach</Text>
      </View>

      <View style={styles.card}>
        {selectedImage && <Image source={{ uri: selectedImage }} style={styles.preview} />}
        <Text style={styles.aiText}>{answer}</Text>
      </View>

      {isTeachingMode && selectedImage && (
        <View style={styles.inputArea}>
          <TextInput 
            style={styles.input} 
            placeholder="What is this memory?" 
            value={description} 
            onChangeText={setDescription} 
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveToCloud}>
            <Text style={styles.saveBtnText}>Save Memory</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.sideButton} onPress={handleCameraAction}>
          <Text style={{ fontSize: 30 }}>📸</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.micButton, { backgroundColor: recorder.isRecording ? '#FF3B30' : 'white' }]} 
          onLongPress={handleStartRecording}
          onPressOut={handleStopRecording}
          onPress={() => speak("Hold the brain to talk to me.")}
        >
          {loading ? <ActivityIndicator color="#003366" /> : <Text style={{ fontSize: 50 }}>🧠</Text>}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.sideButton} 
          onPress={async () => {
            if (!user) return Alert.alert("Wait", "Loading user profile...");
            setLoading(true);
            try {
              const res = await fetch(`${tunnelUrl}check-routine?user_id=${user.id}`);
              const data = await res.json();
              setAnswer(data.message);
              speak(data.message);
            } catch (e) {
              setAnswer("I'm not sure what's next on the schedule.");
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
  modeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 30, marginBottom: 20, elevation: 2 },
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