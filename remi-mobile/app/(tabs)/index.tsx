import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { ActivityIndicator, Image, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [inputText, setInputText] = useState("");
  const [answer, setAnswer] = useState("Ask Remi a question or teach her a new memory.");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTeachingMode, setIsTeachingMode] = useState(false); // Toggle between Ask and Teach

  // ⚠️ Ensure this matches your VS Code Ports tab URL!
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  const speakResponse = (text: string) => {
    Speech.speak(text, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  // --- NEW: Check Daily Routine ---
  const checkRoutine = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${tunnelUrl}check-routine`);
      const data = await response.json();
      setAnswer(data.message);
      speakResponse(data.message);
    } catch (error) {
      setAnswer("I'm not sure what's next on the schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      alert("Remi needs camera permission!");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.2,
    });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      setLoading(true);
      
      const formData = new FormData();
      // @ts-ignore
      formData.append('image', { uri: imageUri, name: 'photo.jpg', type: 'image/jpeg' });

      try {
        if (isTeachingMode) {
          // --- TEACH MODE ---
          if (!inputText) {
            alert("Please type a description before saving the memory!");
            setLoading(false);
            return;
          }
          formData.append('description', inputText);
          
          const response = await fetch(`${tunnelUrl}teach-remi`, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          setAnswer(data.message);
          speakResponse(data.message);
          setInputText(""); 
        } else {
          // --- ASK MODE ---
          const response = await fetch(`${tunnelUrl}describe-image`, {
            method: 'POST',
            body: formData,
          });
          const data = await response.json();
          setAnswer(data.message);
          speakResponse(data.message);
        }
      } catch (error) {
        alert("Connection Error: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#003366', marginBottom: 5 }}>Remi 🧠</Text>
      
      {/* NEW: ROUTINE BUTTON */}
      <TouchableOpacity 
        onPress={checkRoutine} 
        style={{ backgroundColor: '#FF9500', padding: 12, borderRadius: 25, marginBottom: 15, width: '70%', elevation: 2 }}
        disabled={loading}
      >
        <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>🕒 What should I do now?</Text>
      </TouchableOpacity>

      {/* MODE SWITCHER */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
        <Text style={{ marginRight: 10, color: isTeachingMode ? '#666' : '#007AFF', fontWeight: 'bold' }}>Ask Mode</Text>
        <Switch 
          value={isTeachingMode} 
          onValueChange={setIsTeachingMode} 
          trackColor={{ false: "#767577", true: "#34C759" }}
        />
        <Text style={{ marginLeft: 10, color: isTeachingMode ? '#34C759' : '#666', fontWeight: 'bold' }}>Teach Mode</Text>
      </View>

      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, width: '100%', marginBottom: 20, elevation: 3 }}>
        {selectedImage && <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 250, borderRadius: 10, marginBottom: 15 }} resizeMode="cover" />}
        <Text style={{ fontSize: 18, color: '#333', lineHeight: 24 }}>{answer}</Text>
      </View>

      <TextInput
        style={{ backgroundColor: 'white', width: '100%', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' }}
        placeholder={isTeachingMode ? "Describe this photo for Remi..." : "Type a question for Remi..."}
        value={inputText}
        onChangeText={setInputText}
        multiline
      />

      <TouchableOpacity 
        onPress={handleAction} 
        style={{ backgroundColor: isTeachingMode ? '#34C759' : '#007AFF', padding: 18, borderRadius: 12, width: '100%' }}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="white" /> : (
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>
            {isTeachingMode ? "📸 Save to Memory" : "📸 Ask About This"}
          </Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}