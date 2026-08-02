import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
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

export default function PatientGalleryScreen() {
  const router = useRouter();
  
  // --- STATE ---
  const [currentTab, setCurrentTab] = useState<'photos' | 'voices' | 'music'>('photos');
  const [loading, setLoading] = useState(true);

  const [photos, setPhotos] = useState<any[]>([]);
  const [voices, setVoices] = useState<any[]>([]);
  const [music, setMusic] = useState<any[]>([]);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null); // Tracks which audio is currently playing

  useEffect(() => {
    fetchMemories();
    
    // Cleanup audio when leaving screen
    return () => {
      if (sound) sound.unloadAsync().catch(() => {});
    };
  }, [sound]);

  const fetchMemories = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('memory_vault')
        .select('*')
        .eq('patient_code', user.id) // Get everything sent to Mary
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        // Smart Filtering (Exactly like the family side!)
        setPhotos(data.filter(item => item.image_url !== null));
        setVoices(data.filter(item => item.image_url === null && item.audio_url !== null && !item.caption?.includes('[MUSIC')));
        setMusic(data.filter(item => item.audio_url !== null && item.caption?.includes('[MUSIC')));
      }
    } catch (error) {
      console.error("Error fetching patient memories:", error);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (url: string, id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // If something is already playing, stop it first
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
      }
      
      // If the user tapped the button that was ALREADY playing, just stop it and return
      if (playingId === id) {
        setPlayingId(null);
        return; 
      }

      // Otherwise, play the new audio
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true }
      );
      
      setSound(newSound);
      setPlayingId(id);

      // Auto-reset button when audio finishes
      newSound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.didJustFinish) {
          setPlayingId(null);
        }
      });

    } catch (error) {
      console.error("Audio playback failed", error);
    }
  };

  const handleTabSwitch = (tab: 'photos' | 'voices' | 'music') => {
    Haptics.selectionAsync();
    setCurrentTab(tab);
    // Stop any playing audio if she switches tabs
    if (sound) {
      sound.stopAsync().catch(()=>{});
      setPlayingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F6" />
      
      <View style={styles.appCapsule}>
        
        {/* --- HEADER --- */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={32} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Memories</Text>
          <View style={{ width: 50 }} /> {/* Spacer for centering */}
        </View>

        {/* --- BIG ACCESSIBLE TABS --- */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tabButton, currentTab === 'photos' && styles.activeTabButton]} 
            onPress={() => handleTabSwitch('photos')}
          >
            <Ionicons name="images" size={24} color={currentTab === 'photos' ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.tabText, currentTab === 'photos' && styles.activeTabText]}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, currentTab === 'voices' && styles.activeTabButton]} 
            onPress={() => handleTabSwitch('voices')}
          >
            <Ionicons name="mic" size={24} color={currentTab === 'voices' ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.tabText, currentTab === 'voices' && styles.activeTabText]}>Voices</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.tabButton, currentTab === 'music' && styles.activeTabButton]} 
            onPress={() => handleTabSwitch('music')}
          >
            <Ionicons name="musical-notes" size={24} color={currentTab === 'music' ? "#FFFFFF" : "#6B7280"} />
            <Text style={[styles.tabText, currentTab === 'music' && styles.activeTabText]}>Music</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          {loading ? (
            <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 40 }} />
          ) : (
            <>
              {/* --- 1. PHOTOS VIEW --- */}
              {currentTab === 'photos' && (
                <View style={styles.contentSection}>
                  {photos.length === 0 ? (
                    <Text style={styles.emptyText}>No photos yet.</Text>
                  ) : (
                    photos.map(item => (
                      <View key={item.id} style={styles.photoCard}>
                        <Image source={{ uri: item.image_url }} style={styles.photoImage} />
                        {item.caption ? (
                          <View style={styles.photoCaptionBox}>
                            <Text style={styles.photoCaptionText}>{item.caption}</Text>
                          </View>
                        ) : null}
                      </View>
                    ))
                  )}
                </View>
              )}

              {/* --- 2. VOICES VIEW --- */}
              {currentTab === 'voices' && (
                <View style={styles.contentSection}>
                  {voices.length === 0 ? (
                    <Text style={styles.emptyText}>No voice messages yet.</Text>
                  ) : (
                    voices.map(item => {
                      const isPlaying = playingId === item.id;
                      return (
                        <View key={item.id} style={styles.audioCard}>
                          <View style={styles.audioInfo}>
                            <Ionicons name="mic-circle" size={40} color="#8B5CF6" />
                            <View style={{ marginLeft: 15 }}>
                              <Text style={styles.audioTitle}>Message from Family</Text>
                              <Text style={styles.audioDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
                            </View>
                          </View>
                          <TouchableOpacity 
                            style={[styles.playBigButton, isPlaying && { backgroundColor: '#EF4444' }]} 
                            onPress={() => playAudio(item.audio_url, item.id)}
                          >
                            <Ionicons name={isPlaying ? "stop" : "play"} size={28} color="#FFFFFF" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                            <Text style={styles.playBigButtonText}>{isPlaying ? "Stop" : "Listen"}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              )}

              {/* --- 3. MUSIC VIEW --- */}
              {currentTab === 'music' && (
                <View style={styles.contentSection}>
                  {music.length === 0 ? (
                    <Text style={styles.emptyText}>No music tracks yet.</Text>
                  ) : (
                    music.map(item => {
                      const isPlaying = playingId === item.id;
                      // Clean up tags for Mary's screen
                      const cleanTitle = item.caption.replace('[MUSIC-IMPORTANT]', '').replace('[MUSIC]', '').trim();
                      
                      return (
                        <View key={item.id} style={styles.audioCard}>
                          <View style={styles.audioInfo}>
                            <Ionicons name="musical-notes" size={40} color="#F59E0B" />
                            <View style={{ marginLeft: 15, flex: 1 }}>
                              <Text style={styles.audioTitle}>{cleanTitle}</Text>
                              <Text style={styles.audioDate}>Your Playlist</Text>
                            </View>
                          </View>
                          <TouchableOpacity 
                            style={[styles.playBigButton, { backgroundColor: isPlaying ? '#EF4444' : '#F59E0B' }]} 
                            onPress={() => playAudio(item.audio_url, item.id)}
                          >
                            <Ionicons name={isPlaying ? "stop" : "play"} size={28} color="#FFFFFF" style={{ marginLeft: isPlaying ? 0 : 4 }} />
                            <Text style={styles.playBigButtonText}>{isPlaying ? "Stop" : "Play"}</Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </>
          )}

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F4F6', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  appCapsule: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 35, overflow: 'hidden', marginHorizontal: 10, marginBottom: 10, marginTop: 10, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 5 },
  
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 25, paddingBottom: 15 },
  backButton: { padding: 10, backgroundColor: '#F3F4F6', borderRadius: 25 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#111827' },
  
  // TABS
  tabContainer: { flexDirection: 'row', paddingHorizontal: 15, marginBottom: 15, gap: 10 },
  tabButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, backgroundColor: '#F9FAFB', borderRadius: 20, borderWidth: 1, borderColor: '#E5E7EB' },
  activeTabButton: { backgroundColor: '#8B5CF6', borderColor: '#8B5CF6' },
  tabText: { fontSize: 16, fontWeight: '700', color: '#6B7280', marginLeft: 6 },
  activeTabText: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  contentSection: { marginTop: 10 },
  emptyText: { textAlign: 'center', fontSize: 18, color: '#9CA3AF', marginTop: 40, fontWeight: '600' },

  // PHOTOS
  photoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, overflow: 'hidden', marginBottom: 20, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  photoImage: { width: '100%', height: 300, resizeMode: 'cover' },
  photoCaptionBox: { padding: 20, backgroundColor: '#F9FAFB' },
  photoCaptionText: { fontSize: 18, color: '#1F2937', fontWeight: '600', lineHeight: 26 },

  // AUDIO & MUSIC
  audioCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  audioInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  audioTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  audioDate: { fontSize: 15, color: '#6B7280', marginTop: 4, fontWeight: '600' },
  playBigButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8B5CF6', paddingVertical: 16, borderRadius: 20 },
  playBigButtonText: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold', marginLeft: 8 },
});