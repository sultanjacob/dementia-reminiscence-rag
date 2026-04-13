import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [inputText, setInputText] = useState("");
  const [answer, setAnswer] = useState("Hello! I'm Remi. How can I help you today?");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); 
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);

  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  // Greet the user when they open the app
  useEffect(() => {
    speakResponse("Hello! I'm Remi. It is lovely to see you.");
  }, []);

  const speakResponse = (text: string) => {
    if (!text || typeof text !== 'string') return;
    Speech.speak(text, { language: 'en-GB', pitch: 0.9, rate: 0.8 });
  };

  const handleTextChat = async () => {
    if (!inputText.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`${tunnelUrl}ask?q=${encodeURIComponent(inputText)}`);
      const data = await response.json();
      setAnswer(data.message);
      speakResponse(data.message);
      setInputText("");
    } catch (error) {
      setAnswer("I'm having a little trouble connecting. Is the server running?");
    } finally {
      setLoading(false);
    }
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
        if (isTeachingMode) formData.append('description', inputText);
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
      {/* HEADER */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 15, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#eee' }}>
        <TouchableOpacity onPress={() => setMenuOpen(true)}>
          <Text style={{ fontSize: 32, color: '#003366' }}>☰</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#003366' }}>Remi 🧠</Text>
        <TouchableOpacity onPress={openGallery}>
          <Text style={{ fontSize: 28 }}>🖼️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, alignItems: 'center' }}>
        {/* MODE TOGGLE */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 25, marginBottom: 20, elevation: 1 }}>
          <Text style={{ marginHorizontal: 10, color: isTeachingMode ? '#666' : '#007AFF', fontWeight: 'bold' }}>Ask</Text>
          <Switch value={isTeachingMode} onValueChange={setIsTeachingMode} trackColor={{ false: "#767577", true: "#34C759" }} />
          <Text style={{ marginHorizontal: 10, color: isTeachingMode ? '#34C759' : '#666', fontWeight: 'bold' }}>Teach</Text>
        </View>

        {/* MAIN RESPONSE CARD */}
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 20, width: '100%', marginBottom: 20, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
          {selectedImage && <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 250, borderRadius: 15, marginBottom: 15 }} resizeMode="cover" />}
          <Text style={{ fontSize: 20, color: '#333', lineHeight: 28, textAlign: 'center', fontWeight: '500' }}>{answer}</Text>
        </View>

        {/* INPUT AREA */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, marginBottom: 15, width: '100%' }}>
          <TextInput
            style={{ flex: 1, paddingVertical: 15, fontSize: 18, color: '#333' }}
            placeholder={isTeachingMode ? "What is this memory?" : "Message Remi..."}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity onPress={handleTextChat} disabled={loading || isTeachingMode}>
             <Text style={{ fontSize: 32, color: isTeachingMode ? '#eee' : '#007AFF' }}>➡️</Text>
          </TouchableOpacity>
        </View>

        {/* CAMERA BUTTON */}
        <TouchableOpacity 
          onPress={handleAction} 
          style={{ backgroundColor: isTeachingMode ? '#34C759' : '#003366', padding: 20, borderRadius: 15, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 }} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : (
            <>
              <Text style={{ fontSize: 24, marginRight: 12 }}>📸</Text>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                {isTeachingMode ? "Save Memory" : "Identify Photo"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* MODALS (Menu & Gallery) */}
      <Modal visible={menuOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: '80%', backgroundColor: '#003366', padding: 40, paddingTop: 80 }}>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 40 }}>Remi Menu</Text>
            <TouchableOpacity style={{ marginBottom: 35 }} onPress={checkRoutine}><Text style={{ color: 'white', fontSize: 20 }}>🕒 Daily Routine</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 35 }} onPress={openGallery}><Text style={{ color: 'white', fontSize: 20 }}>🖼️ Memory Gallery</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 35 }} onPress={() => setMenuOpen(false)}><Text style={{ color: 'white', fontSize: 20 }}>🏠 Home Screen</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={{ width: '20%', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>

      <Modal visible={galleryOpen} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 60 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#003366' }}>Your Memories 🖼️</Text>
            <TouchableOpacity onPress={() => setGalleryOpen(false)}><Text style={{ fontSize: 18, color: '#007AFF', fontWeight: '600' }}>Back</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10 }}>
            {galleryImages.map((item: any, index: number) => (
              <TouchableOpacity key={index} style={{ width: '50%', padding: 8 }} onPress={() => speakResponse(item.description)}>
                <Image source={{ uri: `${tunnelUrl}photos/${item.url}` }} style={{ width: '100%', height: 160, borderRadius: 15, backgroundColor: '#f9f9f9' }} />
                <Text style={{ fontSize: 14, color: '#444', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}