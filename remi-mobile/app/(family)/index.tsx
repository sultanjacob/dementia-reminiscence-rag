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
          <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        
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

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]}>
              <Ionicons name="images" size={24} color="#8B5CF6" />
            </View>
            <Text style={styles.actionTitle}>Memory Vault</Text>
            <Text style={styles.actionDesc}>Add photos & stories</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionCard}>
            <View style={[styles.actionIconContainer, { backgroundColor: 'rgba(96, 165, 250, 0.2)' }]}>
              <Ionicons name="calendar" size={24} color="#60A5FA" />
            </View>
            <Text style={styles.actionTitle}>Routines</Text>
            <Text style={styles.actionDesc}>Manage daily schedule</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.emergencyButton}>
          <Ionicons name="warning" size={20} color="#F87171" />
          <Text style={styles.emergencyText}>Emergency Contacts</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Today's Activity</Text>
        <View style={styles.activityContainer}>
          {recentActivities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={[styles.activityIcon, { borderColor: activity.color }]}>
                <Ionicons name={activity.icon as any} size={16} color={activity.color} />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityText}>{activity.text}</Text>
                <Text style={styles.activityTime}>{activity.time}</Text>
              </View>
            </View>
          ))}
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
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    marginTop: 15,
    paddingVertical: 15,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  emergencyText: {
    color: '#F87171',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  activityContainer: {
    backgroundColor: '#110C1D',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#231A31',
  },
  activityItem: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
    backgroundColor: '#1A1325',
  },
  activityContent: {
    flex: 1,
    justifyContent: 'center',
  },
  activityText: {
    fontSize: 15,
    color: '#E2D8F0',
    lineHeight: 20,
  },
  activityTime: {
    fontSize: 12,
    color: '#8B5CF6',
    marginTop: 4,
  },
});