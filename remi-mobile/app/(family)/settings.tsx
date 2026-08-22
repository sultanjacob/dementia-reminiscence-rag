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

  // Primary Contact States
  const [primaryName, setPrimaryName] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [primaryAvatar, setPrimaryAvatar] = useState('');

  // Secondary Contact States
  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryRole, setSecondaryRole] = useState('');
  const [secondaryPhone, setSecondaryPhone] = useState('');
  const [secondaryAvatar, setSecondaryAvatar] = useState('');

  // Orientation States
  const [dayMessage, setDayMessage] = useState('');
  const [nightMessage, setNightMessage] = useState('');

  // Security
  const [pin, setPin] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setPrimaryName(data.primary_contact_name || '');
        setPrimaryRole(data.primary_contact_role || '');
        setPrimaryPhone(data.primary_contact || '');
        setPrimaryAvatar(data.primary_contact_avatar || '');

        setSecondaryName(data.secondary_contact_name || '');
        setSecondaryRole(data.secondary_contact_role || '');
        setSecondaryPhone(data.secondary_contact || '');
        setSecondaryAvatar(data.secondary_contact_avatar || '');

        setDayMessage(data.day_message || '');
        setNightMessage(data.night_message || '');
        setPin(data.caregiver_pin || '');
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Could not load profile settings.');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found.");

      const updates = {
        primary_contact_name: primaryName,
        primary_contact_role: primaryRole,
        primary_contact: primaryPhone,
        primary_contact_avatar: primaryAvatar,
        secondary_contact_name: secondaryName,
        secondary_contact_role: secondaryRole,
        secondary_contact: secondaryPhone,
        secondary_contact_avatar: secondaryAvatar,
        day_message: dayMessage,
        night_message: nightMessage,
        caregiver_pin: pin,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);

      if (error) throw error;
      Alert.alert('Success', 'Settings saved successfully! Changes will appear on Mary\'s screen on her next refresh.');
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Save Failed', error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/login');
      }}
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8B5CF6" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{top: 15, bottom:15, left:15, right:15}}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>App Settings</Text>
          <View style={{ width: 24 }} /> 
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {/* PRIMARY CONTACT SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Primary Contact (Card 1)</Text>
            </View>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={primaryName} onChangeText={setPrimaryName} placeholder="e.g. Sarah" />
            
            <Text style={styles.label}>Role / Relation</Text>
            <TextInput style={styles.input} value={primaryRole} onChangeText={setPrimaryRole} placeholder="e.g. Daughter" />
            
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={primaryPhone} onChangeText={setPrimaryPhone} placeholder="e.g. +1234567890" keyboardType="phone-pad" />
            
            <Text style={styles.label}>Avatar Image URL</Text>
            <TextInput style={styles.input} value={primaryAvatar} onChangeText={setPrimaryAvatar} placeholder="e.g. https://i.pravatar.cc/150" autoCapitalize="none" />
          </View>

          {/* SECONDARY CONTACT SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Secondary Contact (Card 2)</Text>
            </View>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={secondaryName} onChangeText={setSecondaryName} placeholder="e.g. David" />
            
            <Text style={styles.label}>Role / Relation</Text>
            <TextInput style={styles.input} value={secondaryRole} onChangeText={setSecondaryRole} placeholder="e.g. Son" />
            
            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={secondaryPhone} onChangeText={setSecondaryPhone} placeholder="e.g. +1098765432" keyboardType="phone-pad" />
            
            <Text style={styles.label}>Avatar Image URL</Text>
            <TextInput style={styles.input} value={secondaryAvatar} onChangeText={setSecondaryAvatar} placeholder="e.g. https://i.pravatar.cc/150" autoCapitalize="none" />
          </View>

          {/* ORIENTATION BOARD SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="sunny" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Orientation Board Messages</Text>
            </View>
            <Text style={styles.description}>These messages appear on the patient's home screen when no routines are scheduled.</Text>
            
            <Text style={styles.label}>Daytime Reassurance Message</Text>
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              value={dayMessage} 
              onChangeText={setDayMessage} 
              placeholder="e.g. You are safe at home. Sarah will visit later." 
              multiline 
            />
            
            <Text style={styles.label}>Nighttime Reassurance Message</Text>
            <TextInput 
              style={[styles.input, { height: 80 }]} 
              value={nightMessage} 
              onChangeText={setNightMessage} 
              placeholder="e.g. It is late. It is time to sleep safely." 
              multiline 
            />
          </View>

          {/* SECURITY SECTION */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="lock-closed" size={20} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Security</Text>
            </View>
            <Text style={styles.label}>Caregiver PIN (4 Digits)</Text>
            <TextInput 
              style={styles.input} 
              value={pin} 
              onChangeText={setPin} 
              placeholder="e.g. 1234" 
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
            />
          </View>

          {/* ACTIONS */}
          <TouchableOpacity 
            style={[styles.saveButton, saving && { opacity: 0.7 }]} 
            onPress={saveSettings} 
            disabled={saving}
          >
            {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Save Changes</Text>}
          </TouchableOpacity>

          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={20} color="#EF4444" style={{marginRight: 8}}/>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F9FAFB', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  scrollContent: { padding: 20, paddingBottom: 50 },
  section: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1F2937', marginLeft: 8 },
  description: { fontSize: 14, color: '#6B7280', marginBottom: 15, lineHeight: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#111827', marginBottom: 15 },
  saveButton: { backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 30, alignItems: 'center', marginBottom: 20, shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  saveButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, borderRadius: 30, backgroundColor: '#FEE2E2' },
  signOutText: { color: '#EF4444', fontSize: 16, fontWeight: 'bold' },
});