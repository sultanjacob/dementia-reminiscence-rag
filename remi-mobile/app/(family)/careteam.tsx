import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase'; // Adjust this path if your supabase client is located elsewhere

export default function CareTeamScreen() {
  const router = useRouter();
  const [team, setTeam] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCareTeam();
  }, []);

  const fetchCareTeam = async () => {
    try {
      setIsLoading(true);
      // Fetching all members from the new table
      const { data, error } = await supabase
        .from('care_team')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data) setTeam(data);
      
    } catch (error: any) {
      console.error("Error fetching care team:", error);
      Alert.alert("Error", "Could not load the care team.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderTeamMember = ({ item }: { item: any }) => (
    <View style={styles.memberCard}>
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

        {isLoading ? (
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={team}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderTeamMember}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No care team members found.</Text>
            }
          />
        )}

        <TouchableOpacity 
          style={styles.addButton} 
          activeOpacity={0.8}
          onPress={() => Alert.alert("Coming Soon", "We will wire up the invite modal next!")}
        >
          <Ionicons name="person-add" size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Invite New Member</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0B0F19', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#1F2937' },
  backButton: { padding: 8, marginLeft: -8 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#FFFFFF' },
  container: { flex: 1, paddingHorizontal: 20 },
  descriptionText: { color: '#9CA3AF', fontSize: 14, lineHeight: 20, marginTop: 20, marginBottom: 20 },
  listContainer: { paddingBottom: 100 },
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
  addButton: { flexDirection: 'row', backgroundColor: '#8B5CF6', position: 'absolute', bottom: 30, alignSelf: 'center', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 30, alignItems: 'center', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  emptyText: { color: '#9CA3AF', textAlign: 'center', marginTop: 20, fontSize: 16 }
});