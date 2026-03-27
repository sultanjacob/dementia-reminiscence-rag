import React, { useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';

export default function Index() {
  const [status, setStatus] = useState("Ready to chat!");
  const [loading, setLoading] = useState(false);

  // PASTE YOUR TUNNEL URL BELOW (Keep the / at the end)
  const tunnelUrl = "https://ssk3gx0p-8080.uks1.devtunnels.ms/"; 

  const testConnection = async () => {
    setLoading(true);
    setStatus("Connecting to Remi...");
    try {
      const response = await fetch(tunnelUrl);
      const data = await response.json();
      setStatus(`Remi says: ${data.message}`);
    } catch (error) {
      setStatus("Error: Could not reach the server.");
      console.log(error);
    }
    setLoading(false);
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f0f4f8', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Remi Mobile 🧠</Text>
      <Text style={{ fontSize: 16, textAlign: 'center', marginBottom: 30 }}>{status}</Text>
      
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <TouchableOpacity 
          onPress={testConnection}
          style={{ backgroundColor: '#007AFF', padding: 15, borderRadius: 10, width: '80%' }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>Wake Up Remi</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}