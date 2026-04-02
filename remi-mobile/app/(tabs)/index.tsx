import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask Remi about a family memory.");
  const [loading, setLoading] = useState(false);

  // ⚠️ Remember: Update this if your VS Code Tunnel URL changes!
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  // Function to make Remi talk
  const speakResponse = (text: string) => {
    Speech.speak(text, {
      language: 'en-GB',
      pitch: 1.0,
      rate: 0.85, // Slightly slower is better for clarity
    });
  };

  const askRemi = async () => {
    if (!question) return;
    setLoading(true);
    try {
      // 1. Send the question to the Python Brain
      const response = await fetch(`${tunnelUrl}ask?q=${encodeURIComponent(question)}`);
      const data = await response.json();
      
      const remiMessage = data.message;
      setAnswer(remiMessage);

      // 2. Speak the answer automatically
      speakResponse(remiMessage);

    } catch (error) {
      setAnswer("Error: Remi couldn't hear you.");
    }
    setLoading(false);
  };

  React.useEffect(() => {
  const checkVoices = async () => {
    const voices = await Speech.getAvailableVoicesAsync();
    console.log("--- 🎙️ VOICES ON THIS PHONE ---");
    voices.forEach(v => console.log(`${v.name} (${v.identifier})`));
  };
  checkVoices();
}, []);
  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#003366', marginBottom: 10 }}>Remi 🧠</Text>
      
      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, width: '100%', marginBottom: 20, elevation: 3 }}>
        <Text style={{ fontSize: 18, color: '#333', lineHeight: 24 }}>{answer}</Text>
        
        {/* --- NEW: LISTEN AGAIN BUTTON --- */}
        {answer !== "Ask Remi about a family memory." && !loading && (
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
        placeholder="Type your question here..."
        value={question}
        onChangeText={setQuestion}
      />

      <TouchableOpacity 
        onPress={askRemi}
        style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '100%' }}
      >
        {loading ? <ActivityIndicator color="white" /> : <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 16 }}>Ask Remi</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}