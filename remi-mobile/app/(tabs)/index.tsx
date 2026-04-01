import * as Speech from 'expo-speech';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask Remi about a family memory.");
  const [loading, setLoading] = useState(false);

  // PASTE YOUR TUNNEL URL HERE (Ends with /)
  const tunnelUrl = "https://ssk3gx0p-8000.uks1.devtunnels.ms/"; 

  const askRemi = async () => {
    if (!question) return;
    setLoading(true);
    try {
    const response = await fetch(`${tunnelUrl}/ask?q=${encodeURIComponent(userQuery)}`);
    const data = await response.json();
    setRemiResponse(data.message);

    // --- NEW: TELL REMI TO SPEAK ---
    Speech.speak(data.message, {
      language: 'en-US', // You can change to 'en-GB' for a British accent!
      pitch: 1.0,
      rate: 0.9, // Slightly slower is often better for dementia care
    });

  } catch (error) {
    setRemiResponse("Remi's brain is a bit fuzzy: " + error.message);
  } finally {
    setLoading(false);
  }
};
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