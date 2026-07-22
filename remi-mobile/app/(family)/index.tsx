import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
  Alert,
  Linking,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function FamilyDashboardScreen() {
  const router = useRouter();

  // --- SOS EMERGENCY FUNCTION ---
  const handleSOS = () => {
    const emergencyNumber = '911'; // Update to local emergency or doctor's number if needed

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#050505" />
      
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Sarah</Text>
            <Text style={styles.subtitle}>Family Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.profileButton} onPress={() => router.push('/settings')}>
            <Ionicons name="person-outline" size={20} color="#D1D5DB" />
          </TouchableOpacity>
        </View>

        {/* --- PATIENT STATUS CARD --- */}
        <View style={styles.patientCard}>
          <View style={styles.patientLeft}>
            <View style={styles.patientAvatar}>
              <Text style={styles.patientAvatarText}>M</Text>
            </View>
            <View>
              <Text style={styles.patientName}>Mary</Text>
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
          {/* Vault Button */}
          <TouchableOpacity 
            style={styles.actionItem} 
            onPress={() => router.push('/(family)/vault')} // Ready for the Vault screen!
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="images" size={28} color="#A78BFA" />
            </View>
            <Text style={styles.actionLabel}>Vault</Text>
          </TouchableOpacity>

          {/* Care Team Button */}
          <TouchableOpacity 
            style={styles.actionItem}
            onPress={() => router.push('/(family)/careteam')}
          >
            <View style={[styles.actionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="people" size={28} color="#34D399" />
            </View>
            <Text style={styles.actionLabel}>Care Team</Text>
          </TouchableOpacity>

          {/* SOS Button */}
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
          <Text style={styles.sectionTimestamp}>Updated 10m ago</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsScroll}>
          
          {/* Vibe Check Card */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightEmoji}>🙂</Text>
              <Text style={styles.insightCardTitle}>Vibe Check</Text>
            </View>
            <Text style={styles.insightMainText}>Calm & Conversational</Text>
            <Text style={styles.insightSubText}>Mary sounds relaxed today during 3 chats with Remi.</Text>
          </View>

          {/* Latest Insights Card */}
          <View style={[styles.insightCard, { marginRight: 20 }]}>
            <View style={styles.insightHeader}>
              <Ionicons name="chatbubble" size={16} color="#A78BFA" style={{ marginRight: 8 }} />
              <Text style={styles.insightCardTitle}>Latest Insights</Text>
            </View>
            <Text style={styles.insightSubText} numberOfLines={4}>
              "Remi asked about the 1985 Lake Trip. She recalled baking with Susan."
            </Text>
            <TouchableOpacity style={{ marginTop: 'auto' }}>
              <Text style={styles.insightLink}>Tap to read more</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </ScrollView>
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