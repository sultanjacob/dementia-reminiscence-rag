import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Ask Remi about a family memory.");
  const [loading, setLoading] = useState(false);

  // PASTE YOUR TUNNEL URL HERE (Ends with /)
  const tunnelUrl = "https://ssk3gx0p-8080.uks1.devtunnels.ms/"; 

  const askRemi = async () => {
    if (!question) return;
    setLoading(true);
    try {
      // We are sending the question to the server
      const response = await fetch(`${tunnelUrl}ask?q=${encodeURIComponent(question)}`);
      const data = await response.json();
      setAnswer(data.message);
    } catch (error) {
      setAnswer("Error: Remi couldn't hear you.");
    }
    setLoading(false);
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', padding: 20 }}>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#003366', marginBottom: 10 }}>Remi 🧠</Text>
      
      <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 15, width: '100%', marginBottom: 20, elevation: 3 }}>
        <Text style={{ fontSize: 18, color: '#333', lineHeight: 24 }}>{answer}</Text>
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