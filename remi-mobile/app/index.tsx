import React, { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

 const handleSignUp = async () => {
  setLoading(true);
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      Alert.alert("Error", error.message);
    } else if (data.session) {
      // If the toggle is OFF in Supabase, data.session will exist instantly!
      console.log("Success! Logged in immediately.");
    } else {
      // This only happens if the toggle is still ON in Supabase
      Alert.alert("Check Email", "Please click the link in your inbox to finish.");
    }
  } catch (err) {
    Alert.alert("Error", "Something went wrong.");
  } finally {
    setLoading(false);
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>🧠</Text>
      <Text style={styles.title}>Remi AI</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} autoCapitalize="none" />
      <TextInput style={styles.input} placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry />
      
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleSignUp}>
        <Text style={styles.linkText}>New family member? Create Account</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 30, backgroundColor: '#f0f4f8' },
  emoji: { fontSize: 60, textAlign: 'center', marginBottom: 10 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#003366', textAlign: 'center', marginBottom: 40 },
  input: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#003366', padding: 18, borderRadius: 15, marginTop: 10 },
  buttonText: { color: 'white', textAlign: 'center', fontWeight: 'bold', fontSize: 18 },
  linkText: { color: '#003366', textAlign: 'center', marginTop: 20 }
});