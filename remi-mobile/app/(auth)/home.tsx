import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../supabase';

export default function HomeScreen() {
  // States
  const [user, setUser] = useState<any>(null);
  const [answer, setAnswer] = useState("Hello! I'm Remi. How can I help you today?");
  const [loading, setLoading] = useState(false);
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  // Your Cloud API Tunnel (Update this if it changes!)
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
  }, []);

  const speak = (text: string) => {
    Speech.speak(text, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  const handleCameraAction = async () => {
    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.2 });
    if (!result.canceled) {
      const uri = result.assets[0].uri;
      setSelectedImage(uri);
      if (!isTeachingMode) {
        processImageAsk(uri);
      } else {
        setAnswer("I see it! Now tell me what this memory is.");
      }
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
    } catch (e) {
      setAnswer("My eyes are a bit blurry. Is the server running?");
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
      const res = await fetch(`${tunnelUrl}teach-remi`, { method: 'POST', body: formData });
      const data = await res.json();
      setAnswer("Memory saved! I won't forget.");
      speak("Memory saved! I won't forget.");
      setSelectedImage(null);
      setDescription("");
    } catch (e) { setAnswer("Upload failed."); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Mode Switcher */}
      <View style={styles.modeRow}>
        <Text style={{color: isTeachingMode ? '#666' : '#007AFF', fontWeight: 'bold'}}>Ask Mode</Text>
        <Switch value={isTeachingMode} onValueChange={(val) => {setIsTeachingMode(val); setSelectedImage(null);}} />
        <Text style={{color: isTeachingMode ? '#34C759' : '#666', fontWeight: 'bold'}}>Teach Mode</Text>
      </View>

      {/* Remi's Response Card */}
      <View style={styles.card}>
        {selectedImage && <Image source={{ uri: selectedImage }} style={styles.preview} />}
        <Text style={styles.aiText}>{answer}</Text>
      </View>

      {/* Teach Mode Input */}
      {isTeachingMode && selectedImage && (
        <View style={styles.inputArea}>
          <TextInput 
            style={styles.input} 
            placeholder="Describe this memory..." 
            value={description} 
            onChangeText={setDescription}
          />
          <TouchableOpacity style={styles.saveBtn} onPress={saveToCloud}>
             <Text style={styles.saveBtnText}>Save Memory</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* The Big Action Button */}
      <TouchableOpacity style={[styles.micButton, {borderColor: isTeachingMode ? '#34C759' : '#003366'}]} onPress={handleCameraAction}>
        {loading ? <ActivityIndicator color="#003366" /> : <Text style={{ fontSize: 50 }}>{isTeachingMode ? "📸" : "🧠"}</Text>}
      </TouchableOpacity>
      <Text style={styles.hint}>{isTeachingMode ? "Take a photo to teach me" : "Tap Remi to identify something"}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#f0f4f8', alignItems: 'center', padding: 20, paddingTop: 40 },
  modeRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 10, borderRadius: 30, marginBottom: 20 },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 25, width: '100%', marginBottom: 20, elevation: 5 },
  preview: { width: '100%', height: 200, borderRadius: 15, marginBottom: 15 },
  aiText: { fontSize: 20, color: '#333', textAlign: 'center', lineHeight: 28 },
  inputArea: { width: '100%', marginBottom: 20 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#ddd', marginBottom: 10 },
  saveBtn: { backgroundColor: '#34C759', padding: 15, borderRadius: 15 },
  saveBtnText: { color: 'white', textAlign: 'center', fontWeight: 'bold' },
  micButton: { backgroundColor: 'white', width: 110, height: 110, borderRadius: 55, justifyContent: 'center', alignItems: 'center', elevation: 8, borderWidth: 4, marginTop: 20 },
  hint: { marginTop: 15, color: '#666', fontStyle: 'italic' }
});