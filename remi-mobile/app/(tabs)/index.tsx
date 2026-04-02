import * as ImagePicker from 'expo-image-picker'; // --- NEW: Import the Camera ---
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask Remi about a family memory or show her a photo.");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  const speakResponse = (text: string) => {
    Speech.speak(text, { language: 'en-GB', pitch: 1.0, rate: 0.85 });
  };

  // --- NEW: Take a Photo and send to Remi ---
  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("Remi needs permission to use your camera!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.5, // Lower quality for faster upload
      base64: true, // IMPORTANT: We need the base64 string for Python
    });

    if (!result.canceled && result.assets[0].base64) {
      setSelectedImage(result.assets[0].uri);
      setLoading(true);
      setAnswer("Remi is looking at the photo...");

      try {
        const response = await fetch(`${tunnelUrl}describe-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: result.assets[0].base64 }),
        });

        const data = await response.json();
        setAnswer(data.message);
        speakResponse(data.message);
      } catch (error) {
        setAnswer("Remi's eyes are a bit blurry right now.");
      }
      setLoading(false);
    }
  };

  const askRemi = async () => {
    if (!question) return;
    setLoading(true);
    try {
      const response = await fetch(`${tunnelUrl}ask?q=${encodeURIComponent(question)}`);
      const data = await response.json();
      setAnswer(data.message);
      speakResponse(data.message);
    } catch (error) {
      setAnswer("Error: Remi couldn't hear you.");
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#003366', marginBottom: 10 }}>Remi 🧠</Text>
      
      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, width: '100%', marginBottom: 20, elevation: 3 }}>
        {selectedImage && <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 200, borderRadius: 10, marginBottom: 15 }} />}
        <Text style={{ fontSize: 18, color: '#333', lineHeight: 24 }}>{answer}</Text>
        
        {answer !== "Ask Remi about a family memory or show her a photo." && !loading && (
          <TouchableOpacity onPress={() => speakResponse(answer)} style={{ marginTop: 15, padding: 10, backgroundColor: '#eef2f6', borderRadius: 8, alignSelf: 'flex-start' }}>
            <Text style={{ color: '#007AFF', fontWeight: 'bold' }}>🔈 Listen Again</Text>
          </TouchableOpacity>
        )}
      </View>

      <TextInput
        style={{ backgroundColor: 'white', width: '100%', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' }}
        placeholder="Type a question..."
        value={question}
        onChangeText={setQuestion}
      />

      <TouchableOpacity onPress={askRemi} style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '100%', marginBottom: 10 }}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Ask Remi</Text>}
      </TouchableOpacity>

      {/* --- NEW: CAMERA BUTTON --- */}
      <TouchableOpacity onPress={takePhoto} style={{ backgroundColor: '#34C759', padding: 15, borderRadius: 10, width: '100%' }}>
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>📸 Show a Photo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}