import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
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
  
  const [userName, setUserName] = useState("Sarah");
  const [patientName, setPatientName] = useState("Mary");
  const [latestLog, setLatestLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [])
  );

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch Profile Names
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, nickname')
        .eq('id', user.id)
        .single();
        
      if (profile) {
        if (profile.full_name) setUserName(profile.full_name.split(' ')[0]);
        if (profile.nickname) setPatientName(profile.nickname);
      }

      // Fetch the most recent shift log
      const { data: logData } = await supabase
        .from('shift_logs')
        .select('*')
        .eq('patient_id', user.id)
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

  const getVibeEmoji = (vibe: string) => {
    if (!vibe) return "🙂";
    if (vibe.includes('Calm')) return "🙂";
    if (vibe.includes('Energetic')) return "🌟";
    if (vibe.includes('Anxious')) return "😟";
    if (vibe.includes('Tired')) return "😴";
    return "🙂";
  };

  // Helper to format the time since the log was posted
  const getLogTime = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return `Updated ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0F0F14" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* HEADER SECTION */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hello, {userName}</Text>
            <Text style={styles.subGreeting}>Family Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/settings')}>
            <Ionicons name="person-outline" size={24} color="#A78BFA" />
          </TouchableOpacity>
        </View>

        {/* PATIENT STATUS CARD */}
        <View style={styles.patientCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{patientName.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.patientName}>{patientName}</Text>
            <Text style={styles.patientStatus}>Doing well today</Text>
          </View>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Online</Text>
          </View>
        </View>

        {/* QUICK ACTION BUTTONS */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(family)/vault')}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="images" size={32} color="#A78BFA" />
            </View>
            <Text style={styles.actionText}>Vault</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="people" size={32} color="#10B981" />
            </View>
            <Text style={styles.actionText}>Care Team</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
              <Ionicons name="warning" size={32} color="#EF4444" />
            </View>
            <Text style={styles.actionText}>SOS</Text>
          </TouchableOpacity>
        </View>

        {/* DAILY INSIGHTS SECTION */}
        <View style={styles.insightsHeader}>
          <Text style={styles.sectionTitle}>Daily Insights</Text>
          <Text style={styles.updatedText}>
            {latestLog ? getLogTime(latestLog.created_at) : 'No updates yet'}
          </Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#A78BFA" style={{ marginTop: 20 }} />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.insightsScroll}>
            
            {/* VIBE CHECK CARD */}
            <View style={styles.insightCard}>
              <View style={styles.insightCardHeader}>
                <Text style={styles.insightCardEmoji}>{getVibeEmoji(latestLog?.vibe)}</Text>
                <Text style={styles.insightCardLabel}>Vibe Check</Text>
              </View>
              <Text style={styles.insightCardValue}>
                {latestLog ? latestLog.vibe : "Awaiting Info"}
              </Text>
              <Text style={styles.insightCardSubtext}>
                {latestLog ? `Logged by ${latestLog.caregiver_name}` : "Check back after the caregiver ends their shift."}
              </Text>
            </View>

            {/* LATEST INSIGHTS CARD */}
            <View style={[styles.insightCard, { backgroundColor: '#1A1A24', borderColor: '#2D2D3D' }]}>
              <View style={styles.insightCardHeader}>
                <Ionicons name="chatbubble" size={20} color="#A78BFA" style={{ marginRight: 8 }} />
                <Text style={styles.insightCardLabel}>Latest Insights</Text>
              </View>
              <Text style={styles.insightCardQuote} numberOfLines={4}>
                {latestLog && latestLog.notes ? `"${latestLog.notes}"` : "No notes have been added yet."}
              </Text>
              {latestLog && latestLog.notes && (
                <TouchableOpacity style={{ marginTop: 'auto' }}>
                  <Text style={styles.readMoreText}>Tap to read more</Text>
                </TouchableOpacity>
              )}
            </View>

          </ScrollView>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0F0F14', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 20 },
  
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  greeting: { fontSize: 32, fontWeight: 'bold', color: '#FFFFFF' },
  subGreeting: { fontSize: 18, color: '#A78BFA', fontWeight: '600' },
  profileButton: { width: 50, height: 50, borderRadius: 25, borderWidth: 1, borderColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  
  // Patient Card
  patientCard: { flexDirection: 'row', backgroundColor: '#1A1A24', borderRadius: 24, padding: 20, alignItems: 'center', marginBottom: 40 },
  avatarCircle: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#A78BFA', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  patientName: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 4 },
  patientStatus: { fontSize: 15, color: '#9CA3AF' },
  onlineBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
  onlineText: { color: '#10B981', fontWeight: 'bold', fontSize: 13 },
  
  // Quick Actions
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 40 },
  actionItem: { alignItems: 'center' },
  actionIconCircle: { width: 70, height: 70, borderRadius: 35, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  actionText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  
  // Insights Section
  insightsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  sectionTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFFFFF' },
  updatedText: { fontSize: 14, color: '#6B7280', marginBottom: 4 },
  
  insightsScroll: { gap: 15 },
  insightCard: { width: 220, backgroundColor: '#15151D', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: '#1F1F2E' },
  insightCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  insightCardEmoji: { fontSize: 18, marginRight: 8 },
  insightCardLabel: { fontSize: 16, fontWeight: 'bold', color: '#FFFFFF' },
  insightCardValue: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 15, lineHeight: 30 },
  insightCardSubtext: { fontSize: 14, color: '#9CA3AF', lineHeight: 22 },
  
  insightCardQuote: { fontSize: 16, color: '#9CA3AF', lineHeight: 24, fontStyle: 'italic', marginBottom: 15 },
  readMoreText: { color: '#A78BFA', fontWeight: 'bold', fontSize: 14 },
});