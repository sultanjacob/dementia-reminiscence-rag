import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../supabase';

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  // --- Role & Signup States ---
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [role, setRole] = useState<'patient' | 'family'>('patient');
  
  const [showWelcome, setShowWelcome] = useState(true);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const formFadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 1500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
      ])
    ).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }).start(() => {
        setShowWelcome(false);
        Animated.timing(formFadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }).start();
      });
    }, 2500);
    
    return () => clearTimeout(timer);
  }, []);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      Alert.alert("Sign In Failed", error.message);
    } 
    // Notice there is NO router.replace() here anymore.
    // The _layout.tsx Traffic Controller handles the routing automatically!
    
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { data: authData, error } = await supabase.auth.signUp({ email, password });
    
    if (error) {
      Alert.alert("Sign Up Failed", error.message);
    } else {
      // Instantly update their profile with the selected role
      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ role: role })
          .eq('id', authData.user.id);
          
        if (profileError) console.error("Profile update error:", profileError);
      }

      Alert.alert("Success", "Account created! You can now sign in.");
      setIsSignUpMode(false); // Send them back to the login view
    }
    setLoading(false);
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.appCapsule}>
        
        {showWelcome && (
          <Animated.View style={[styles.welcomeContainer, { opacity: fadeAnim }]}>
            <Animated.View style={[styles.orb, { transform: [{ scale: pulseAnim }] }]}>
              <Ionicons name="sparkles" size={48} color="#FFFFFF" />
            </Animated.View>
            <Text style={styles.welcomeTitle}>Remi</Text>
            <Text style={styles.welcomeSubtitle}>Your warm companion</Text>
          </Animated.View>
        )}

        {!showWelcome && (
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.formContainer}
          >
            <Animated.View style={{ opacity: formFadeAnim, flex: 1, justifyContent: 'center' }}>
              
              <View style={styles.formHeader}>
                <Ionicons name="sparkles" size={32} color="#8B5CF6" style={{marginBottom: 10}}/>
                <Text style={styles.formTitle}>{isSignUpMode ? "Create Account" : "Welcome back"}</Text>
                <Text style={styles.formSubtitle}>
                  {isSignUpMode ? "Set up a new Remi profile" : "Sign in to continue with Remi"}
                </Text>
              </View>

              {/* Role Selector (Only shows during Sign Up) */}
              {isSignUpMode && (
                <View style={styles.roleSelectorContainer}>
                  <Text style={styles.roleLabel}>I am setting this up for:</Text>
                  <View style={styles.roleButtons}>
                    <TouchableOpacity 
                      style={[styles.roleOption, role === 'patient' && styles.roleOptionActive]}
                      onPress={() => setRole('patient')}
                    >
                      <Ionicons name="person" size={20} color={role === 'patient' ? '#FFFFFF' : '#6B7280'} />
                      <Text style={[styles.roleText, role === 'patient' && styles.roleTextActive]}>Patient</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[styles.roleOption, role === 'family' && styles.roleOptionActive]}
                      onPress={() => setRole('family')}
                    >
                      <Ionicons name="people" size={20} color={role === 'family' ? '#FFFFFF' : '#6B7280'} />
                      <Text style={[styles.roleText, role === 'family' && styles.roleTextActive]}>Family</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

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
                {isSignUpMode ? (
                  <>
                    <TouchableOpacity 
                      style={styles.primaryButton} 
                      disabled={loading} 
                      onPress={signUpWithEmail}
                    >
                      <Text style={styles.primaryButtonText}>{loading ? "Creating..." : "Sign Up"}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.secondaryButton} 
                      disabled={loading} 
                      onPress={() => setIsSignUpMode(false)}
                    >
                      <Text style={styles.secondaryButtonText}>Back to Sign In</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
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
                      onPress={() => setIsSignUpMode(true)}
                    >
                      <Text style={styles.secondaryButtonText}>Create an Account</Text>
                    </TouchableOpacity>
                  </>
                )}
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
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  appCapsule: {
    flex: 1,
    backgroundColor: '#110C1D',
    borderRadius: 45,
    overflow: 'hidden',
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#231A31',
  },
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
  formContainer: {
    flex: 1,
    paddingHorizontal: 30,
  },
  formHeader: {
    alignItems: 'center',
    marginBottom: 30,
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
  roleSelectorContainer: {
    marginBottom: 20,
  },
  roleLabel: {
    color: '#E2D8F0',
    fontSize: 14,
    marginBottom: 10,
    textAlign: 'center',
  },
  roleButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  roleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1325',
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  roleOptionActive: {
    backgroundColor: '#8B5CF6',
    borderColor: '#A78BFA',
  },
  roleText: {
    color: '#6B7280',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  roleTextActive: {
    color: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1325',
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
    marginBottom: 20,
  },
  secondaryButtonText: {
    color: '#E2D8F0',
    fontSize: 16,
    fontWeight: '600',
  },
});