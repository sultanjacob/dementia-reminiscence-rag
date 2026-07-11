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
import { supabase } from '../../supabase';

export default function FamilySettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [patientName, setPatientName] = useState('');
  const [primaryContact, setPrimaryContact] = useState('');
  const [secondaryContact, setSecondaryContact] = useState('');

  useEffect(() => {
    fetchPatientSettings();
  }, []);

  const fetchPatientSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // In a fully linked database, you would fetch the patient's profile using the linked_patient_id.
      // For now, we are fetching the current user's profile to populate the fields.
      const { data, error } = await supabase
        .from('profiles')
        .select('nickname, primary_contact, secondary_contact')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPatientName(data.nickname || '');
        setPrimaryContact(data.primary_contact || '');
        setSecondaryContact(data.secondary_contact || '');
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          nickname: patientName,
          primary_contact: primaryContact,
          secondary_contact: secondaryContact,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      Alert.alert("Success", "Patient settings have been updated.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      Alert.alert("Sign Out Error", error.message);
    } else {
      // Instantly route back to your newly named login screen
      router.replace('/login'); 
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#110C1D" />
      
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Family Settings</Text>
            <Text style={styles.headerSubtitle}>Manage patient details and account preferences</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Patient Profile</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Patient's Display Name</Text>
              <TextInput
                style={styles.textInput}
                value={patientName}
                onChangeText={setPatientName}
                placeholder="e.g., Peter"
                placeholderTextColor="#6B7280"
              />
              <Text style={styles.inputHelper}>This is the name Remi will use to greet them.</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Emergency Contacts</Text>
            <Text style={styles.cardDescription}>
              These numbers are linked to the "TAP HERE FOR HELP" emergency menu on the patient's app.
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Primary Contact Number</Text>
              <TextInput
                style={styles.textInput}
                value={primaryContact}
                onChangeText={setPrimaryContact}
                placeholder="+44 7700 900000"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Secondary Contact Number</Text>
              <TextInput
                style={styles.textInput}
                value={secondaryContact}
                onChangeText={setSecondaryContact}
                placeholder="+44 7700 900001"
                placeholderTextColor="#6B7280"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.saveButton, saving && styles.saveButtonDisabled]} 
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dangerZone}>
            <Text style={styles.dangerZoneTitle}>Account Management</Text>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.signOutButtonText}>Sign Out of Family Portal</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#110C1D', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  loadingContainer: { flex: 1, backgroundColor: '#110C1D', justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  header: { marginBottom: 30 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#FFFFFF', marginBottom: 8 },
  headerSubtitle: { fontSize: 16, color: '#9CA3AF' },
  card: { backgroundColor: '#1F162B', borderRadius: 24, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#2D2040' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF', marginBottom: 20, letterSpacing: 0.5 },
  cardDescription: { color: '#9CA3AF', fontSize: 14, marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 16 },
  inputLabel: { color: '#D1D5DB', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  textInput: { backgroundColor: '#110C1D', borderWidth: 1, borderColor: '#37284C', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 16 },
  inputHelper: { color: '#6B7280', fontSize: 12, marginTop: 6 },
  saveButton: { backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  saveButtonDisabled: { backgroundColor: '#6B7280', shadowOpacity: 0 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  dangerZone: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#2D2040', paddingTop: 30 },
  dangerZoneTitle: { color: '#6B7280', fontSize: 14, fontWeight: '700', textTransform: 'uppercase', marginBottom: 15, letterSpacing: 1 },
  signOutButton: { flexDirection: 'row', backgroundColor: 'rgba(239, 68, 68, 0.1)', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
  signOutButtonText: { color: '#EF4444', fontSize: 16, fontWeight: '700' },
});