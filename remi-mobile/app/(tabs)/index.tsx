import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask Remi about a family memory or show her a photo.");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // ⚠️ Double-check this URL in VS Code Ports tab if you restart!
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  const speakResponse = (text: string) => {
    Speech.speak(text, { 
      language: 'en-GB', 
      pitch: 0.9,  // Lowering pitch slightly makes it sound warmer/older
      rate: 0.8,   // Slowing it down further helps with clarity for dementia care
    });
  };

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Remi needs camera permission!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      aspect: [1, 1],
      quality: 0.2, // Low quality for faster tunnel transfer
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      setLoading(true);
      setAnswer("Remi is looking at the photo...");

      // --- NEW: Using FormData instead of JSON/Base64 ---
      const formData = new FormData();
      // @ts-ignore
      formData.append('image', {
        uri: imageUri,
        name: 'photo.jpg',
        type: 'image/jpeg',
      });

      try {
        console.log("📤 Uploading via FormData...");
        const response = await fetch(`${tunnelUrl}describe-image`, {
          method: 'POST',
          body: formData,
          headers: {
            'Accept': 'application/json',
            // Note: Don't set Content-Type header manually when using FormData
          },
        });

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();
        setAnswer(data.message);
        speakResponse(data.message);
      } catch (error) {
        console.log("❌ Photo Error:", error);
        alert("Photo Error: " + error.message);
        setAnswer("Remi's eyes are a bit blurry. Check if your VS Code Port is set to 'Public'.");
      } finally {
        setLoading(false);
      }
    }
  };

  const askRemi = async () => {
    if (!question) return;
    setLoading(true);
    try {
      console.log("💬 Sending text...");
      const response = await fetch(`${tunnelUrl}ask?q=${encodeURIComponent(question)}`);
      const data = await response.json();
      setAnswer(data.message);
      speakResponse(data.message);
    } catch (error) {
      console.log("❌ Text Error:", error);
      setAnswer("Error: Remi couldn't hear you.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#003366', marginBottom: 10 }}>Remi 🧠</Text>
      
      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, width: '100%', marginBottom: 20, elevation: 3 }}>
        {selectedImage && (
          <Image 
            source={{ uri: selectedImage }} 
            style={{ width: '100%', height: 250, borderRadius: 10, marginBottom: 15 }} 
            resizeMode="cover"
          />
        )}
        <Text style={{ fontSize: 18, color: '#333', lineHeight: 24 }}>{answer}</Text>
        
        {answer !== "Ask Remi about a family memory or show her a photo." && !loading && (
          <TouchableOpacity 
            onPress={() => speakResponse(answer)} 
            style={{ marginTop: 15, padding: 10, backgroundColor: '#eef2f6', borderRadius: 8, alignSelf: 'flex-start' }}
          >
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

      <TouchableOpacity 
        onPress={askRemi} 
        style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '100%', marginBottom: 10 }}
        disabled={loading}
      >
        {loading && !selectedImage ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Ask Remi</Text>}
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={takePhoto} 
        style={{ backgroundColor: '#34C759', padding: 15, borderRadius: 10, width: '100%' }}
        disabled={loading}
      >
        {loading && selectedImage ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>📸 Show a Photo</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}