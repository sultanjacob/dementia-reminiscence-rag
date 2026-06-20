import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

export default function FamilyDashboard() {
  const patientName = "Mary";
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, Sarah</Text>
          <Text style={styles.subGreeting}>Family Dashboard</Text>
        </View>
        <TouchableOpacity style={styles.profileButton}>
          <Ionicons name="person-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
        {/* --- 1. AT A GLANCE (The Anchor) --- */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.patientInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{patientName[0]}</Text>
              </View>
              <View>
                <Text style={styles.patientName}>{patientName}</Text>
                <Text style={styles.statusText}>Doing well today</Text>
              </View>
            </View>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>



        {/* --- 3. SWIPEABLE INSIGHT CAROUSEL --- */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Daily Insights</Text>
          <Text style={styles.lastUpdatedText}>Updated 10m ago</Text>
        </View>

        {/* Note the horizontal ScrollView here */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          contentContainerStyle={styles.carouselContainer}
          decelerationRate="fast"
          snapToInterval={280 + 15} // Card width + gap for smooth snapping
        >
          
          {/* Insight Card 1: Vibe Check */}
          <View style={[styles.insightCard, { borderColor: 'rgba(251, 191, 36, 0.3)' }]}>
            <View style={styles.insightCardHeader}>
              <Ionicons name="happy" size={20} color="#FBBF24" />
              <Text style={styles.insightCardTitle}>Vibe Check</Text>
            </View>
            <Text style={styles.insightMainText}>Calm & Conversational</Text>
            <Text style={styles.insightSubText}>Mary sounds relaxed today during 3 chats with Remi.</Text>
          </View>

          {/* Insight Card 2: Location */}
          <View style={[styles.insightCard, { borderColor: 'rgba(52, 211, 153, 0.3)' }]}>
            <View style={styles.insightCardHeader}>
              <Ionicons name="location" size={20} color="#34D399" />
              <Text style={styles.insightCardTitle}>Safe Zone</Text>
            </View>
            <Ionicons name="home" size={32} color="#34D399" style={{ marginVertical: 10 }} />
            <Text style={styles.insightMainText}>Safely at Home</Text>
          </View>

          {/* Insight Card 3: Recent Activity */}
          <View style={[styles.insightCard, { borderColor: 'rgba(139, 92, 246, 0.3)' }]}>
            <View style={styles.insightCardHeader}>
              <Ionicons name="chatbubbles" size={20} color="#8B5CF6" />
              <Text style={styles.insightCardTitle}>Latest Chat</Text>
            </View>
            <Text style={styles.insightSubText} numberOfLines={3}>
              "Remi asked about the 1985 Lake House trip. Mary recalled baking pies with Aunt Susan."
            </Text>
            <Text style={[styles.insightSubText, { color: '#8B5CF6', marginTop: 10 }]}>Tap to read full report</Text>
          </View>

        </ScrollView>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  subGreeting: {
    fontSize: 16,
    color: '#8B5CF6',
    marginTop: 4,
    fontWeight: '500',
  },
  profileButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1A1325',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#231A31',
  },
  container: {
    flex: 1,
  },
  statusCard: {
    backgroundColor: '#110C1D',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 15,
    color: '#A396B5',
    marginTop: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 13,
    color: '#4ADE80',
    fontWeight: '700',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-evenly', // Changed from space-between
    paddingHorizontal: 10, // Reduced padding to let them spread naturally
    marginTop: 30,
    marginBottom: 10,
  },
  actionItem: {
    alignItems: 'center',
  },
  actionIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionItemText: {
    color: '#E2D8F0',
    fontSize: 13,
    fontWeight: '600',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 20,
    marginTop: 35,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lastUpdatedText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  carouselContainer: {
    paddingHorizontal: 20,
    gap: 15, // Space between cards
  },
  insightCard: {
    width: 280, // Fixed width so they peek off the edge of the screen
    backgroundColor: '#110C1D',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    justifyContent: 'center',
  },
  insightCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  insightCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  insightMainText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  insightSubText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 22,
  },
});