import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

export default function PatientRoutinesScreen() {
  const [routines, setRoutines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State for the pop-up image
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      fetchRoutines();
    }, [])
  );

  const fetchRoutines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: true }); 

      if (error) throw error;
      if (data) setRoutines(data);
    } catch (error) {
      console.error("Error fetching routines:", error);
    } finally {
      setLoading(false);
    }
  };

  const getContextIcon = (title: string) => {
    const lower = String(title || '').toLowerCase();
    if (lower.includes('med') || lower.includes('pill')) return 'medkit';
    if (lower.includes('eat') || lower.includes('lunch') || lower.includes('breakfast') || lower.includes('dinner') || lower.includes('food')) return 'restaurant';
    if (lower.includes('bed') || lower.includes('sleep') || lower.includes('wake') || lower.includes('night')) return 'bed';
    if (lower.includes('water') || lower.includes('drink')) return 'water';
    if (lower.includes('bath') || lower.includes('shower') || lower.includes('wash') || lower.includes('teeth')) return 'water-outline';
    if (lower.includes('walk') || lower.includes('exercise') || lower.includes('outside')) return 'walk';
    if (lower.includes('doctor') || lower.includes('appointment')) return 'calendar';
    return 'calendar-outline'; 
  };

  const pendingRoutines = routines.filter(r => !r.is_completed);
  const completedRoutines = routines.filter(r => r.is_completed);
  
  const nextUp = pendingRoutines.length > 0 ? pendingRoutines[0] : null;
  const laterToday = pendingRoutines.slice(1);

  // Safety fallbacks to prevent "null" from showing up
  const safeTitle = (title: any) => (title && title !== 'null') ? String(title) : "Scheduled Task";
  const safeTime = (time: any) => (time && time !== 'null') ? String(time) : "Anytime";

  const handleImageTap = (url: string) => {
    Haptics.selectionAsync();
    setExpandedImage(url);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.appCapsule}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Today's Plan</Text>
          <Text style={styles.headerSubtitle}>Here is what is happening today.</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
          ) : (
            <View>
              {routines.length === 0 ? (
                <Text style={styles.emptyText}>Nothing scheduled for today.</Text>
              ) : (
                <>
                  {/* 1. NEXT UP SPOTLIGHT CARD (Read Only) */}
                  {nextUp && (
                    <View style={styles.nextUpContainer}>
                      <Text style={styles.sectionLabel}>HAPPENING NOW / NEXT</Text>
                      <View style={styles.nextUpCard}>
                        {nextUp.image_url ? (
                          <TouchableOpacity activeOpacity={0.8} onPress={() => handleImageTap(nextUp.image_url)}>
                            <Image source={{ uri: nextUp.image_url }} style={styles.nextUpImage} />
                          </TouchableOpacity>
                        ) : (
                          <View style={styles.nextUpIconPlaceholder}>
                            <Ionicons name={getContextIcon(nextUp.title)} size={60} color="#8B5CF6" />
                          </View>
                        )}
                        
                        <View style={styles.nextUpContent}>
                          <Text style={styles.nextUpTime}>{safeTime(nextUp.time_string)}</Text>
                          <Text style={styles.nextUpTitle}>{safeTitle(nextUp.title)}</Text>
                        </View>
                      </View>
                    </View>
                  )}

                  {/* 2. LATER TODAY LIST (Read Only) */}
                  {laterToday.length > 0 && (
                    <View style={styles.listSection}>
                      <Text style={styles.sectionLabel}>LATER TODAY</Text>
                      {laterToday.map(routine => (
                        <View key={routine.id} style={styles.listCard}>
                          {routine.image_url ? (
                            <TouchableOpacity activeOpacity={0.8} onPress={() => handleImageTap(routine.image_url)}>
                              <Image source={{ uri: routine.image_url }} style={styles.listThumbnail} />
                            </TouchableOpacity>
                          ) : (
                            <View style={styles.iconCirclePurple}>
                              <Ionicons name={getContextIcon(routine.title)} size={24} color="#8B5CF6" />
                            </View>
                          )}
                          <View style={styles.listTextContainer}>
                            <Text style={styles.listTime}>{safeTime(routine.time_string)}</Text>
                            <Text style={styles.listTitle}>{safeTitle(routine.title)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* 3. COMPLETED LIST (Read Only) */}
                  {completedRoutines.length > 0 && (
                    <View style={styles.listSection}>
                      <Text style={styles.sectionLabel}>FINISHED</Text>
                      {completedRoutines.map(routine => (
                        <View key={routine.id} style={[styles.listCard, styles.listCardCompleted]}>
                          <View style={styles.iconCircleGreen}>
                            <Ionicons name="checkmark" size={24} color="#10B981" />
                          </View>
                          <View style={styles.listTextContainer}>
                            <Text style={[styles.listTime, styles.textStrikethrough]}>{safeTime(routine.time_string)}</Text>
                            <Text style={[styles.listTitle, styles.textStrikethrough]}>{safeTitle(routine.title)}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                  
                  {!nextUp && completedRoutines.length > 0 && (
                     <View style={styles.allDoneContainer}>
                        <Ionicons name="partly-sunny" size={60} color="#F59E0B" style={{ marginBottom: 15 }} />
                        <Text style={styles.allDoneTitle}>All done for now!</Text>
                        <Text style={styles.allDoneSubtitle}>You have completed all your tasks.</Text>
                     </View>
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      {/* MODAL TO POP-UP THE IMAGE */}
      <Modal visible={!!expandedImage} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.imageCapsule}>
            <TouchableOpacity onPress={() => setExpandedImage(null)} style={styles.closeImageButton} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
              <Ionicons name="close-circle" size={36} color="#FFFFFF" />
            </TouchableOpacity>
            {expandedImage && (
              <Image source={{ uri: expandedImage }} style={styles.largeExpandedImage} />
            )}
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, backgroundColor: '#FAFAFA', borderRadius: 35, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  header: { paddingHorizontal: 25, paddingTop: 30, paddingBottom: 20 },
  headerTitle: { fontSize: 32, fontWeight: '900', color: '#111827', marginBottom: 6 },
  headerSubtitle: { fontSize: 16, fontWeight: '700', color: '#8B5CF6' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 50 },
  emptyText: { textAlign: 'center', fontSize: 18, color: '#9CA3AF', marginTop: 40, fontWeight: '600' },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: '#9CA3AF', letterSpacing: 1.5, marginBottom: 10, marginTop: 10 },
  
  nextUpContainer: { marginBottom: 25 },
  nextUpCard: { backgroundColor: '#FFFFFF', borderRadius: 28, overflow: 'hidden', borderWidth: 2, borderColor: '#8B5CF6', shadowColor: '#8B5CF6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 15, elevation: 8 },
  nextUpImage: { width: '100%', height: 220, resizeMode: 'cover', backgroundColor: '#F3F4F6' },
  nextUpIconPlaceholder: { width: '100%', height: 140, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center' },
  nextUpContent: { padding: 24 },
  nextUpTime: { fontSize: 20, fontWeight: '800', color: '#8B5CF6', marginBottom: 4 },
  nextUpTitle: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
  
  listSection: { marginBottom: 25 },
  listCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 18, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 5, elevation: 2 },
  listCardCompleted: { backgroundColor: '#F9FAFB', borderColor: '#F3F4F6' },
  iconCirclePurple: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F5F3FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  iconCircleGreen: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  listThumbnail: { width: 56, height: 56, borderRadius: 28, marginRight: 16, backgroundColor: '#F3F4F6' },
  listTextContainer: { flex: 1 },
  listTime: { fontSize: 16, fontWeight: '800', color: '#8B5CF6', marginBottom: 4 },
  listTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  textStrikethrough: { textDecorationLine: 'line-through', color: '#9CA3AF' },
  
  allDoneContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 30, padding: 30, backgroundColor: '#FFFBEB', borderRadius: 30, borderWidth: 1, borderColor: '#FDE68A' },
  allDoneTitle: { fontSize: 24, fontWeight: 'bold', color: '#B45309', marginBottom: 8 },
  allDoneSubtitle: { fontSize: 16, color: '#D97706', fontWeight: '600', textAlign: 'center' },

  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.85)', justifyContent: 'center', alignItems: 'center' },
  imageCapsule: { width: '90%', height: '70%', alignItems: 'center', justifyContent: 'center' },
  closeImageButton: { position: 'absolute', top: -15, right: -15, zIndex: 10 },
  largeExpandedImage: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 24 },
});