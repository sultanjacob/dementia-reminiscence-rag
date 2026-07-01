import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

// Mock data to visualize the UI before connecting to Supabase
const INITIAL_TEAM = [
  {
    id: '1',
    name: 'Sarah',
    role: 'Primary Caregiver',
    access: 'Full Access',
    phone: '+44 7700 900077',
    isOnline: true,
  },
  {
    id: '2',
    name: 'David',
    role: 'Son',
    access: 'Routine Editor',
    phone: '+44 7700 900088',
    isOnline: false,
  },
  {
    id: '3',
    name: 'Emma',
    role: 'Granddaughter',
    access: 'Vault Upload Only',
    phone: '+44 7700 900099',
    isOnline: false,
  },
];

export default function CareTeamScreen() {
  const router = useRouter();
  const [team, setTeam] = useState(INITIAL_TEAM);

  const renderTeamMember = ({ item }: { item: typeof INITIAL_TEAM[0] }) => (
    <View style={styles.memberCard}>
      <View style={styles.memberHeader}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
          {item.isOnline && <View style={styles.onlineIndicator} />}
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
          <Text style={styles.accessText}>{item.access}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Care Team</Text>
        <View style={{ width: 24 }} /> 
      </View>

      <View style={styles.container}>
        <Text style={styles.descriptionText}>
          Manage who has access to Remi. You can assign different permissions for editing routines or adding memories to the Vault.
        </Text>

        <FlatList
          data={team}
          keyExtractor={(item) => item.id}
          renderItem={renderTeamMember}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />

        <TouchableOpacity style={styles.addButton} activeOpacity={0.8}>
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Invite New Member</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B0F19', // Dark background matching dashboard
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1F2937',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  descriptionText: {
    color: '#9CA3AF',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 20,
    marginBottom: 20,
  },
  listContainer: {
    paddingBottom: 100, 
  },
  memberCard: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#111827',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  memberRole: {
    color: '#9CA3AF',
    fontSize: 14,
    marginTop: 2,
  },
  iconButton: {
    backgroundColor: '#1F2937',
    padding: 10,
    borderRadius: 12,
  },
  accessRow: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1F2937',
  },
  accessBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignSelf: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  accessText: {
    color: '#10B981',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  addButton: {
    flexDirection: 'row',
    backgroundColor: '#8B5CF6',
    position: 'absolute',
    bottom: 30,
    alignSelf: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});