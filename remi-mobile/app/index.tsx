import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, SafeAreaView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../supabase'; // Adjust this path if needed!

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Controls whether we show the Welcome screen or the Login screen
  const [showWelcome, setShowWelcome] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current; // For Welcome fading out
  const formFadeAnim = useRef(new Animated.Value(0)).current; // For Form fading in
  const pulseAnim = useRef(new Animated.Value(1)).current; // For glowing icon

  useEffect(() => {
    // 1. Start the glowing pulse animation immediately
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();

    // 2. Wait 2.5 seconds, then transition to the Login Form
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setShowWelcome(false);
        // Fade the form in smoothly
        Animated.timing(formFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);
const handleEmergencyCall = () => {
    // Replace with the actual caregiver's number
    Linking.openURL('tel:+15551234567'); 
  };
    return () => clearTimeout(timer);
  }, []);

 async function signInWithEmail() {
  setLoading(true);

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    Alert.alert("Sign In Failed", error.message);
  } else {
    router.replace('/(auth)'); 
  }

  setLoading(false);
}

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert("Sign Up Failed", error.message);
    else Alert.alert("Success", "Account created! You can now sign in.");
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.appCapsule}>
        
        {/* --- STATE 1: THE WELCOME SPLASH SCREEN --- */}
        {showWelcome && (
          <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim }]}>
            <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="sparkles" size={48} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.welcomeTitle}>Remi</Text>
            <Text style={styles.welcomeSubtitle}>Your warm companion</Text>
          </Animated.View>
        )}

        {/* --- STATE 2: THE AUTHENTICATION FORM --- */}
        {!showWelcome && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.formContainer}
          >
            <Animated.View style={{ opacity: formFadeAnim, flex: 1, justifyContent: 'center' }}>
              
              <View style={styles.formHeader}>
                <Ionicons name="sparkles" size={32} color="#8B5CF6" style={{marginBottom: 10}}/>
                <Text style={styles.formTitle}>Welcome back</Text>
                <Text style={styles.formSubtitle}>Sign in to continue with Remi</Text>
              </View>

              <View style={styles.inputGroup}>
                <View style={styles.inputWrapper}>
                  <Ionicons name="mail" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Email address"
                    placeholderTextColor="#6B7280"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>

                <View style={styles.inputWrapper}>
                  <Ionicons name="lock-closed" size={20} color="#6B7280" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor="#6B7280"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                  />
                </View>
              </View>

              <View style={styles.buttonGroup}>
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  disabled={loading} 
                  onPress={signInWithEmail}
                >
                  <Text style={styles.primaryButtonText}>{loading ? "Connecting..." : "Sign In"}</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={styles.secondaryButton} 
                  disabled={loading} 
                  onPress={signUpWithEmail}
                >
                  <Text style={styles.secondaryButtonText}>Create an Account</Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </KeyboardAvoidingView>
        )}

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000', // Black phone frame
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  appCapsule: {
    flex: 1,
    backgroundColor: '#110C1D', // Deep purple-black app background
    borderRadius: 45,
    overflow: 'hidden',
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  
  // --- Welcome Screen Styles ---
  welcomeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  orb: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 30,
    elevation: 20,
    marginBottom: 30,
  },
  welcomeTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  welcomeSubtitle: {
    fontSize: 18,
    color: '#A396B5',
    marginTop: 10,
  },

  // --- Auth Form Styles ---
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  formTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  formSubtitle: {
    fontSize: 16,
    color: '#A396B5',
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 30,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1325', // Slightly lighter than background
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#231A31',
    paddingHorizontal: 15,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    paddingVertical: 18,
  },
  buttonGroup: {
    marginTop: 10,
  },
  primaryButton: {
    backgroundColor: '#8B5CF6',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3D2F4F',
  },
  secondaryButtonText: {
    color: '#E2D8F0',
    fontSize: 16,
    fontWeight: '600',
  },
});