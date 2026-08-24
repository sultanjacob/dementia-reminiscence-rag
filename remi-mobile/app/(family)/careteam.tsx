import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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
  
  const [isLoading, setIsLoading] = useState(true);

  // Family Contacts (From profiles)
  const [primaryName, setPrimaryName] = useState('');
  const [primaryRole, setPrimaryRole] = useState('');
  const [secondaryName, setSecondaryName] = useState('');
  const [secondaryRole, setSecondaryRole] = useState('');

  // Professional Care Team (From care_team table)
  const [careTeam, setCareTeam] = useState<any[]>([]);

  // Shift Logs
  const [shiftLogs, setShiftLogs] = useState<any[]>([]);
  const [showAllLogs, setShowAllLogs] = useState(false);

  // Add Member Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('');
  const [newMemberPin, setNewMemberPin] = useState(''); // <-- NEW: Individual PIN State
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    Promise.all([fetchProfileData(), fetchCareTeam(), fetchShiftLogs()]).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const fetchProfileData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error) throw error;
      if (data) {
        setPrimaryName(data.primary_contact_name || '');
        setPrimaryRole(data.primary_contact_role || '');
        setSecondaryName(data.secondary_contact_name || '');
        setSecondaryRole(data.secondary_contact_role || '');
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  const fetchCareTeam = async () => {
    try {
      const { data, error } = await supabase
        .from('care_team')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      if (data) setCareTeam(data);
    } catch (error: any) {
      console.error("Error fetching care team:", error);
    }
  };

  const fetchShiftLogs = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('linked_patient_id').eq('id', user.id).single();

      if (profile?.linked_patient_id) {
        const { data, error } = await supabase
          .from('shift_logs')
          .select('*')
          .eq('patient_id', profile.linked_patient_id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (data) {
          const formattedLogs = data.map(log => {
            let color = '#10B981'; 
            if (log.vibe === 'Confused') color = '#F59E0B'; 
            if (log.vibe === 'Agitated') color = '#EF4444'; 

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

  // --- NEW: UPDATED MANAGEMENT FUNCTIONS ---
  const handleAddCaregiver = async () => {
    if (!newMemberName.trim() || !newMemberRole.trim() || newMemberPin.length !== 4) {
      Alert.alert("Missing Info", "Please provide a name, role, and a 4-digit PIN for the caregiver.");
      return;
    }

    setIsAdding(true);
    try {
      const { error } = await supabase.from('care_team').insert({
        name: newMemberName.trim(),
        role: newMemberRole.trim(),
        access_level: 'Standard Access',
        pin: newMemberPin // <-- Saving their individual PIN
      });

      if (error) throw error;
      
      setNewMemberName('');
      setNewMemberRole('');
      setNewMemberPin('');
      setShowAddModal(false);
      fetchCareTeam(); // Refresh the list
    } catch (error: any) {
      Alert.alert("Error", "Could not add caregiver.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteCaregiver = (id: string, name: string) => {
    Alert.alert(
      "Remove Caregiver", 
      `Are you sure you want to remove ${name} from the care team? They will lose access to Mary's device.`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase.from('care_team').delete().eq('id', id);
              if (error) throw error;
              fetchCareTeam(); // Refresh the list
            } catch (err) {
              Alert.alert("Error", "Could not remove caregiver.");
            }
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Care Team Hub</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.listContainer}>
          <Text style={styles.descriptionText}>
            Manage family contacts, professional care staff, and view daily shift reports.
          </Text>

          {isLoading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginVertical: 20 }} />
          ) : (
            <>
              {/* --- 1. FAMILY DIRECTORY --- */}
              <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionTitle}>Family Directory</Text>
                <TouchableOpacity onPress={() => router.push('/(family)/settings')}>
                  <Text style={styles.editLink}>Edit in Settings</Text>
                </TouchableOpacity>
              </View>
              
              {!primaryName && !secondaryName ? (
                <Text style={styles.emptyText}>No family members set up.</Text>
              ) : (
                <View style={styles.directoryBlock}>
                  {primaryName ? (
                    <View style={styles.memberRowMinimal}>
                      <View style={[styles.avatarMini, { backgroundColor: '#8B5CF6' }]}>
                        <Text style={styles.avatarTextMini}>{primaryName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{primaryName}</Text>
                        <Text style={styles.memberRole}>{primaryRole}</Text>
                      </View>
                      <View style={styles.accessBadge}>
                        <Text style={styles.accessText}>Admin</Text>
                      </View>
                    </View>
                  ) : null}

                  {secondaryName ? (
                    <View style={[styles.memberRowMinimal, { borderTopWidth: 1, borderTopColor: '#1F2937', paddingTop: 12, marginTop: 12 }]}>
                      <View style={[styles.avatarMini, { backgroundColor: '#4B5563' }]}>
                        <Text style={styles.avatarTextMini}>{secondaryName.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{secondaryName}</Text>
                        <Text style={styles.memberRole}>{secondaryRole}</Text>
                      </View>
                      <View style={styles.accessBadge}>
                        <Text style={styles.accessText}>Admin</Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              )}

              {/* --- 2. PROFESSIONAL CARE TEAM --- */}
              <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionTitle}>Professional Care Team</Text>
              </View>
              
              {careTeam.length === 0 ? (
                <Text style={styles.emptyText}>No nurses or caregivers assigned yet.</Text>
              ) : (
                careTeam.map((item) => (
                  <View key={item.id} style={styles.memberCard}>
                    <View style={styles.memberHeader}>
                      <View style={[styles.avatarContainer, { backgroundColor: '#374151' }]}>
                        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
                        {item.is_online && <View style={styles.onlineIndicator} />}
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={styles.memberName}>{item.name}</Text>
                        <Text style={styles.memberRole}>{item.role}</Text>
                      </View>
                      <TouchableOpacity style={styles.iconButton}>
                        <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.iconButton, { marginLeft: 8, backgroundColor: '#451A2E' }]}
                        onPress={() => handleDeleteCaregiver(item.id, item.name)}
                      >
                        <Ionicons name="trash" size={20} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.accessRow}>
                      <View style={[styles.accessBadge, { backgroundColor: '#1F2937' }]}>
                        <Ionicons name="shield-half-outline" size={14} color="#9CA3AF" />
                        <Text style={[styles.accessText, { color: '#9CA3AF' }]}>PIN: {item.pin || '****'}</Text>
                      </View>
                      <View style={[styles.accessBadge, { backgroundColor: '#1F2937', marginLeft: 10 }]}>
                        <Ionicons name="briefcase-outline" size={14} color="#9CA3AF" />
                        <Text style={[styles.accessText, { color: '#9CA3AF' }]}>{item.access_level || 'Standard Access'}</Text>
                      </View>
                    </View>
                  </View>
                ))
              )}

              {/* --- 3. SHIFT LOGS --- */}
              <View style={styles.sectionHeaderWrap}>
                <Text style={styles.sectionTitle}>Recent Shift Logs</Text>
              </View>
                
              {shiftLogs.length === 0 ? (
                 <Text style={styles.emptyText}>No shift logs recorded yet.</Text>
              ) : (
                <>
                  {shiftLogs.slice(0, showAllLogs ? shiftLogs.length : 2).map((log) => (
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

                  {shiftLogs.length > 2 && (
                    <TouchableOpacity style={styles.viewMoreButton} onPress={() => setShowAllLogs(!showAllLogs)} activeOpacity={0.7}>
                      <Text style={styles.viewMoreText}>{showAllLogs ? "Hide older logs" : `View ${shiftLogs.length - 2} older logs`}</Text>
                      <Ionicons name={showAllLogs ? "chevron-up" : "chevron-down"} size={16} color="#8B5CF6" />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <TouchableOpacity style={styles.addButton} activeOpacity={0.8} onPress={() => setShowAddModal(true)}>
        <Ionicons name="person-add" size={20} color="#FFFFFF" />
        <Text style={styles.addButtonText}>Invite Caregiver</Text>
      </TouchableOpacity>

      {/* --- ADD CAREGIVER MODAL --- */}
      <Modal visible={showAddModal} transparent={true} animationType="fade">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Professional Caregiver</Text>
            <Text style={styles.modalSubtitle}>Allocate them a unique PIN to access Mary's device.</Text>
            
            <Text style={styles.inputLabel}>Caregiver Name</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="e.g. Nurse Jackie" 
              placeholderTextColor="#6B7280" 
              value={newMemberName} 
              onChangeText={setNewMemberName} 
            />

            <Text style={styles.inputLabel}>Role / Agency</Text>
            <TextInput 
              style={styles.textInput} 
              placeholder="e.g. Visiting Nurse" 
              placeholderTextColor="#6B7280" 
              value={newMemberRole} 
              onChangeText={setNewMemberRole} 
            />

            {/* --- NEW PIN INPUT --- */}
            <Text style={styles.inputLabel}>Assign Access PIN</Text>
            <TextInput 
              style={[styles.textInput, { letterSpacing: 8, fontSize: 20, textAlign: 'center' }]} 
              placeholder="••••" 
              placeholderTextColor="#6B7280" 
              value={newMemberPin} 
              onChangeText={(text) => setNewMemberPin(text.replace(/[^0-9]/g, '').slice(0, 4))} 
              keyboardType="numeric"
              secureTextEntry={false} // Shown plainly while creating
              maxLength={4}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => { setShowAddModal(false); setNewMemberName(''); setNewMemberRole(''); setNewMemberPin(''); }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.saveButton, (newMemberPin.length !== 4) && { opacity: 0.5 }]} 
                onPress={handleAddCaregiver} 
                disabled={isAdding || newMemberPin.length !== 4}
              >
                {isAdding ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Add Member</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
  
  sectionHeaderWrap: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  editLink: { color: '#8B5CF6', fontSize: 14, fontWeight: 'bold' },
  
  // Family Directory Styles
  directoryBlock: { backgroundColor: '#111827', borderRadius: 20, padding: 16, marginBottom: 25, borderWidth: 1, borderColor: '#1F2937' },
  memberRowMinimal: { flexDirection: 'row', alignItems: 'center' },
  avatarMini: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarTextMini: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },

  // Professional Care Team Styles
  memberCard: { backgroundColor: '#111827', borderRadius: 20, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: '#1F2937' },
  memberHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  onlineIndicator: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#111827' },
  memberInfo: { flex: 1 },
  memberName: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  memberRole: { color: '#9CA3AF', fontSize: 14, marginTop: 2 },
  iconButton: { backgroundColor: '#1F2937', padding: 10, borderRadius: 12 },
  accessRow: { flexDirection: 'row', marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#1F2937' },
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
  viewMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, marginTop: -5, marginBottom: 20 },
  viewMoreText: { color: '#8B5CF6', fontSize: 14, fontWeight: 'bold', marginRight: 6 },

  // Invite Button & Modal
  addButton: { flexDirection: 'row', backgroundColor: '#8B5CF6', position: 'absolute', bottom: 30, alignSelf: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 10, marginBottom: 20, fontSize: 15 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#111827', borderRadius: 24, padding: 25, width: '100%', borderWidth: 1, borderColor: '#1F2937' },
  modalTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  modalSubtitle: { color: '#9CA3AF', fontSize: 14, marginBottom: 25, lineHeight: 20 },
  inputLabel: { color: '#9CA3AF', fontSize: 13, fontWeight: '700', marginBottom: 8, marginLeft: 2, textTransform: 'uppercase' },
  textInput: { backgroundColor: '#0B0F19', color: '#FFFFFF', borderRadius: 12, padding: 15, borderWidth: 1, borderColor: '#374151', marginBottom: 20, fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15, marginTop: 10 },
  cancelButton: { paddingVertical: 12, paddingHorizontal: 20, justifyContent: 'center' },
  cancelButtonText: { color: '#9CA3AF', fontSize: 16, fontWeight: 'bold' },
  saveButton: { backgroundColor: '#8B5CF6', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 14, justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
});