import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { supabase } from '../supabase'; // Adjust this path if your supabase.ts is elsewhere

export default function SettingsScreen() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [nickname, setNickname] = useState('');
  const [primaryContact, setPrimaryContact] = useState('');
  const [secondaryContact, setSecondaryContact] = useState('');
  const [caregiverPin, setCaregiverPin] = useState('');

  useEffect(() => {
    fetchProfileSettings();
  }, []);

  const fetchProfileSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, primary_contact, secondary_contact, caregiver_pin')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setNickname(data.nickname || '');
        setPrimaryContact(data.primary_contact || '');
        setSecondaryContact(data.secondary_contact || '');
        setCaregiverPin(data.caregiver_pin || '');
      }
    } catch (error: any) {
      console.error("Error loading settings:", error.message);
      Alert.alert("Error", "Could not load settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not logged in");

      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: nickname.trim(),
          primary_contact: primaryContact.trim(),
          secondary_contact: secondaryContact.trim(),
          caregiver_pin: caregiverPin.trim(),
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert("Success", "Your settings have been updated!", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error: any) {
      Alert.alert("Error saving", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#D1D5DB" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App Settings</Text>
        <View style={{ width: 40 }} /> 
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* --- PATIENT PREFERENCES --- */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Patient Profile</Text>
                
                <Text style={styles.label}>Patient's Preferred Name:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Mary"
                  value={nickname}
                  onChangeText={setNickname}
                  placeholderTextColor="#6B7280"
                />
              </View>

              {/* --- EMERGENCY CONTACTS --- */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SOS Contacts</Text>
                <Text style={styles.sectionDescription}>
                  These numbers are dialed instantly when the emergency button is pressed.
                </Text>

                <Text style={styles.label}>Primary Contact Number:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 123-4567"
                  value={primaryContact}
                  onChangeText={setPrimaryContact}
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                />

                <Text style={styles.label}>Secondary Contact Number:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="+1 (555) 987-6543"
                  value={secondaryContact}
                  onChangeText={setSecondaryContact}
                  placeholderTextColor="#6B7280"
                  keyboardType="phone-pad"
                />
              </View>

              {/* --- SECURITY --- */}
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Caregiver Security</Text>
                
                <Text style={styles.label}>4-Digit Action PIN:</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter 4 digits"
                  value={caregiverPin}
                  onChangeText={setCaregiverPin}
                  placeholderTextColor="#6B7280"
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry={true}
                />
                <Text style={styles.helperText}>Used to unlock the daily checklist on the patient's tablet.</Text>
              </View>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.saveButton, isSaving && { opacity: 0.7 }]} 
          onPress={handleSaveSettings}
          disabled={isSaving || isLoading}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? "Saving Settings..." : "Save Changes"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#050505', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#050505', borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  backButton: { padding: 8, backgroundColor: '#111827', borderRadius: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  section: { marginBottom: 35 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 5 },
  sectionDescription: { fontSize: 13, color: '#9CA3AF', marginBottom: 15, lineHeight: 20 },
  
  label: { fontSize: 14, fontWeight: '600', color: '#D1D5DB', marginBottom: 8, marginLeft: 4 },
  input: { backgroundColor: '#13111C', borderWidth: 1, borderColor: '#374151', borderRadius: 16, padding: 16, fontSize: 16, color: '#FFFFFF', marginBottom: 15 },
  helperText: { fontSize: 12, color: '#6B7280', marginLeft: 4, marginTop: -5 },

  footer: { padding: 20, backgroundColor: '#050505', borderTopWidth: 1, borderTopColor: '#1F2937' },
  saveButton: { backgroundColor: '#8B5CF6', alignItems: 'center', justifyContent: 'center', paddingVertical: 18, borderRadius: 16 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});