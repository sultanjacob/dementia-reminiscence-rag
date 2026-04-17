import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

// This pulls in the 'supabase' tool from your helper file
import { supabase } from '../../supabase';

export default function Index() {
  // --- 1. AUTHENTICATION STATES ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);

  // --- 2. APP STATES ---
  const [inputText, setInputText] = useState("");
  const [answer, setAnswer] = useState("Hello! I'm Remi. How can I help you today?");
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isTeachingMode, setIsTeachingMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); 
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);

  // ⚠️ Double check this matches your current VS Code tunnel!
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  // --- 3. AUTH LOGIC ---

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignUp = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) Alert.alert("Error", error.message);
    else Alert.alert("Success", "Account created! You are now logged in.");
  };

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) Alert.alert("Error", error.message);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMenuOpen(false);
  };

  // --- 4. APP LOGIC ---

  useEffect(() => {
    if (user) {
      speakResponse("Hello! I'm Remi. It is lovely to see you.");
    }
  }, [user]);

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

  const handleAction = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission needed", "Please allow camera access to use Remi's eyes.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({ allowsEditing: false, quality: 0.2 });

    if (!result.canceled) {
      const imageUri = result.assets[0].uri;
      setSelectedImage(imageUri);

      if (!isTeachingMode) {
        processImageAsk(imageUri);
      } else {
        setAnswer("Great photo! Now describe it and tap 'Save Memory' below.");
      }
    }
  };

  const saveMemoryToCloud = async () => {
    if (!selectedImage) {
      Alert.alert("No photo", "Please take a photo first!");
      return;
    }
    if (!inputText.trim()) {
      Alert.alert("Missing description", "Please describe the photo so I can remember it.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('image', { uri: selectedImage, name: 'photo.jpg', type: 'image/jpeg' });
    formData.append('description', inputText);
    formData.append('user_id', user.id);
    try {
      const response = await fetch(`${tunnelUrl}teach-remi`, { method: 'POST', body: formData });
      const data = await response.json();
      setAnswer(data.message);
      speakResponse(data.message);
      setInputText(""); 
      setSelectedImage(null);
    } catch (error) {
      Alert.alert("Save failed", error.message);
    } finally {
      setLoading(false);
    }
  };

  const processImageAsk = async (uri: string) => {
    setLoading(true);
    const formData = new FormData();
    // @ts-ignore
    formData.append('image', { uri: uri, name: 'photo.jpg', type: 'image/jpeg' });

    try {
      const response = await fetch(`${tunnelUrl}describe-image`, { method: 'POST', body: formData });
      const data = await response.json();
      setAnswer(data.message);
      speakResponse(data.message);
    } catch (error) {
      setAnswer("I'm sorry, my eyes are a bit blurry right now.");
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
      const response = await fetch(`${tunnelUrl}get-memories?user_id=${user.id}`);
      const data = await response.json();
      setGalleryImages(data.memories || []);
      setGalleryOpen(true);
    } catch (error) {
      Alert.alert("Error", "Could not load gallery.");
    } finally {
      setLoading(false);
    }
  };

  // --- 5. AUTH SCREEN UI ---
  if (!user) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#f0f4f8' }}>
        <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 10 }}>🧠</Text>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#003366', textAlign: 'center', marginBottom: 40 }}>Remi AI</Text>
        
        <TextInput 
          style={{ backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' }} 
          placeholder="Email Address" 
          value={email} 
          onChangeText={setEmail} 
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput 
          style={{ backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 25, borderWidth: 1, borderColor: '#ddd' }} 
          placeholder="Password" 
          value={password} 
          onChangeText={setPassword} 
          secureTextEntry 
        />

        <TouchableOpacity onPress={handleLogin} style={{ backgroundColor: '#003366', padding: 18, borderRadius: 15, marginBottom: 15 }}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 18 }}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignUp}>
          <Text style={{ color: '#003366', textAlign: 'center', fontSize: 16 }}>New here? Create an account</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- 6. MAIN APP UI ---
  return (
    <View style={{ flex: 1, backgroundColor: '#f0f4f8' }}>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 8, borderRadius: 25, marginBottom: 20, elevation: 1 }}>
          <Text style={{ marginHorizontal: 10, color: isTeachingMode ? '#666' : '#007AFF', fontWeight: 'bold' }}>Ask</Text>
          <Switch value={isTeachingMode} onValueChange={(val) => { setIsTeachingMode(val); setSelectedImage(null); }} trackColor={{ false: "#767577", true: "#34C759" }} />
          <Text style={{ marginHorizontal: 10, color: isTeachingMode ? '#34C759' : '#666', fontWeight: 'bold' }}>Teach</Text>
        </View>

        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 20, width: '100%', marginBottom: 20, elevation: 4 }}>
          {selectedImage && <Image source={{ uri: selectedImage }} style={{ width: '100%', height: 250, borderRadius: 15, marginBottom: 15 }} resizeMode="cover" />}
          <Text style={{ fontSize: 20, color: '#333', lineHeight: 28, textAlign: 'center' }}>{answer}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderRadius: 15, borderWidth: 1, borderColor: '#ddd', paddingHorizontal: 15, marginBottom: 15, width: '100%' }}>
          <TextInput
            style={{ flex: 1, paddingVertical: 15, fontSize: 18 }}
            placeholder={isTeachingMode ? "What is this memory?" : "Message Remi..."}
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity onPress={handleTextChat} disabled={loading || isTeachingMode}>
             <Text style={{ fontSize: 32, color: isTeachingMode ? '#eee' : '#007AFF' }}>➡️</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          onPress={isTeachingMode ? (selectedImage ? saveMemoryToCloud : handleAction) : handleAction} 
          style={{ backgroundColor: isTeachingMode ? '#34C759' : '#003366', padding: 20, borderRadius: 15, width: '100%', flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }} 
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : (
            <>
              <Text style={{ fontSize: 24, marginRight: 12 }}>{isTeachingMode ? (selectedImage ? "💾" : "📸") : "📸"}</Text>
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 18 }}>
                {isTeachingMode ? (selectedImage ? "Save Memory" : "Take Photo") : "Identify Photo"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Side Menu */}
      <Modal visible={menuOpen} animationType="slide" transparent={true}>
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: '80%', backgroundColor: '#003366', padding: 40, paddingTop: 80 }}>
            <Text style={{ color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 40 }}>Remi Menu</Text>
            <TouchableOpacity style={{ marginBottom: 35 }} onPress={checkRoutine}><Text style={{ color: 'white', fontSize: 20 }}>🕒 Daily Routine</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 35 }} onPress={openGallery}><Text style={{ color: 'white', fontSize: 20 }}>🖼️ Memory Gallery</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginBottom: 35 }} onPress={handleLogout}><Text style={{ color: '#FF3B30', fontSize: 20 }}>🚪 Log Out</Text></TouchableOpacity>
            <TouchableOpacity style={{ marginTop: 50 }} onPress={() => setMenuOpen(false)}><Text style={{ color: 'white', opacity: 0.6 }}>🏠 Close Menu</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={{ width: '20%', backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setMenuOpen(false)} />
        </View>
      </Modal>

      {/* Gallery Modal - UPDATED FOR CLOUD STORAGE */}
      <Modal visible={galleryOpen} animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'white', paddingTop: 60 }}>
          <div style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginBottom: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 26, fontWeight: 'bold', color: '#003366' }}>Your Memories 🖼️</Text>
            <TouchableOpacity onPress={() => setGalleryOpen(false)}><Text style={{ fontSize: 18, color: '#007AFF' }}>Back</Text></TouchableOpacity>
          </div>
          <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', padding: 10 }}>
            {galleryImages.map((item: any, index: number) => (
              <TouchableOpacity key={index} style={{ width: '50%', padding: 8 }} onPress={() => speakResponse(item.description)}>
                {/* The Image component now pulls the FULL URL stored in the DB.
                  No more tunnelUrl prefix needed here!
                */}
                <Image 
                  source={{ uri: item.url }} 
                  style={{ width: '100%', height: 160, borderRadius: 15, backgroundColor: '#f9f9f9' }} 
                />
                <Text style={{ fontSize: 14, color: '#444', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>{item.description}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}