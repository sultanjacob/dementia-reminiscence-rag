import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
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
  
  // State to track which dropdown is currently open
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    // If it's already open, close it. Otherwise, open the clicked one.
    setExpandedSection(prev => prev === section ? null : section);
  };

  const recentActivities = [
    { id: 1, time: "2:30 PM", text: "Remi asked about the 1985 Lake House trip.", icon: "image-outline", color: "#4ADE80" },
    { id: 2, time: "1:00 PM", text: "Completed afternoon medication routine.", icon: "checkmark-circle-outline", color: "#60A5FA" },
    { id: 3, time: "10:15 AM", text: "Listened to 'Here Comes the Sun'.", icon: "musical-notes-outline", color: "#FBBF24" },
  ];

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
        
        {/* --- AT A GLANCE --- */}
        <Text style={styles.sectionTitle}>At a Glance</Text>
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
          <View style={styles.divider} />
          <Text style={styles.lastInteraction}>
            <Ionicons name="time-outline" size={14} color="#A396B5" /> Last active: 10 minutes ago
          </Text>
        </View>

        {/* --- QUICK ACTIONS --- */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Ionicons name="images" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.actionTitle}>Memory Vault</Text>
            <Text style={styles.actionDesc}>Add photos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(96, 165, 250, 0.2)' }]}>
              <Ionicons name="calendar" size={24} color="#60A5FA" />
            </View>
            <Text style={styles.actionTitle}>Routines</Text>
            <Text style={styles.actionDesc}>Manage schedule</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.emergencyButton}>
          <Ionicons name="warning" size={20} color="#F87171" />
          <Text style={styles.emergencyText}>Emergency Contacts</Text>
        </TouchableOpacity>

        {/* --- CARE INSIGHTS (EXPANDABLE DROPDOWNS) --- */}
        <Text style={styles.sectionTitle}>Care Insights</Text>
        <View style={styles.accordionContainer}>
          
          {/* 1. Vibe Check */}
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('vibe')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                <Ionicons name="happy" size={20} color="#FBBF24" />
              </View>
              <Text style={styles.accordionTitle}>Daily Vibe Check</Text>
            </View>
            <Ionicons name={expandedSection === 'vibe' ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
          </TouchableOpacity>
          {expandedSection === 'vibe' && (
            <View style={styles.accordionContent}>
              <Text style={styles.insightText}>Mary is feeling <Text style={{color: '#4ADE80', fontWeight: 'bold'}}>Calm and Conversational</Text> today.</Text>
              <Text style={styles.insightSubtext}>Based on vocal tone and word choice during 3 interactions with Remi.</Text>
            </View>
          )}
          <View style={styles.accordionDivider} />

          {/* 2. Remi's Report */}
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('report')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
                <Ionicons name="chatbubbles" size={20} color="#8B5CF6" />
              </View>
              <Text style={styles.accordionTitle}>Remi's Activity Report</Text>
            </View>
            <Ionicons name={expandedSection === 'report' ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
          </TouchableOpacity>
          {expandedSection === 'report' && (
            <View style={styles.accordionContent}>
              {recentActivities.map((activity) => (
                <View key={activity.id} style={styles.activityItem}>
                  <Ionicons name={activity.icon as any} size={16} color={activity.color} style={{marginTop: 2, marginRight: 10}} />
                  <View style={{flex: 1}}>
                    <Text style={styles.activityText}>{activity.text}</Text>
                    <Text style={styles.activityTime}>{activity.time}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
          <View style={styles.accordionDivider} />

          {/* 3. Safe Zone Location */}
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('location')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
                <Ionicons name="location" size={20} color="#34D399" />
              </View>
              <Text style={styles.accordionTitle}>Safe Zone Status</Text>
            </View>
            <Ionicons name={expandedSection === 'location' ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
          </TouchableOpacity>
          {expandedSection === 'location' && (
            <View style={styles.accordionContent}>
              <View style={styles.mapMockup}>
                <Ionicons name="home" size={24} color="#34D399" />
                <Text style={styles.mapText}>Device is safely at home</Text>
              </View>
              <Text style={styles.insightSubtext}>Last updated 5 minutes ago</Text>
            </View>
          )}
          <View style={styles.accordionDivider} />

          {/* 4. Care Team Notes */}
          <TouchableOpacity style={styles.accordionHeader} onPress={() => toggleSection('notes')} activeOpacity={0.7}>
            <View style={styles.accordionHeaderLeft}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(96, 165, 250, 0.15)' }]}>
                <Ionicons name="people" size={20} color="#60A5FA" />
              </View>
              <Text style={styles.accordionTitle}>Care Team Notes</Text>
            </View>
            <Ionicons name={expandedSection === 'notes' ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
          </TouchableOpacity>
          {expandedSection === 'notes' && (
            <View style={styles.accordionContent}>
              <View style={styles.noteBubble}>
                <Text style={styles.noteAuthor}>David (Brother)</Text>
                <Text style={styles.noteText}>Mom was a bit tired this morning, let her sleep in tomorrow before her meds.</Text>
                <Text style={styles.noteTime}>Yesterday, 8:45 PM</Text>
              </View>
              <TouchableOpacity style={styles.addNoteButton}>
                <Text style={styles.addNoteText}>+ Add Note</Text>
              </TouchableOpacity>
            </View>
          )}

        </View>

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
    paddingVertical: 15,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  subGreeting: {
    fontSize: 16,
    color: '#8B5CF6',
    marginTop: 4,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1325',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#231A31',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#E2D8F0',
    marginTop: 25,
    marginBottom: 15,
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#8B5CF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  patientName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  statusText: {
    fontSize: 14,
    color: '#A396B5',
    marginTop: 4,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 222, 128, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
    marginRight: 6,
  },
  onlineText: {
    fontSize: 12,
    color: '#4ADE80',
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: '#231A31',
    marginVertical: 15,
  },
  lastInteraction: {
    fontSize: 13,
    color: '#A396B5',
  },
  actionGrid: {
    flexDirection: 'row',
    gap: 15,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#110C1D',
    borderRadius: 20,
    padding: 15,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionDesc: {
    fontSize: 12,
    color: '#A396B5',
  },
  emergencyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.05)',
    marginTop: 15,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.2)',
  },
  emergencyText: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  // --- NEW ACCORDION STYLES ---
  accordionContainer: {
    backgroundColor: '#110C1D',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#231A31',
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    backgroundColor: '#110C1D',
  },
  accordionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  accordionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E2D8F0',
  },
  accordionDivider: {
    height: 1,
    backgroundColor: '#231A31',
    marginHorizontal: 18,
  },
  accordionContent: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 5,
    backgroundColor: '#110C1D',
  },
  insightText: {
    color: '#D1D5DB',
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  insightSubtext: {
    color: '#6B7280',
    fontSize: 12,
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  activityText: {
    fontSize: 14,
    color: '#D1D5DB',
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  mapMockup: {
    backgroundColor: '#1A1325',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  mapText: {
    color: '#34D399',
    fontWeight: '600',
    marginTop: 10,
  },
  noteBubble: {
    backgroundColor: '#1A1325',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#231A31',
    marginBottom: 10,
  },
  noteAuthor: {
    color: '#60A5FA',
    fontWeight: '600',
    fontSize: 13,
    marginBottom: 4,
  },
  noteText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteTime: {
    color: '#6B7280',
    fontSize: 11,
  },
  addNoteButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  addNoteText: {
    color: '#8B5CF6',
    fontWeight: '600',
  }
});