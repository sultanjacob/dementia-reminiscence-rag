import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function FamilyDashboard() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* --- 1. HEADER & STATUS CARD --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, Sarah</Text>
            <Text style={styles.subtitle}>Family Dashboard</Text>
          </View>
          <TouchableOpacity style={styles.profileButton}>
            <Ionicons name="person-outline" size={24} color="#E5E7EB" />
          </TouchableOpacity>
        </View>

        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>M</Text>
            </View>
            <View style={styles.statusInfo}>
              <Text style={styles.patientName}>Mary</Text>
              <Text style={styles.patientStatus}>Doing well today</Text>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>

        {/* --- 2. COMPACT ACTION BAR --- */}
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(family)/vault')}>
            <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="images" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.actionItemText}>Vault</Text>
          </TouchableOpacity>

          {/* EXACT ROUTE FIX APPLIED HERE */}
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(family)/careteam')}>
            <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
              <Ionicons name="people" size={24} color="#34D399" />
            </View>
            <Text style={styles.actionItemText}>Care Team</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem}>
            <View style={[styles.actionIconBadge, { backgroundColor: 'rgba(248, 113, 113, 0.15)' }]}>
              <Ionicons name="warning" size={24} color="#F87171" />
            </View>
            <Text style={styles.actionItemText}>SOS</Text>
          </TouchableOpacity>
        </View>

        {/* --- 3. DAILY INSIGHTS --- */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Insights</Text>
          <Text style={styles.sectionSubtitle}>Updated 10m ago</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.insightsScroll}>
          {/* Insight Card 1 */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Text style={styles.insightEmoji}>🙂</Text>
              <Text style={styles.insightTitle}>Vibe Check</Text>
            </View>
            <Text style={styles.insightHighlight}>Calm & Conversational</Text>
            <Text style={styles.insightDesc}>Mary sounds relaxed today during 3 chats with Remi.</Text>
          </View>

          {/* Insight Card 2 */}
          <View style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons name="chatbubble" size={16} color="#8B5CF6" style={{ marginRight: 8 }} />
              <Text style={styles.insightTitle}>Latest Chat</Text>
            </View>
            <Text style={styles.insightDesc}>"Remi asked about the amazing 1985 Lake House trip. Mary recalled baking pies with Aunt Susan."</Text>
            <Text style={styles.insightLink}>Tap to read full report</Text>
          </View>
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#8B5CF6',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#110C1D',
    borderWidth: 1,
    borderColor: '#231A31',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCard: {
    backgroundColor: '#110C1D',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statusInfo: {
    flex: 1,
  },
  patientName: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  patientStatus: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34D399',
    marginRight: 6,
  },
  onlineText: {
    color: '#34D399',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', 
    marginTop: 30,
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionItemText: {
    color: '#E5E7EB',
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  sectionSubtitle: {
    color: '#6B7280',
    fontSize: 12,
  },
  insightsScroll: {
    marginLeft: -20,
    paddingLeft: 20,
  },
  insightCard: {
    backgroundColor: '#110C1D',
    borderRadius: 20,
    padding: 20,
    width: 260,
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightEmoji: {
    fontSize: 16,
    marginRight: 8,
  },
  insightTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  insightHighlight: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  insightDesc: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
  },
  insightLink: {
    color: '#8B5CF6',
    fontSize: 14,
    marginTop: 15,
    fontWeight: '500',
  },
});