import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { supabase } from '../../supabase';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 60) / 2;

export default function PatientGalleryScreen() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'photos' | 'voices' | 'music'>('photos');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Audio Playback State
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  // Fullscreen Photo Modal
  const [selectedImage, setSelectedImage] = useState<any>(null);

  useEffect(() => {
    fetchVaultItems();
    return () => {
      stopAndUnloadSound();
    };
  }, [activeTab]);

  const stopAndUnloadSound = async () => {
    if (sound) {
      try {
        const status = await sound.getStatusAsync();
        if (status.isLoaded) {
          await sound.stopAsync();
          await sound.unloadAsync();
        }
      } catch (err) {
        // Suppress already-unloaded errors
      }
      setSound(null);
      setPlayingId(null);
    }
  };

  const fetchVaultItems = async () => {
    setLoading(true);
    await stopAndUnloadSound();

    try {
      const { data, error } = await supabase
        .from('memory_vault')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        if (activeTab === 'photos') {
          setItems(data.filter(item => !!item.image_url));
        } else if (activeTab === 'voices') {
          setItems(data.filter(item => !!item.audio_url && !item.caption?.includes('[MUSIC')));
        } else if (activeTab === 'music') {
          setItems(data.filter(item => !!item.audio_url && item.caption?.includes('[MUSIC')));
        }
      }
    } catch (error: any) {
      console.error('Error fetching vault items:', error);
    } finally {
      setLoading(false);
    }
  };

  const playAudio = async (item: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // If tapping the currently playing item, stop it
    if (playingId === item.id) {
      await stopAndUnloadSound();
      return;
    }

    // Stop existing sound if running
    await stopAndUnloadSound();

    if (!item.audio_url) {
      Alert.alert("Audio Missing", "No audio URL found for this memory.");
      return;
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSoundInstance } = await Audio.Sound.createAsync(
        { uri: item.audio_url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setPlayingId(null);
          }
        }
      );

      setSound(newSoundInstance);
      setPlayingId(item.id);
    } catch (error: any) {
      console.error("Audio playback error:", error);
      Alert.alert("Playback Error", "Could not play this audio clip.");
      setPlayingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const cleanTitle = (caption: string) => {
    if (!caption) return "Message from Family";
    return caption.replace('[MUSIC-IMPORTANT]', '').replace('[MUSIC]', '').trim() || "Message from Family";
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton} 
          onPress={() => router.back()}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
        >
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Memories</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'photos' && styles.activeTabButton]}
          onPress={() => setActiveTab('photos')}
        >
          <Ionicons 
            name="images" 
            size={18} 
            color={activeTab === 'photos' ? '#FFFFFF' : '#6B7280'} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>Photos</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'voices' && styles.activeTabButton]}
          onPress={() => setActiveTab('voices')}
        >
          <Ionicons 
            name="mic" 
            size={18} 
            color={activeTab === 'voices' ? '#FFFFFF' : '#6B7280'} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[styles.tabText, activeTab === 'voices' && styles.activeTabText]}>Voices</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'music' && styles.activeTabButton]}
          onPress={() => setActiveTab('music')}
        >
          <Ionicons 
            name="musical-notes" 
            size={18} 
            color={activeTab === 'music' ? '#FFFFFF' : '#6B7280'} 
            style={{ marginRight: 6 }} 
          />
          <Text style={[styles.tabText, activeTab === 'music' && styles.activeTabText]}>Music</Text>
        </TouchableOpacity>
      </View>

      {/* Content Area */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>No memories found in this section yet.</Text>
        </View>
      ) : activeTab === 'photos' ? (
        <FlatList
          key="flatlist-photos" // <-- FIX: Force fresh render for 2 columns
          data={items}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.photoCard} 
              activeOpacity={0.8}
              onPress={() => setSelectedImage(item)}
            >
              <Image source={{ uri: item.image_url }} style={styles.photoThumb} />
              {item.caption ? (
                <Text style={styles.photoCaption} numberOfLines={2}>{item.caption}</Text>
              ) : null}
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          key={`flatlist-${activeTab}`} // <-- FIX: Force fresh render for 1 column
          data={items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isPlaying = playingId === item.id;
            return (
              <View style={styles.audioCard}>
                <View style={styles.audioHeader}>
                  <View style={[styles.audioIconWrap, activeTab === 'music' && { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons 
                      name={activeTab === 'music' ? 'musical-notes' : 'mic'} 
                      size={22} 
                      color="#8B5CF6" 
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.audioTitle}>{cleanTitle(item.caption)}</Text>
                    <Text style={styles.audioDate}>{formatDate(item.created_at)}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.audioPlayButton, isPlaying && styles.audioStopButton]}
                  onPress={() => playAudio(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons 
                    name={isPlaying ? "pause" : "play"} 
                    size={20} 
                    color="#FFFFFF" 
                    style={{ marginRight: 8 }} 
                  />
                  <Text style={styles.audioPlayButtonText}>
                    {isPlaying ? "Pause" : "Listen"}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          }}
        />
      )}

      {/* Expanded Photo Modal */}
      <Modal visible={!!selectedImage} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalCaption} numberOfLines={2}>
                {selectedImage?.caption || "A special memory"}
              </Text>
              <TouchableOpacity 
                onPress={() => setSelectedImage(null)}
                style={styles.closeBtn}
                hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
              >
                <Ionicons name="close" size={26} color="#111827" />
              </TouchableOpacity>
            </View>
            {selectedImage?.image_url && (
              <Image source={{ uri: selectedImage.image_url }} style={styles.fullImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
  },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingVertical: 15 
  },
  backButton: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#F3F4F6', 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#111827' },
  tabContainer: { 
    flexDirection: 'row', 
    paddingHorizontal: 20, 
    marginBottom: 20, 
    gap: 10 
  },
  tabButton: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 12, 
    borderRadius: 25, 
    backgroundColor: '#F3F4F6' 
  },
  activeTabButton: { backgroundColor: '#8B5CF6' },
  tabText: { fontSize: 15, fontWeight: '700', color: '#6B7280' },
  activeTabText: { color: '#FFFFFF' },
  centerContainer: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: 40 
  },
  emptyText: { 
    fontSize: 16, 
    color: '#9CA3AF', 
    textAlign: 'center', 
    marginTop: 12, 
    fontWeight: '600' 
  },
  listContent: { paddingHorizontal: 20, paddingBottom: 30 },
  photoCard: { 
    width: COLUMN_WIDTH, 
    backgroundColor: '#F9FAFB', 
    borderRadius: 20, 
    overflow: 'hidden', 
    marginRight: 15, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#E5E7EB' 
  },
  photoThumb: { width: '100%', height: 140 },
  photoCaption: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#374151', 
    padding: 10 
  },
  audioCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 20, 
    marginBottom: 15, 
    borderWidth: 1, 
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  audioHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  audioIconWrap: { 
    width: 44, 
    height: 44, 
    borderRadius: 22, 
    backgroundColor: '#F5F3FF', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 14 
  },
  audioTitle: { fontSize: 17, fontWeight: '700', color: '#111827', marginBottom: 3 },
  audioDate: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  audioPlayButton: { 
    backgroundColor: '#8B5CF6', 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, 
    borderRadius: 18 
  },
  audioStopButton: { backgroundColor: '#EF4444' },
  audioPlayButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: 'bold' },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.7)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  imageModalContainer: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 28, 
    padding: 20, 
    width: '100%', 
    maxHeight: '80%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15 
  },
  modalCaption: { flex: 1, fontSize: 16, fontWeight: '700', color: '#111827', paddingRight: 10 },
  closeBtn: { padding: 4 },
  fullImage: { width: '100%', height: 320, borderRadius: 16 }
});