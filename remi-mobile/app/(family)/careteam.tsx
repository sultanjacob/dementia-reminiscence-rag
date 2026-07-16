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

export default function CareTeamScreen() {
  const router = useRouter();
  
  // --- STATES ---
  const [team, setTeam] = useState<any[]>([]);
  const [pin, setPin] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Placeholder Shift Logs for the UI prototype
  const [shiftLogs, setShiftLogs] = useState([
    {
      id: '1',
      date: 'Today, 2:30 PM',
      caregiver: 'Nurse Jane',
      vibe: 'Calm & Happy',
      notes: 'Mary had a great lunch and enjoyed looking at the new photos in the Vault. Took all afternoon medications without issue.',
      iconColor: '#34D399'
    },
    {
      id: '2',
      date: 'Yesterday, 3:00 PM',
      caregiver: 'Aide Michael',
      vibe: 'Slightly Confused',
      notes: 'Asked about her late husband a few times. I used Remi to play her favorite 60s music which helped redirect her mood.',
      iconColor: '#FBBF24'
    }
  ]);

  useEffect(() => {
    // Load both the team members and the PIN when the screen opens
    Promise.all([fetchCareTeam(), fetchCaregiverPin()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const fetchCareTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('care_team')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setTeam(data);
    } catch (error: any) {
      console.error("Error fetching care team:", error);
    }
  };

  const fetchCaregiverPin = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('caregiver_pin')
        .eq('id', user.id)
        .single();

      if (data && data.caregiver_pin) {
        setPin(data.caregiver_pin);
      }
    } catch (error) {
      console.error('Error fetching PIN:', error);
    }
  };
  const fetchShiftLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get the patient ID linked to this family member
      const { data: profile } = await supabase
        .from('profiles')
        .select('linked_patient_id')
        .eq('id', user.id)
        .single();

      if (profile?.linked_patient_id) {
        // 2. Fetch the shift logs for that patient
        const { data, error } = await supabase
          .from('shift_logs')
          .select('*')
          .eq('patient_id', profile.linked_patient_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        
        // 3. Format the data so the UI renders the correct colors
        if (data) {
          const formattedLogs = data.map(log => {
            let color = '#10B981'; // Calm (Green)
            if (log.vibe === 'Confused') color = '#F59E0B'; // Confused (Yellow)
            if (log.vibe === 'Agitated') color = '#EF4444'; // Agitated (Red)

            return {
              id: log.id,
              date: new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }),
              caregiver: log.caregiver_name,
              vibe: log.vibe,
              notes: log.notes || 'No additional notes provided.',
              iconColor: color
            };
          });
          setShiftLogs(formattedLogs);
        }
      }
    } catch (error) {
      console.error('Error fetching shift logs:', error);
    }
  };
  const handleSavePin = async () => {
    if (pin.length !== 4) {
      Alert.alert("Invalid PIN", "The Caregiver PIN must be exactly 4 digits.");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({ caregiver_pin: pin })
        .eq('id', user.id);

      if (error) throw error;
      
      Alert.alert("Success", "Caregiver PIN updated securely.");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Care Team Hub</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView style={styles.container} contentContainerStyle={styles.listContainer}>
          <Text style={styles.descriptionText}>
            Manage device access, active team members, and view daily shift reports.
          </Text>

          {/* --- 1. PIN SETUP CARD --- */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="lock-closed" size={20} color="#8B5CF6" style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Shared Device PIN</Text>
            </View>
            <Text style={styles.cardDescription}>
              Caregivers will use this 4-digit code to unlock the advanced Action Dashboard on Mary's tablet.
            </Text>

            <View style={styles.pinContainer}>
              <TextInput
                style={styles.pinInput}
                value={pin}
                onChangeText={(text) => setPin(text.replace(/[^0-9]/g, '').slice(0, 4))}
                placeholder="0000"
                placeholderTextColor="#374151"
                keyboardType="numeric"
                secureTextEntry={true}
                maxLength={4}
              />
              <TouchableOpacity 
                style={[styles.savePinButton, (pin.length !== 4 || isSaving) && styles.savePinButtonDisabled]} 
                onPress={handleSavePin}
                disabled={pin.length !== 4 || isSaving}
              >
                {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.savePinButtonText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>

          {/* --- 2. ACTIVE TEAM MEMBERS (Your UI) --- */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active Team Members</Text>
          </View>
          
          {isLoading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 20 }} />
          ) : team.length === 0 ? (
            <Text style={styles.emptyText}>No care team members found.</Text>
          ) : (
            team.map((item) => (
              <View key={item.id} style={styles.memberCard}>
                <View style={styles.memberHeader}>
                  <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
                    {item.is_online && <View style={styles.onlineIndicator} />}
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name}</Text>
                    <Text style={styles.memberRole}>{item.role}</Text>
                  </View>
                  <TouchableOpacity style={styles.iconButton}>
                    <Ionicons name="call-outline" size={20} color="#8B5CF6" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconButton, { marginLeft: 8 }]}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#9CA3AF" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.accessRow}>
                  <View style={styles.accessBadge}>
                    <Ionicons name="shield-checkmark-outline" size={14} color="#10B981" />
                    <Text style={styles.accessText}>{item.access_level}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          {/* --- 3. SHIFT LOGS --- */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Shift Logs</Text>
          </View>
            
          {shiftLogs.map((log) => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View>
                  <Text style={styles.logCaregiver}>{log.caregiver}</Text>
                  <Text style={styles.logDate}>{log.date}</Text>
                </View>
                <View style={[styles.vibeBadge, { borderColor: log.iconColor, backgroundColor: `${log.iconColor}15` }]}>
                  <View style={[styles.vibeDot, { backgroundColor: log.iconColor }]} />
                  <Text style={[styles.vibeText, { color: log.iconColor }]}>{log.vibe}</Text>
                </View>
              </View>
              <Text style={styles.logNotes}>{log.notes}</Text>
            </View>
          ))}

        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity 
        style={styles.addButton} 
        activeOpacity={0.8}
        onPress={() => Alert.alert("Coming Soon", "We will wire up the invite modal next!")}
      >
        <Ionicons name="person-add" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Invite New Member</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0F19', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  container: { flex: 1 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 100 },
  descriptionText: { color: '#9CA3AF', fontSize: 14, lineHeight: 20, marginTop: 20, marginBottom: 20 },
  
  // PIN Section Styles
  card: { backgroundColor: '#111827', borderRadius: 20, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: '#1F2937' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  cardDescription: { color: '#9CA3AF', fontSize: 13, marginBottom: 20, lineHeight: 20 },
  pinContainer: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  pinInput: { flex: 1, backgroundColor: '#0B0F19', borderWidth: 1, borderColor: '#374151', borderRadius: 16, paddingVertical: 14, color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', textAlign: 'center', letterSpacing: 8 },
  savePinButton: { backgroundColor: '#8B5CF6', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 16, justifyContent: 'center' },
  savePinButtonDisabled: { backgroundColor: '#374151' },
  savePinButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // Team Member Styles
  sectionHeader: { marginBottom: 15, marginTop: 10 },
  memberCard: { backgroundColor: '#111827', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1F2937' },
  memberHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#8B5CF6', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  onlineIndicator: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#111827' },
  memberInfo: { flex: 1 },
  memberName: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  memberRole: { color: '#9CA3AF', fontSize: 14, marginTop: 2 },
  iconButton: { backgroundColor: '#1F2937', padding: 10, borderRadius: 12 },
  accessRow: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1F2937' },
  accessBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.1)', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12 },
  accessText: { color: '#10B981', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  
  // Shift Log Styles
  logCard: { backgroundColor: '#111827', borderRadius: 20, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#1F2937' },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  logCaregiver: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  logDate: { color: '#6B7280', fontSize: 13 },
  vibeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  vibeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  vibeText: { fontSize: 12, fontWeight: 'bold' },
  logNotes: { color: '#D1D5DB', fontSize: 15, lineHeight: 22 },

  addButton: { flexDirection: 'row', backgroundColor: '#8B5CF6', position: 'absolute', bottom: 30, alignSelf: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 20, fontSize: 16 }
});