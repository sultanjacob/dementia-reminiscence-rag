import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

export default function FamilyDashboardScreen() {
  const router = useRouter();

  // --- STATE ---
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  
  // Dynamic Data State
  const [userName, setUserName] = useState("Sarah");
  const [patientName, setPatientName] = useState("Mary");
  const [latestLog, setLatestLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // --- FETCH DYNAMIC DATA ---
  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  // The "async" here is crucial so we can use "await" inside!
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Fetch Profile Names
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, nickname')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        if (profile.full_name) setUserName(profile.full_name.split(' ')[0]);
        if (profile.nickname) setPatientName(profile.nickname);
      }

      // 2. Fetch the most recent shift log
      // (No strict patient_id filter, so it successfully grabs the Caregiver's log!)
      const { data: logData } = await supabase
        .from('shift_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (logData) {
        setLatestLog(logData);
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- SOS EMERGENCY FUNCTION ---
  const handleSOS = () => {
    const emergencyNumber = '911'; 

    Alert.alert(
      "⚠️ EMERGENCY SOS",
      `Are you sure you want to call ${emergencyNumber}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Call Now", 
          style: "destructive",
          onPress: () => {
            Linking.openURL(`tel:${emergencyNumber}`).catch(() => {
              Alert.alert("Error", "Could not open the phone dialer.");
            });
          }
        }
      ]
    );
  };

  // --- SECURE SIGN OUT FUNCTION ---
  const handleSignOut = async () => {
    setIsMenuVisible(false);
    
    setTimeout(async () => {
      const { error } = await supabase.auth.signOut();
      if (error) {
        Alert.alert("Sign Out Error", error.message);
      } else {
        router.replace('/login'); 
      }
    }, 500);
  };

  // --- HELPER FUNCTIONS FOR INSIGHTS ---
  const getVibeEmoji = (vibe: string) => {
    if (!vibe) return "🙂";
    if (vibe.includes('Calm')) return "🙂";
    if (vibe.includes('Energetic')) return "🌟";
    if (vibe.includes('Anxious')) return "😟";
    if (vibe.includes('Tired')) return "😴";
    return "🙂";
  };

  const getLogTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}</Text>
            <Text style={styles.subtitle}>Family Dashboard</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.profileButton} 
            onPress={() => setIsMenuVisible(true)}
          >
            <Ionicons name="person-outline" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* --- PATIENT STATUS CARD --- */}
        <View style={styles.patientCard}>
          <View style={styles.patientLeft}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientAvatarText}>{patientName.charAt(0)}</Text>
            </View>
            <View>
              <Text style={styles.patientName}>{patientName}</Text>
              <Text style={styles.patientStatus}>Doing well today</Text>
            </View>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        {/* --- ACTION BUTTONS (Vault, Care Team, SOS) --- */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(family)/vault')}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="images" size={28} color="#A78BFA" />
            </View>
            <Text style={styles.actionLabel}>Vault</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(family)/careteam')}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="people" size={28} color="#34D399" />
            </View>
            <Text style={styles.actionLabel}>Care Team</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={handleSOS}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="warning" size={28} color="#F87171" />
            </View>
            <Text style={styles.actionLabel}>SOS</Text>
          </TouchableOpacity>
        </View>

        {/* --- DAILY INSIGHTS SECTION --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Insights</Text>
          <Text style={styles.sectionTimestamp}>
            {latestLog ? getLogTime(latestLog.created_at) : 'No updates yet'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#A78BFA" style={{ marginTop: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsScroll}>
            
            {/* Vibe Check Card */}
            <View style={styles.insightCard}>
              <View style={styles.insightHeader}>
                <Text style={styles.insightEmoji}>{getVibeEmoji(latestLog?.vibe)}</Text>
                <Text style={styles.insightCardTitle}>Vibe Check</Text>
              </View>
              <Text style={styles.insightMainText}>
                {latestLog ? latestLog.vibe : "Awaiting Info"}
              </Text>
              <Text style={styles.insightSubText}>
                {latestLog ? `Logged by ${latestLog.caregiver_name}` : "Check back after the caregiver ends their shift."}
              </Text>
            </View>

            {/* Latest Insights Card */}
            <View style={[styles.insightCard, { marginRight: 20 }]}>
              <View style={styles.insightHeader}>
                <Ionicons name="chatbubble" size={16} color="#A78BFA" style={{ marginRight: 8 }} />
                <Text style={styles.insightCardTitle}>Latest Insights</Text>
              </View>
              <Text style={styles.insightSubText} numberOfLines={4}>
                {latestLog && latestLog.notes ? `"${latestLog.notes}"` : "No notes have been added yet."}
              </Text>
              {latestLog && latestLog.notes && (
                <TouchableOpacity style={{ marginTop: 'auto' }}>
                  <Text style={styles.insightLink}>Tap to read more</Text>
                </TouchableOpacity>
              )}
            </View>

          </ScrollView>
        )}
      </ScrollView>

      {/* --- TOP RIGHT DROPDOWN MENU MODAL --- */}
      <Modal visible={isMenuVisible} transparent={true} animationType="fade">
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setIsMenuVisible(false)}
        >
          <View style={styles.dropdownMenu}>
            
            <TouchableOpacity 
              style={styles.menuItem} 
              onPress={() => {
                setIsMenuVisible(false);
                router.push('/settings');
              }}
            >
              <Ionicons name="settings-outline" size={20} color="#D1D5DB" style={styles.menuIcon} />
              <Text style={styles.menuText}>App Settings</Text>
            </TouchableOpacity>
            
            <View style={styles.menuDivider} />

            <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
              <Ionicons name="log-out-outline" size={20} color="#EF4444" style={styles.menuIcon} />
              <Text style={[styles.menuText, { color: '#EF4444' }]}>Sign Out</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#050505', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  greeting: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  subtitle: { fontSize: 16, color: '#A78BFA', marginTop: 4, fontWeight: '600' },
  profileButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: '#374151', alignItems: 'center', justifyContent: 'center' },

  // Dropdown Menu Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'flex-end', paddingTop: Platform.OS === 'ios' ? 70 : 80, paddingRight: 20 },
  dropdownMenu: { backgroundColor: '#13111C', borderRadius: 16, padding: 8, width: 200, borderWidth: 1, borderColor: '#374151', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12 },
  menuIcon: { marginRight: 12 },
  menuText: { color: '#FFFFFF', fontSize: 16, fontWeight: '500' },
  menuDivider: { height: 1, backgroundColor: '#374151', marginVertical: 4 },

  // Patient Card
  patientCard: { flexDirection: 'row', backgroundColor: '#13111C', borderRadius: 20, padding: 20, alignItems: 'center', justifyContent: 'space-between', marginBottom: 35 },
  patientLeft: { flexDirection: 'row', alignItems: 'center' },
  patientAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  patientAvatarText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF' },
  patientName: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  patientStatus: { fontSize: 14, color: '#9CA3AF' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  onlineText: { color: '#10B981', fontSize: 12, fontWeight: 'bold' },

  // Action Buttons
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 40 },
  actionItem: { alignItems: 'center' },
  actionIconCircle: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  actionLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  // Daily Insights
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  sectionTimestamp: { fontSize: 13, color: '#6B7280', marginBottom: 2 },
  
  insightsScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
  insightCard: { width: 220, backgroundColor: '#13111C', borderRadius: 20, padding: 20, marginRight: 15, minHeight: 180 },
  insightHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  insightEmoji: { fontSize: 16, marginRight: 8 },
  insightCardTitle: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  insightMainText: { fontSize: 20, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10 },
  insightSubText: { fontSize: 14, color: '#9CA3AF', lineHeight: 22 },
  insightLink: { color: '#A78BFA', fontSize: 14, fontWeight: 'bold', marginTop: 15 },
});