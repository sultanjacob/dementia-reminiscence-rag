import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  // --- 1. STATES ---
  const [inputText, setInputText] = useState("");
  const [answer, setAnswer] = useState("Ask Remi a question or teach her a new memory.");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); 
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);

  // ⚠️ Double check this matches your current VS Code tunnel!
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  const speakResponse = (text: string) => {
    if (!text || typeof text !== 'string') {
      console.log("⚠️ Speech skipped: No valid text.");
      return;
    }
    Speech.speak(text, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  const checkRoutine = async () => {
    setMenuOpen(false); 
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

const openGallery = async () => {
    setMenuOpen(false); 
    setLoading(true);
    try {
      const response = await fetch(`${tunnelUrl}get-memories`);
      const data = await response.json();
      // Notice we use data.memories now instead of data.photos
      setGalleryImages(data.memories || []);
      setGalleryOpen(true);
    } catch (error) {
      alert("Could not load gallery.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) return;

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.2 });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);
      setLoading(true);
      
      const formData = new FormData();
      // @ts-ignore
      formData.append('image', { uri: imageUri, name: 'photo.jpg', type: 'image/jpeg' });

      try {
        const endpoint = isTeachingMode ? "teach-remi" : "describe-image";
        if (isTeachingMode) {
          if (!inputText.trim()) {
            alert("Please type a description first!");
            setLoading(false);
            return;
          }
          formData.append('description', inputText);
        }
        
        const response = await fetch(`${tunnelUrl}${endpoint}`, { method: 'POST', body: formData });
        const data = await response.json();
        setAnswer(data.message);
        speakResponse(data.message);
        if (isTeachingMode) setInputText(""); 
      } catch (error) {
        alert("Error: " + error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
      {/* Top Bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 10, backgroundColor: 'white', elevation: 2 }}>
        <TouchableOpacity onPress={() => setMenuOpen(true)}>
          <Text style={{ fontSize: 30, color: '#003366' }}>☰</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#003366' }}>Remi 🧠</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
          <Text style={{ marginRight: 10, color: isTeachingMode ? '#666' : '#007AFF', fontWeight: 'bold' }}>Ask Mode</Text>
          <Switch value={isTeachingMode} onValueChange={setIsTeachingMode} trackColor={{ false: "#767577", true: "#34C759" }} />
          <Text style={{ marginLeft: 10, color: isTeachingMode ? '#34C759' : '#666', fontWeight: 'bold' }}>Teach Mode</Text>
        </View>

        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, width: '100%', marginBottom: 20, elevation: 3 }}>
          {selectedImage && <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 250, borderRadius: 10, marginBottom: 15 }} resizeMode="cover" />}
          <Text style={{ fontSize: 18, color: '#333', lineHeight: 24 }}>{answer}</Text>
        </View>

        <TextInput
          style={{ backgroundColor: 'white', width: '100%', padding: 15, borderRadius: 10, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' }}
          placeholder={isTeachingMode ? "Describe this photo..." : "Type a question..."}
          value={inputText}
          onChangeText={setInputText}
          multiline
        />

        <TouchableOpacity onPress={handleAction} style={{ backgroundColor: isTeachingMode ? '#34C759' : '#007AFF', padding: 18, borderRadius: 12, width: '100%' }} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : (
            <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>
              {isTeachingMode ? "📸 Save to Memory" : "📸 Ask About This"}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Side Menu */}
      <Modal visible={menuOpen} animationType="slide" transparent={true} onRequestClose={() => setMenuOpen(false)}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: '75%', backgroundColor: '#003366', padding: 40, paddingTop: 80 }}>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 40 }}>Remi Settings</Text>
            <TouchableOpacity style={{ marginBottom: 30 }} onPress={checkRoutine}><Text style={{ color: 'white', fontSize: 18 }}>🕒 Daily Routine</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 30 }} onPress={openGallery}><Text style={{ color: 'white', fontSize: 18 }}>🖼️ Memory Gallery</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 30 }} onPress={() => setMenuOpen(false)}><Text style={{ color: 'white', fontSize: 18 }}>🏠 Back to Home</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={{ width: '25%', backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>

      {/* Gallery */}
      <Modal visible={galleryOpen} animationType="fade" onRequestClose={() => setGalleryOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 60 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#003366' }}>Family Gallery 🖼️</Text>
            <TouchableOpacity onPress={() => setGalleryOpen(false)}><Text style={{ fontSize: 18, color: '#007AFF', fontWeight: 'bold' }}>Close</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10 }}>
            {galleryImages.map((imgName, index) => (
              <View key={index} style={{ width: '50%', padding: 5 }}>
                <Image source={{ uri: `${tunnelUrl}photos/${imgName}` }} style={{ width: '100%', height: 150, borderRadius: 10, backgroundColor: '#eee' }} />
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}